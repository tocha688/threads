import { rid } from "./util";

type MessageListen = {
    callback?: Function;
    resolve?: (result: any) => void;
    reject?: (error: any) => void;
    once: boolean;
}

export type MessageOptions = {
    on: (callback: Function) => void;
    send: (data: any) => void;
}

type WorkerMessage = {
    id: string;
    type: "call" | "result" | "error" | "proxy" | string;
    data?: any;
    key?: string;
    error?: any;
}

const targetProxy = async (instance: Object, akey: string, data?: any) => {
    const attrs = akey.substring(1).split(".")
    const key = attrs.shift()
    const prop = attrs.join(".");
    if (key === "get") {
        return new Function("obj", `return obj.` + prop)(instance)
    } else if (key === "set") {
        return new Function("obj", "value", `obj.${prop}=value`)(instance, data)
    } else if (key === "call") {
        return await new Function("obj", "value", `return obj.${prop}(value)`)(instance, data)
    }
}

//主服务
export class MessageBox {
    private ons = new Map<string, MessageListen>();
    private fns = new Map<string, Function>();
    //代理对象
    private proxys = new Map<string, any>();
    private instances = new Map<string, any>();

    constructor(
        private option: MessageOptions
    ) {
        //监听消息
        this.option.on((data: any) => {
            if (data instanceof MessageEvent) {
                data = data.data;
            }
            this.listenCallback(data);
        });
    }

    //处理监听
    async listenCallback(data: WorkerMessage) {
        if (data && data.id) {
            const result = (result: any) => this.option.send({ id: data.id, type: "result", data: result, key: data.key });
            const error = (err: any) => this.option.send({ id: data.id, type: "error", data: null, error: err, key: data.key });
            if (["result", "error"].includes(data.type)) {
                const call = this.ons.get(data.id);
                if (!call) return console.warn(`Worker message not found: ${data.id}`);
                if (data.type === "result") {
                    if (call.resolve) {
                        call.resolve(data.data);
                        call.resolve = undefined;
                        if (!call.callback) {
                            this.ons.delete(data.id);
                        }
                    }
                    if (call.callback) {
                        call.callback(data.data);
                    }
                } else if (data.type === "error") {
                    this.ons.delete(data.id);
                    if (call.reject) {
                        call.reject(data.error);
                        call.reject = undefined;
                    } else {
                        throw new Error(`Worker error: ${data.error}`);
                    }
                }
            } else if (data.key && data.type === "call") {
                const callback = this.fns.get(data.key);
                if (!callback) {
                    return error(new Error(`Worker function not found: ${data.key}`));
                }
                //运行方法
                try {
                    result(await callback(data.data));
                } catch (e) {
                    error(e);
                }
            } else if (data.type === "proxy" && data.key) {
                //处理代理对象
                if (data.key[0] === "$") {
                    //调用对象
                    const instance = this.instances.get(data.id)
                    if (!instance) {
                        return error(new Error(`Worker instance not found: ${data.id}`));
                    }
                    try {
                        result(await targetProxy(instance, data.key, data.data));
                    } catch (e) {
                        error(e);
                    }
                } else if (data.key[0] === "#") {
                    //静态调用
                    const attrs = data.key.substring(1).split("$")
                    let target = attrs.shift()
                    const instance = this.proxys.get(target || "")
                    if (!instance) {
                        return error(new Error(`Worker static proxy not found: ${data.id}`));
                    }
                    const ekey = attrs.join(".")
                    try {
                        result(await targetProxy(instance, "$" + ekey, data.data));
                    } catch (e) {
                        error(e);
                    }
                } else {
                    //初始化对象
                    const cls = this.proxys.get(data.key);
                    console.log(this.proxys, data.key, cls, typeof cls);
                    if (!cls) {
                        return error(new Error(`Worker proxy not found: ${data.key}`));
                    }
                    try {
                        const instance = new cls(data.data);
                        this.instances.set(data.id, instance);
                        result({});
                    } catch (e) {
                        error(e);
                    }
                }

            }
        }
    }

    async send<T>(type: string, key: string, data?: any, callback?: (result: T) => void, id: string = rid()): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            const back = (result: T) => {
                if (callback) {
                    callback(result);
                }
                resolve(result);
            }
            this.ons.set(id, {
                resolve, reject,
                callback: back,
                once: !callback,
            });
            this.option.send({ id, type, data, key })
        })
    }

    async emit<T>(key: string, data: any, callback?: (result: T) => void): Promise<T> {
        return this.send<T>("call", key, data, callback);
    }

    on(key: string, call: Function) {
        this.fns.set(key, call)
    }

    remove(key: string) {
        this.fns.delete(key);
    }


    //添加代理对象
    //addProxy(TestClass)
    addProxy<T = Object>(target: T) {
        const name = (target as any).name;
        this.proxys.set(name, target);
        console.log("Add proxy:", name, target);
    }

    async newProxy(target: string | Object, data?: any) {
        const id = rid()
        const className = typeof target === "string" ? target : (target as any).name;
        await this.send<any>("proxy", className, data, undefined, id);
        return {
            get: async <T>(key: string): Promise<T> => await this.send<any>("proxy", "$get." + key, undefined, undefined, id),
            set: async <T>(key: string, data?: any): Promise<T> => await this.send<any>("proxy", "$set." + key, data, undefined, id),
            call: async <T>(key: string, data?: any): Promise<T> => await this.send<any>("proxy", "$call." + key, data, undefined, id),
            static: this.staticPorxy(className),
        }
    }

    staticPorxy(target: string | Object) {
        const className = typeof target === "string" ? target : (target as any).name;
        return {
            get: async <T>(key: string): Promise<T> => await this.send<any>("proxy", "#" + className + "$get." + key, undefined, undefined),
            set: async <T>(key: string, data?: any): Promise<T> => await this.send<any>("proxy", "#" + className + "$set." + key, data, undefined),
            call: async <T>(key: string, data?: any): Promise<T> => await this.send<any>("proxy", "#" + className + "$call." + key, data, undefined),
        }
    }


}


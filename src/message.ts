import { EventEmitter } from "events";
import { isNull, rid } from "./util";

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
    //变量id
    aid: string;
    type: "call" | "result" | "error" | "proxy" | "updateArgs" | string;
    data?: any;
    key?: string;
    error?: any;
    __type__?: string; //用于标识数据类型
    __build__?: string; //用于标识数据构建类型
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
                if (!call) return //console.warn(`Worker message not found: ${data.id}`);
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
                    const argData = this.dataDecode(data, data.data);
                    console.log("Worker call:", data.key, argData);
                    result(await callback(argData));
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

            } else if (data.type == "updateArgs" && data.aid) {
                const event = this.args.get(data.aid);
                if (event) {
                    switch (data.__type__) {
                        case "update":
                            event.emit("update", this.dataDecode(data, data.data));
                            break;
                        case "close":
                            event.emit("close", data.data, data.aid);
                            break;
                    }
                    result(true)
                }
            }
        }
    }

    private args = new Map<string, EventEmitter>();


    private dataLinsen(aid: string, update: (val: any) => any) {
        const event = new EventEmitter();
        event.addListener("close", (value: any, aid: string) => {
            if (this.args.has(aid)) {
                this.args.delete(aid);
                update(value)
            }
            event.removeAllListeners();
        });
        event.addListener("update", update);
        this.args.set(aid, event);
    }

    //编码data数据
    private dataEncode(data: any, id: string) {
        if (data instanceof AbortController) {
            const msg = { __build__: "AbortController", aid: rid(), id };
            const controller = data as AbortController;
            this.dataLinsen(msg.aid, (val: boolean) => val === true && controller.abort());
            (!controller.signal.aborted) && controller.signal.addEventListener("abort", async () => {
                this.args.delete(msg.aid);
                await this.option.send({ type: "updateArgs", __type__: "close", ...msg, data: controller.signal.aborted });
            });
            data = { ...msg, data: data.signal.aborted };
        } else if (data instanceof Array) {
            data = data.map(item => this.dataEncode(item, id));
        } else if (data instanceof Object) {
            for (const key in data) {
                if (data.hasOwnProperty(key)) {
                    data[key] = this.dataEncode(data[key], id);
                }
            }
        }
        return data;
    }

    private dataDecode(req: WorkerMessage, args?: any): any {
        if (args && args.__build__ === "AbortController") {
            const controller = new AbortController();
            if (args.data === false) {
                this.dataLinsen(args.aid, (val: boolean) => val === true && controller.abort());
                controller.signal.addEventListener("abort", () => {
                    this.args.delete(args.aid);
                    this.option.send({ ...args, type: "updateArgs", __type__: "close", data: controller.signal.aborted, });
                });
            } else {
                controller.abort();
            }
            return controller;
        } else if (args instanceof Array) {
            return args.map(item => this.dataDecode(req, item));
        } else if (args instanceof Object) {
            for (const key in args) {
                if (args.hasOwnProperty(key)) {
                    args[key] = this.dataDecode(req, args[key]);
                }
            }
        }
        return args;
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
            if (data) {
                data = this.dataEncode(data, id);
            }
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


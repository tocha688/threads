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
    type: "call" | "result" | "error" | string;
    data?: any;
    key?: string;
    error?: any;
}

//主服务
export class MessageBox {
    private ons = new Map<string, MessageListen>();
    private fns = new Map<string, Function>();

    constructor(
        private option: MessageOptions
    ) {
        //监听消息
        this.option.on((data:any) => {
            if(data instanceof MessageEvent){
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
                if(!call) return console.warn(`Worker message not found: ${data.id}`);
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
            }
        }
    }

    async send<T>(type: string, key: string, data: any, callback?: (result: T) => void): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            const id = rid();
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

}


import { MessageEcoderPlugin } from "./plugs";
import { isNull, rid } from "./tools";
import type { MessageListen, MessageOptions, MessageInfo, MessagePlugin, MessageEventName } from "./types";

export class MessageBase {
    private ons = new Map<string, MessageListen>();
    private fns = new Map<string, Function>();
    protected plugins = new Map<string, MessagePlugin>();

    constructor(
        public option: MessageOptions
    ) {
        this.init()
    }

    private init() {
        //监听消息
        this.option.on((data: any) => {
            if (data instanceof MessageEvent) {
                data = data.data;
            }
            this.listenCallback(data);
        });
        this.on("$message:base:listen:remove", ({ key }) => {
            this.ons.delete(key);
        })
        //安装编码插件
        this.addPlugin(new MessageEcoderPlugin(this));
    }

    public addPlugin(plugin: MessagePlugin) {
        // if (typeof plugin === "function") {
        //     //@ts-ignore
        //     const pg = new plugin(this)
        //     this.plugins.set(pg.name, pg);
        // }
        this.plugins.set(plugin.name, plugin);
    }
    public removePlugin(name: string) {
        this.plugins.delete(name);
    }

    private async emitPlugin(eventName: MessageEventName, data?: MessageInfo): Promise<MessageInfo> {
        for (const [name, plugin] of this.plugins) {
            if (plugin[eventName]) {
                try {
                    data = await plugin[eventName](data as any);
                } catch (e) {
                    console.error(`Plugin ${name} error on ${eventName}:`, e);
                }
            }
        }
        return data as any;
    }

    private async listenCallback(data: MessageInfo) {
        if (!(data && data.id && data.key)) return;
        //处理数据
        data.data = JSON.parse(data.data || "null");
        const result = (result: any) => this.callback(data, result);
        const error = (err: any) => this.callback(data, null, err);
        data = await this.emitPlugin("onMessage", data);
        const body = data.data;
        //是不是函数调用
        if (data.result) {
            const call = this.ons.get(data.id);
            if (!call) return //console.warn(`Worker message not found: ${data.id}`);
            //处理错误
            if (!isNull(data.error)) {
                this.ons.delete(data.id);
                if (call.reject) {
                    call.reject(data.error);
                    call.reject = undefined;
                } else {
                    throw new Error(`Worker error: ${data.error}`);
                }
                return
            }
            //处理正常结果
            if (call.resolve) {
                call.resolve(body);
                call.resolve = undefined;
                if (!call.callback) {
                    this.ons.delete(data.id);
                }
            }
            if (call.callback) {
                call.callback(body);
            }
            return;
        }
        const fn = this.fns.get(data.key);
        if (!fn) {
            // if (data.key.startsWith("$")) return result(null);
            return error(new Error(`Worker function not found: ${data.key}`));
        }
        try {
            result(await fn(body, data));
        } catch (e) {
            error(e);
        }
    }

    protected async callback<T>(msg: MessageInfo, result: any, error?: any): Promise<T> {
        return await this.send<T>(msg.key, result, undefined, msg.id, { result: true, error });
    }

    protected async send<T>(key: string, data?: any, callback?: (result: T) => void, id: string = rid(), other: Record<string, any> = {}): Promise<T> {
        return new Promise<T>(async (resolve, reject) => {
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
            let body: MessageInfo = { id, data: data, key, ...other }
            body = await this.emitPlugin("onSend", body);
            body.data = JSON.stringify(body.data);
            this.option.send(body)
        })
    }

    on(key: string, callback: (data: any, msg: MessageInfo) => void) {
        this.fns.set(key, callback)
    }

    hasOn(key: string) {
        return this.fns.has(key);
    }

    remove(key: string) {
        this.fns.delete(key);
    }

    removeAll(key: string) {
        if (!this.hasOn(key)) return;
        this.remove(key);
        this.send("$message:base:listen:remove", { key });
    }

    async emit<T>(key: string, data?: any, callback?: (result: T) => void, id: string = rid()): Promise<T> {
        return this.send<T>(key, data, callback, id);
    }

}


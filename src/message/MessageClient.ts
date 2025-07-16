import { MessageBase } from "./MessageBase";
import { MessageShared } from "./MessageShared";
import { MessageEcoderPlugin } from "./plugs";
import { objectEval } from "./tools";
import type { MessageClass, MessageOptions } from "./types";

export class MessageClient extends MessageShared {
    constructor(option: MessageOptions) {
        super(option);
        //添加
        this.initClass();
    }

    //---------代理类----------
    private clsNews = new Map<string, any>();//存储类实例
    private class = new Map<string, any>();//存储类
    private initClass() {
        this.on("$class:new", async (body: MessageClass, msg) => {
            if (!body.className) throw new Error("Class name is required");
            const target = this.class.get(body.className);
            if (!target) throw new Error(`Class ${body.className} not found`);
            const instance = new target(body.data);
            this.clsNews.set(msg.id, instance);
        })
        this.on("$class:get", async (body: MessageClass, msg) => {
            if (!body.id) throw new Error(`Class instance id is required`);
            const target = this.clsNews.get(body.id);
            if (!target) throw new Error(`The ${body.className} instance does not exist. ` + body.id);
            return await objectEval(target, "get", body.key)
        })
        this.on("$class:set", async (body: MessageClass, msg) => {
            if (!body.id) throw new Error(`Class instance id is required`);
            const target = this.clsNews.get(body.id);
            if (!target) throw new Error(`The ${body.className} instance does not exist. ` + body.id);
            return await objectEval(target, "set", body.key, body.data)
        })
        this.on("$class:call", async (body: MessageClass, msg) => {
            if (!body.id) throw new Error(`Class instance id is required`);
            const target = this.clsNews.get(body.id);
            if (!target) throw new Error(`The ${body.className} instance does not exist. ` + body.id);
            return await objectEval(target, "call", body.key, body.data)
        })
        //-------静态调用-------
        this.on("$class:static:get", async (body: MessageClass, msg) => {
            if (!body.className) throw new Error("Class name is required");
            const target = this.class.get(body.className);
            if (!target) throw new Error(`Class ${body.className} not found`);
            return await objectEval(target, "get", body.key)
        })
        this.on("$class:static:set", async (body: MessageClass, msg) => {
            if (!body.className) throw new Error("Class name is required");
            const target = this.class.get(body.className);
            if (!target) throw new Error(`Class ${body.className} not found`);
            return await objectEval(target, "set", body.key, body.data)
        })
        this.on("$class:static:call", async (body: MessageClass, msg) => {
            if (!body.className) throw new Error("Class name is required");
            const target = this.class.get(body.className);
            if (!target) throw new Error(`Class ${body.className} not found`);
            return await objectEval(target, "call", body.key, body.data)
        })
    }

    /**
     * 添加代理类
     * @param target 未初始化的类
     */
    addClass<T = Object>(target: T) {
        const name = (target as any).name;
        this.class.set(name, target);
    }


}


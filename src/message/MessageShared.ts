import { MessageBase } from "./MessageBase";
import { objectEval } from "./tools";
import type { MessageOptions, MessageVarInfo } from "./types";


//共享对象类型
export class MessageShared extends MessageBase {
    private shareds = new Map<string, any>();

    constructor(option: MessageOptions) {
        super(option);
        this.on("$shared:type", async (body: MessageVarInfo, msg) => {
            const value = this.checkVar(body);
            return typeof value;
        });

        this.on("$shared:get", async (body: MessageVarInfo, msg) => {
            const target = this.checkVar(body);
            if (!body.attr) return target
            return await objectEval(target, "get", body.attr);
        });
        this.on("$shared:set", async (body: MessageVarInfo, msg) => {
            const target = this.checkVar(body);
            if (!body.attr) {
                this.shareds.set(body.key, body.data);
                return;
            }
            return await objectEval(target, "set", body.attr);
        });
        this.on("$shared:call", async (body: MessageVarInfo, msg) => {
            const target = this.checkVar(body);
            if (!body.attr) return target(body.data)
            return await objectEval(target, "get", body.attr, body.data);
        });
        this.on("$shared:remove", async (body: MessageVarInfo, msg) => {
            const target = this.shareds.get(body.key);
            if (!target) return;
            if (!body.attr) {
                this.shareds.delete(body.key);
                return;
            }
            return await objectEval(target, "delete", body.attr);
        });

    }

    private checkVar(body: any) {
        const target = this.shareds.get(body.key);
        if (!target) throw new Error(`Variable ${body.key} not found`);
        return target;
    }

    addShared(key: string, target: any) {
        this.shareds.set(key, target);
    }

    delShared(key: string): void {
        this.shareds.delete(key);
    }

    loadShared(key: string) {
        return {
            value: async () => this.send("$shared:get", { key }, undefined),
            del: async (attr?: string) => this.send("$shared:remove", { key, attr }, undefined),
            set: async (data: any, attr?: string) => this.send("$shared:set", { key, data, attr }, undefined),
            call: async (data: any, attr?: string) => this.send("$shared:call", { key, data, attr }, undefined),
            get: async (attr: string) => this.send("$shared:get", { key, attr }, undefined),
        }
    }
}


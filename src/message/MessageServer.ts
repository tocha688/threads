import { MessageShared } from "./MessageShared";
import { rid } from "./tools";
import type { MessageOptions } from "./types";

export class MessageServer extends MessageShared {
    constructor(option: MessageOptions) {
        super(option);
    }

    /**
     * [发送] 初始化类
     * @param target 对象或类名
     * @param data 
     * @returns 
     */
    async newClass(target: string | Object, data: any[] = []) {
        const id = rid()
        const className = typeof target === "string" ? target : (target as any).name;
        await this.send<any>("$class:new", { className, data }, undefined, id);
        return {
            get: async <T>(key: string): Promise<T> => await this.send<any>("$class:get", { key, className, id }, undefined),
            set: async <T>(key: string, data?: any): Promise<T> => await this.send<any>("$class:set", { key, id, className, data }, undefined),
            call: async <T>(key: string, ...data: any[]): Promise<T> => await this.send<any>("$class:call", { key, id, className, data }, undefined),
            static: this.staticClass(className),
        }
    }

    /**
     * [发送] 获取类静态方法
     * @param target 对象或类名
     * @returns 
     */
    staticClass(target: string | Object) {
        const className = typeof target === "string" ? target : (target as any).name;
        return {
            get: async <T>(key: string): Promise<T> => await this.send<any>("$class:static:get", { key, className }, undefined),
            set: async <T>(key: string, data?: any): Promise<T> => await this.send<any>("$class:static:set", { key, className, data }, undefined),
            call: async <T>(key: string, ...data: any[]): Promise<T> => await this.send<any>("$class:static:call", { key, className, data }, undefined),
        }
    }

}
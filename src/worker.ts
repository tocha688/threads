import { MessageClient, type MessageInfo } from "universal-message";
import { parentPort, isMainThread } from "worker_threads";


export class worker {
    static mbox = new MessageClient({
        send: (data: any) => parentPort?.postMessage(data),
        on: (fn: Function) => parentPort?.addListener("message", (data) => fn(data))
    })

    private static isInit = false;
    private static init() {
        if (isMainThread || !parentPort) throw new Error("workerExport must be used in worker thread");
        if (this.isInit) return;
        this.isInit = true;
        //初始化
    }

    static async on(key: string, fn: (data: any, msg: MessageInfo) => void) {
        this.init();
        this.mbox.on(key, fn);
    }

    static addClass(...cls: Array<Object>) {
        cls.forEach(ls => this.mbox.addClass(ls))
    }

    static loadShared(key: string) {
        return this.mbox.loadShared(key);
    }

    static export(key:string,fn:(...args:any[])=>any) {
        this.init();
        this.mbox.on(key, (data:any[], msg: MessageInfo) => {
            return fn(...data)
        });
    }

}

import { MessageClient, type MessageInfo } from "universal-message";
import { parentPort, isMainThread } from "worker_threads";


export class worker {
    static mbox = new MessageClient({
        send: (data: any) => parentPort?.postMessage(data),
        on: (fn: Function) => parentPort?.addListener("message", (data) => fn(data))
    })

    private static isInit = false;
    private static init() {
        if (this.isInit) return;
        this.isInit = true;
        //初始化
    }

    static async on(key: string, fn: (data: any, msg: MessageInfo) => void) {
        if (isMainThread || !parentPort) throw new Error("workerExport must be used in worker thread");
        this.init();
        this.mbox.on(key, fn);
    }

    static async addClass<T = Object>(cls: T) {
        this.mbox.addClass(cls);
    }

    static loadShared(key: string) {
        return this.mbox.loadShared(key);
    }

}

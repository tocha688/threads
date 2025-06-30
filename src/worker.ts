import { MessageBox } from "./message";
import { parentPort, isMainThread } from "worker_threads";


export class worker {
    static mbox = new MessageBox({
        send: (data: any) => parentPort?.postMessage(data),
        on: (fn: Function) => parentPort?.addListener("message", (data) => fn(data))
    })
    private static isInit = false;
    private static init() {
        if (this.isInit) return;
        this.isInit = true;
        //初始化
    }

    static async on(key: string, fn: Function) {
        if (isMainThread || !parentPort) throw new Error("workerExport must be used in worker thread");
        this.init();
        this.mbox.on(key, fn);
    }
    //代理对象
    static async proxy<T = Object>(cls: T) {
        this.mbox.addProxy(cls);
    }

}

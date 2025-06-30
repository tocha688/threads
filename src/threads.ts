import { MessageBox } from "./message";
import { pLimit } from "./pLimit";
import type { ThreadsOptions, WorkerInfo } from "./type";
import os from "os";
import { isMainThread, Worker } from "worker_threads";

export class Threads {
    workers: WorkerInfo[] = [];
    index = 0;
    limit: pLimit;

    constructor(
        private option: ThreadsOptions
    ) {
        if (!isMainThread) throw new Error("threads must be used in main thread");
        this.initWorker();
        this.limit = pLimit(this.concurrency);
    }

    get workerSize() {
        return this.option.workerSize || os.availableParallelism();
    }

    get concurrency() {
        return this.option.concurrency || this.workerSize;
    }

    private initWorker() {
        for (let i = 0; i < this.workerSize; i++) {
            const worker = new Worker(this.option.workerPath, this.option.workerOptions);
            const mbox = new MessageBox({
                send: (data: any) => worker.postMessage(data),
                on: (callback: Function) => worker.addListener("message", (data) => callback(data))
            })
            this.workers.push({ worker, mbox });
        }
    }

    private nextWorker() {
        if (this.workers.length === 0) throw new Error("No workers available");
        if (this.index >= this.workers.length) {
            this.index = 0;
        }
        const winfo = this.workers[this.index++];
        if (!winfo) throw new Error("Worker not found");
        return winfo;
    }

    async call<T = any>(key: string, data?: any): Promise<T> {
        const winfo = this.nextWorker();
        return this.limit(() => winfo.mbox.emit<T>(key, data))
    }

    async newProxy(className: string | Object, data?: any) {
        const winfo = this.nextWorker();
        const key = typeof className === "string" ? className : (className as any).name;
        return await winfo.mbox.newProxy(key, data);
    }

    staticPorxy(target: string | Object) {
        const winfo = this.nextWorker();
        return winfo.mbox.staticPorxy(target);
    }

}


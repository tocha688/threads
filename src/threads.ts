import { MessageServer } from "universal-message";
import { pLimit } from "./pLimit";
import type { ThreadsOptions, WorkerInfo } from "./type";
import os from "os";
import path from "path";
import { isMainThread, Worker } from "worker_threads";

export class Threads {
    workers: WorkerInfo[] = [];
    index = 0;
    limit: pLimit;

    constructor(
        private option: ThreadsOptions
    ) {
        if (!isMainThread) throw new Error("threads must be used in main thread");
        const ext = path.extname(option.workerPath)
        if (["js", "mjs", "cjs", "ts", "mts"].includes(ext)) {
            option.workerPath += ".js";
        }
        option.workerPath = path.resolve(option.workerPath);
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
            const mbox = new MessageServer({
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

    async newClass(className: string | Object, data?: any) {
        const winfo = this.nextWorker();
        const key = typeof className === "string" ? className : (className as any).name;
        return await winfo.mbox.newClass(key, data);
    }

    staticClass(target: string | Object) {
        const winfo = this.nextWorker();
        return winfo.mbox.staticClass(target);
    }

    addShared(key: string, target: any) {
        this.workers.forEach(winfo => {
            winfo.mbox.addShared(key, target);
        })
    }

    delShared(key: string) {
        this.workers.forEach(winfo => {
            winfo.mbox.delShared(key);
        })
    }

    close() {
        this.workers.forEach(winfo => {
            winfo.worker.terminate();
        });
        this.workers = [];
        this.index = 0;
    }

    addClass(...cls: Array<Object>) {
        this.workers.forEach(winfo => {
            cls.forEach(ls => winfo.mbox.addClass(ls))
        })
    }

}


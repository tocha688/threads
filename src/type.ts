import type { MessageServer } from "universal-message";
import type { Worker, WorkerOptions } from "worker_threads";

export type ThreadsOptions = {
    /**
     * The path to the worker script.
     */
    workerPath: string;

    /**
     * The number of threads to create.
     */
    workerSize?: number;

    /**
     * 并发数
     */
    concurrency?: number;

    /**
     * worker参数
     */
    workerOptions?: WorkerOptions;
}

export type WorkerInfo = {
    worker: Worker;
    mbox: MessageServer;
}
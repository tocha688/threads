import { isMainThread } from "worker_threads";
import { worker, Threads } from "../dist/index.mjs";
import { fileURLToPath } from 'url';

if (isMainThread) {
    console.log(import.meta.url)
    const pool = new Threads({
        workerPath: fileURLToPath(import.meta.url),
        workerSize: 4,
        concurrency: 4,
    })
    pool.call("test", { a: 1, b: 2 }).then(res => {
        console.log("Result from worker:", res);
    }).catch(err => {
        console.error("Error from worker:", err);
    });
} else {
    worker.on("test", (data) => {
        console.log("Received data in worker:", data);
        return { result: data.a + data.b };
    });
}

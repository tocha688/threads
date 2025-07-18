
import { isMainThread } from "bun";
import { worker, Threads } from "../src";

if (isMainThread) {
    const pool = new Threads({
        workerPath: __filename,
        workerSize: 4,
        concurrency: 4,
    })
    const abr = new AbortController()
    console.log("abr:", await pool.call("abr", abr));
    console.log("abr signal:", abr.signal.aborted);
    setTimeout(() => {
        abr.abort();
    }, 2000);
} else {
    worker.export("abr", (data: AbortController) => {
        console.log("worker abr", data.signal.aborted);
        data.signal.addEventListener("abort", () => {
            console.log("Abort signal received in worker", data.signal.aborted);
        });
        // 也可以在方法中使用，内置的插件会将结果同步到主线程中去
        // data.abort()
        return data.signal.aborted
    });
}

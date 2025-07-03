
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
    worker.on("abr", (data: AbortController) => {
        console.log(data);
        data.signal.addEventListener("abort", () => {
            console.log("Abort signal received in worker", data.signal.aborted);
        });
    });
}

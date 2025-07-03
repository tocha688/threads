
import { isMainThread } from "bun";
import { worker, Threads } from "../src";

if (isMainThread) {
    const pool = new Threads({
        workerPath: __filename,
        workerSize: 4,
        concurrency: 4,
    })
    const abr = new AbortController()
    abr.signal.addEventListener("abort", () => {
        console.log("Abort signal received in main thread", abr.signal.aborted);
    });
    console.log("abr result:", await pool.call("abr", { abr }));
    console.log("abr signal:", abr.signal.aborted);
} else {
    worker.on("abr", (data: { abr: AbortController }) => {
        console.log(data);
        data.abr.signal.addEventListener("abort", () => {
            console.log("Abort signal received in worker", data.abr.signal.aborted);
        });
        setTimeout(() => {
            data.abr.abort();
        }, 1000)
        return data.abr.signal.aborted;
    });
}

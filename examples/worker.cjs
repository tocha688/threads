const { isMainThread } = require("worker_threads")
const { worker, Threads } = require("../dist/index.js")

if (isMainThread) {
    const pool = new Threads({
        workerPath: __filename,
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

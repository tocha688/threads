
import { isMainThread } from "bun";
import { worker, Threads } from "../src";


class TestClass {
    constructor(
        public name: any
    ) {
        console.log("初始化数据")
    }
    add(data: any) {
        console.log("add", data);
        return data + 1;
    }
    sync() {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve("sync data");
            }, 1000);
        });
    }
    static fack = "you baba"
}

if (isMainThread) {
    const pool = new Threads({
        workerPath: __filename,
        workerSize: 1,
        concurrency: 4,
    })
    const t = new TestClass("test");
    console.log(t)
    pool.addShared("test_obj", t)
    await pool.call("test", { a: 1, b: 2 }).then((data) => {
        console.log("Received data:", data);
    });
    pool.close()
} else {
    worker.export("test", async (data: any) => {
        console.log("Received data in worker:", data);
        console.log(await worker.loadShared("test_obj").get("name"))
        console.log(await worker.loadShared("test_obj").call("add", 9))
        return { result: data.a + data.b };
    });
}

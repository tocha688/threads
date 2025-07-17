
import { isMainThread } from "bun";
import { worker, Threads } from "../src";
// import 'reflect-metadata';

class TestClass {
    name = "TestClass1111";
    constructor(private data: any) {
        console.log("初始化数据", data)
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
        workerSize: 4,
        concurrency: 4,
    })
    const test = new TestClass("111")
    pool.addClass(TestClass)
    pool.call("test", test).then(res => {
        console.log("Result from worker:", res);
    }).catch(err => {
        console.error("Error from worker:", err);
    });

} else {
    worker.on("test", (data: TestClass) => {
        console.log("add", data.add(1))
        console.log("Received data in worker:", data);
    });
    worker.addClass(TestClass)
}

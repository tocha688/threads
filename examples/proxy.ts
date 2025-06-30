
import { isMainThread } from "bun";
import { worker, Threads } from "../src";


class TestClass {
    name = "TestClass1111";
    constructor(private data: any) {
        console.log("初始化数据", data)
    }
    add(data: any) {
        console.log("add", data);
        return data + 1;
    }
    sync(){
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve("sync data");
            }, 1000);
        });
    }
}

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
    const test = await pool.newProxy(TestClass, { a: 111 })
    console.log("Name:", await test.get("name"));
    console.log("add:", await test.call("add", 11));
    console.log("sync:", await test.call("sync", 11));
} else {
    worker.on("test", (data: any) => {
        console.log("Received data in worker:", data);
        return { result: data.a + data.b };
    });
    worker.proxy(TestClass)
}

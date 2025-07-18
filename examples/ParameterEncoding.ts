
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
//将类添加到 worker 中进行解析。
//添加后的类都将自动转换
function initClass(target: any) {
    target.addClass(TestClass)
}

if (isMainThread) {
    const pool = new Threads({
        workerPath: __filename,
        workerSize: 4,
        concurrency: 4,
    })
    //要自动编码必须要添加原始类
    pool.addClass(TestClass)
    //传递类
    const test = new TestClass("111")
    pool.call("test", test).then(res => {
        console.log("Result from worker:", res);
    }).catch(err => {
        console.error("Error from worker:", err);
    });
} else {
    worker.export("test", (data: TestClass) => {
        console.log("add", data.add(1))
        console.log("Received data in worker:", data);
    });
    //要自动解码也必须添加原始类
    worker.addClass(TestClass)
}

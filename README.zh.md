# Threads

一个用于 Node.js 的线程处理包，支持代理对象实例化。

## 特性

- 支持 ES 模块和 CommonJS
- TypeScript 支持
- Bun和node兼容
- 支持代理对象
- 支持传递AbortController


## 安装

```bash
npm install @tocha688/threads
# 或
yarn add @tocha688/threads
# 或
pnpm add @tocha688/threads
```

## 使用

### ES 模块 (ESM)

```javascript
import { ... } from '@tocha688/threads';
```

### CommonJS (CJS)

```javascript
const { ... } = require('@tocha688/threads');
```

### 简单使用

```javascript
import { isMainThread } from "bun";
import { worker, Threads } from "../src";

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
    worker.on("test", (data: any) => {
        console.log("Received data in worker:", data);
        return { result: data.a + data.b };
    });
}
```
### 代理对象

```javascript

import { isMainThread } from "bun";
import { worker, Threads } from "../src";


class TestClass {
    name = "TestClass1111";
    constructor(private data: any) {
        console.log("init data", data)
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
    pool.call("test", { a: 1, b: 2 }).then(res => {
        console.log("Result from worker:", res);
    }).catch(err => {
        console.error("Error from worker:", err);
    });
    //实例化对象
    const test = await pool.newProxy(TestClass, { a: 111 })
    //获取静态对象
    const testStatic = await pool.staticPorxy(TestClass);
    //获取对象上面的值，支持 a.b.c
    console.log("Name:", await test.get("name"));
    console.log("add:", await test.call("add", 11));
    console.log("sync:", await test.call("sync", 11));
    console.log("static fack:", await testStatic.get("fack"));
} else {
    //worker中
    worker.on("test", (data: any) => {
        console.log("Received data in worker:", data);
        return { result: data.a + data.b };
    });
    worker.proxy(TestClass)
}
```



## 许可证

MIT

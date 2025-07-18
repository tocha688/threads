# Threads

**中文 | [English](README.md)**

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
    worker.export("test", (data: any) => {
        console.log("Received data in worker:", data);
        return { result: data.a + data.b };
    });
}
```

### 高级教程
[AbortController](https://github.com/tocha688/threads/blob/main/examples/AbortController.ts)
[参数自动编码解码](https://github.com/tocha688/threads/blob/main/examples/ParameterEncoding.ts)
[代理对象](https://github.com/tocha688/threads/blob/main/examples/ProxyClass.ts)
[共享变量](https://github.com/tocha688/threads/blob/main/examples/shared.ts)


## 许可证

MIT

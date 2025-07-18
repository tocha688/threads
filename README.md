# Threads

**[中文](README.zh.md) | English**

A thread management package for Node.js that supports proxy object instantiation.

## Features

- Supports ES modules and CommonJS
- TypeScript support
- Compatible with Bun and Node.js
- Supports proxy objects
- Supports passing AbortController

## Installation

```bash
npm install @tocha688/threads
# or
yarn add @tocha688/threads
# or
pnpm add @tocha688/threads
```

## Usage

### ES Modules (ESM)

```javascript
import { ... } from '@tocha688/threads';
```

### CommonJS (CJS)

```javascript
const { ... } = require('@tocha688/threads');
```

### Simple Usage

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

### Advanced Tutorials
- [AbortController](https://github.com/tocha688/threads/blob/main/examples/AbortController.ts)
- [Parameter Auto Encoding/Decoding](https://github.com/tocha688/threads/blob/main/examples/ParameterEncoding.ts)
- [Proxy Objects](https://github.com/tocha688/threads/blob/main/examples/ProxyClass.ts)
- [Shared Variables](https://github.com/tocha688/threads/blob/main/examples/shared.ts)

## License

MIT

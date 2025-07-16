import type { MessageEcoder, MessageInfo } from "../types";

//处理参数
export const MessageEcoders: Array<MessageEcoder<any>> = [
    {
        target: (t) => t instanceof AbortController,
        key: "AbortController",
        encode: (data: MessageInfo, tool) => {
            data.data
            if (!data.signal.aborted) {
                data.signal.addEventListener("abort", async () => {
                    tool.sendUpdate(data.signal.aborted)
                    tool.remove()
                })
            }
            return data.signal.aborted;
        },
        decode: (body, tool) => {
            const data = new AbortController();
            if (!!body.data) {
                data.abort();
            } else {
                data.signal.addEventListener("abort", async () => {
                    // console.log("decode Abort signal received", data.signal.aborted);
                    tool.sendUpdate(data.signal.aborted)
                    tool.remove();
                })
            }
            return data;
        },
        update: (newValue, target: AbortController, tool) => {
            // console.log("AbortController update", newValue, target.signal.aborted);
            if (newValue) {
                //先移除监听，在更新防止重复触发
                tool.remove();
                target.abort();
            }
        }
    }
]

import type { MessageBase } from "../MessageBase";
import { MessageEcoders } from "./MessageEcoders";
import { isNull, rid } from "../tools";
import type { MessageInfo, MessagePlugin, MessageTools } from "../types";

export class MessageEcoderPlugin implements MessagePlugin {
    name = "MessageEcoderPlugin";
    constructor(public client: MessageBase) {

    }

    async onSend(body: MessageInfo) {
        if (isNull(body?.data)) return body;
        //参数编码
        body.data = this.dataEncode(body.data, body);
        return body;
    }

    async onMessage(body: MessageInfo) {
        //参数解码
        body.data = this.dataDecode(body.data, body);
        return body;
    }

    private dataEncode(data: any, body: MessageInfo): any {
        for (const ecoder of MessageEcoders) {
            if (ecoder.target(data)) {
                const target = data;
                const id = "$args:" + ecoder.key + ":" + rid();
                const tool: MessageTools = {
                    sendUpdate: (value: any) => {
                        if (!this.client.hasOn(id)) return;
                        this.client.emit(id, value)
                    },
                    remove: () => this.client.removeAll(id)
                }
                this.client.on(id, (value) => {
                    // console.log("收到更新server", value);
                    ecoder.update(value, target, tool)
                });
                return {
                    id,
                    key: ecoder.key,
                    data: ecoder.encode(data, tool),
                }
            }
        }
        if (data instanceof Array) {
            data = data.map(item => this.dataEncode(item, body));
        } else if (data instanceof Object) {
            for (const key in data) {
                if (data.hasOwnProperty(key)) {
                    data[key] = this.dataEncode(data[key], body);
                }
            }
        }
        return data;
    }

    private dataDecode(data: any, body: MessageInfo): any {
        if (isNull(data)) return data;
        for (const ecoder of MessageEcoders) {
            if (ecoder.key === data.key) {
                const id = data.id;
                const tool: MessageTools = {
                    sendUpdate: (value: any) => {
                        if (!this.client.hasOn(id)) return;
                        this.client.emit(id, value)
                    },
                    remove: () => this.client.removeAll(id)
                }
                const target = ecoder.decode(data, tool);
                this.client.on(id, (value) => {
                    // console.log("收到更新client", value);
                    ecoder.update(value, target, tool)
                });
                return target
            }
        }
        if (data instanceof Array) {
            data = data.map(item => this.dataDecode(item, body));
        } else if (data instanceof Object) {
            for (const key in data) {
                if (data.hasOwnProperty(key)) {
                    data[key] = this.dataDecode(data[key], body);
                }
            }
        }
        return data;
    }

}


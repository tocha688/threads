import type { MessageBase } from "./MessageBase";


export type MessageListen = {
    callback?: Function;
    resolve?: (result: any) => void;
    reject?: (error: any) => void;
    once: boolean;
}

export type MessageOptions = {
    on: (callback: Function) => void;
    send: (data: any) => void;
    // plugins?: MessagePlugin[]
}

export type MessageInfo = {
    id: string;
    key: string;
    data?: string | any;
    error?: any;
    [key: string]: any;
}

//监听参数
export type MessageListenArgs = {
    //原始类型
    key: string;
    //初始数据
    data?: any;
}
export type MessageTools = {
    sendUpdate: (data: any) => void;
    // onUpdate: (callback: (data: any) => void) => void;
    remove: () => void;
}

export type MessageEcoder<T extends Object | any> = {
    target: (data:T) => boolean;
    key: string;
    encode: (data: T, tool: MessageTools) => any
    decode: (data: MessageListenArgs, tool: MessageTools) => T;
    update: (newValue: any, target: T, tool: MessageTools) => any;
}

export type MessageEcoderInfo = {
    id: string;
    key: string;
    data?: any;
}

export type MessageClass = {
    key: string;
    data?: Array<any> | any;
    id?: string;
    className?: string;
}

// var监听类型
export type MessageVarInfo = {
    key: string;
    attr?: string;
    data?: Array<any> | any;
}


// export interface MessagePlugin {
//     name: string;
//     client: MessageBase;
//     onMessage?: (data: MessageInfo) => Promise<MessageInfo> | MessageInfo;
//     onSend?: (data: MessageInfo) => Promise<MessageInfo> | MessageInfo;
// }

export abstract class MessagePlugin {
    constructor(public client: MessageBase) { }
    abstract name: string;
    abstract onMessage?: (data: MessageInfo) => Promise<MessageInfo> | MessageInfo;
    abstract onSend?: (data: MessageInfo) => Promise<MessageInfo> | MessageInfo;
}

export type MessageEventName = "onMessage" | "onSend"



export const rid = () => Math.random().toString(36).substring(2, 15)

export function isNull(data: any): boolean {
    return data === null || data === undefined;
}

export async function objectEval(instance: Object, type: "get" | "set" | "call" | "delete", prop: string, data?: any) {
    if (type === "get") {
        return new Function("obj", `return obj.` + prop)(instance)
    } else if (type === "set") {
        return new Function("obj", "value", `obj.${prop}=value`)(instance, data)
    } else if (type === "call") {
        return await new Function("obj", "value", `return obj.${prop}(...value)`)(instance, data)
    } else if (type === "delete") {
        return await new Function("obj", "value", `delete obj.${prop}`)(instance, data)
    }
}

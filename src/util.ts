
export const rid = () => Math.random().toString(36).substring(2, 15)

export function isNull(data: any): boolean {
    return data === null || data === undefined;
}
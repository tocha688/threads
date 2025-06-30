
type pLimitFn<T, R> = () => Promise<R>
type pLimitObj<T, R> = {
    fn: pLimitFn<T, R>,
    resolve?: (value: R | PromiseLike<R>) => void,
    reject?: (reason?: any) => void,
}
export type pLimit<T = any, R = any> = (fn: pLimitFn<T, R>) => Promise<R>;
export function pLimit<T = any, R = any>(size: number): pLimit<T, R> {
    let pools: pLimitObj<T, R>[] = [];
    let rsize = 0;
    async function checkRun() {
        if (rsize >= size || pools.length < 1) return;
        const info = pools.shift();
        if (!info) return;
        rsize++;
        try {
            info.resolve?.(await info.fn());
        } catch (e) {
            info.reject?.(e);
        } finally {
            rsize--;
            checkRun();
        }
    }
    return async function (fn: pLimitFn<T, R>): Promise<R> {
        return new Promise<R>((resolve, reject) => {
            pools.push({ fn, resolve, reject });
            checkRun();
        });
    }
}

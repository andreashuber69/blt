// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
export type DeepReadonly<T> =
    /* eslint-disable @typescript-eslint/indent */
    T extends Array<infer R> ? ReadonlyArray<DeepReadonly<R>> :
    T extends () => unknown ? T :
    T extends object ? { readonly [P in keyof T]: DeepReadonly<T[P]> } :
    T;
    /* eslint-enable @typescript-eslint/indent */

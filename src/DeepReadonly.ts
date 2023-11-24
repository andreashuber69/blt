// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
export type DeepReadonly<T> =
    /* eslint-disable @stylistic/indent */
    T extends Array<infer R> ? ReadonlyArray<DeepReadonly<R>> :
    T extends Map<infer K, infer V> ? ReadonlyMap<DeepReadonly<K>, DeepReadonly<V>> :
    T extends Set<infer K> ? ReadonlySet<DeepReadonly<K>> :
    T extends (...args: never[]) => unknown ? T :
    T extends object ? { readonly [P in keyof T]: DeepReadonly<T[P]> } :
    T;
    /* eslint-enable @stylistic/indent */

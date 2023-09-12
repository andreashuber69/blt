// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
export type YieldType<T> =
    T extends (...args: never[]) => Generator<infer Element> ? Element :
        T extends (...args: never[]) => AsyncGenerator<infer Element> ? Element : never;

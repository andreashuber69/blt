// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
export type YieldType<T> =
    T extends Generator<infer Element> ? Element : T extends AsyncGenerator<infer Element> ? Element : never;

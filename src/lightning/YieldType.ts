// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
export type YieldType<T> = T extends AsyncGenerator<infer Element, void> ? Element : never;

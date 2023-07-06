// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
export type YieldType<T> = T extends AsyncGenerator<infer R, unknown> ? R : never;

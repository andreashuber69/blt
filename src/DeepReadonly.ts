// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
export type DeepReadonly<T> = T extends object ? { readonly [P in keyof T]: DeepReadonly<T[P]> } : T;

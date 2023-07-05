export type YieldType<T> = T extends AsyncGenerator<infer R, unknown> ? R : never;

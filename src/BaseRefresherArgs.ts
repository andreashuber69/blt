// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import type { RefresherArgs } from "./createRefresher.js";

/**
 * Provides the base implementation for all {@linkcode RefresherArgs}.
 */
export abstract class BaseRefresherArgs<Name extends string, Data> implements RefresherArgs<Name, Data> {
    public abstract readonly name: Name;

    public abstract refresh(current?: Data): Promise<Data>;
    public readonly delayMilliseconds = 10_000;

    public abstract onChanged(listener: () => void): void;
    public abstract onError(listener: (error: unknown) => void): void;
    public abstract removeAllListeners(): void;
}

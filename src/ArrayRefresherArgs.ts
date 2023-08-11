// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import type { Refresher, RefresherArgs } from "./createRefresher.js";

/**
 * Provides the base for all {@linkcode RefresherArgs} used to create a {@linkcode Refresher} object where
 * {@linkcode Refresher.data} is an array.
 */
export abstract class ArrayRefresherArgs<Name extends string, Element> implements RefresherArgs<Name, Element[]> {
    public abstract readonly name: Name;

    public abstract refresh(current?: Element[]): Promise<Element[]>;

    public readonly delayMilliseconds = 10_000;

    public abstract on(listener: (scheduleRefresh: boolean) => void): void;

    public abstract removeAllListeners(): void;
}

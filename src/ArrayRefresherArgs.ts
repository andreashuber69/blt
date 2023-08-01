// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import type { AuthenticatedLightningArgs } from "lightning";
import type { RefresherArgs } from "./createRefresher.js";

export abstract class ArrayRefresherArgs<Name extends string, Element> implements RefresherArgs<Name, Element[]> {
    public abstract readonly name: Name;

    public abstract readonly refresh: (current?: Element[]) => Promise<Element[]>;

    public readonly delayMilliseconds = 10_000;

    public abstract readonly subscribe: (listener: (scheduleRefresh: boolean) => void) => void;

    public abstract readonly unsubscribe: () => void;

    public constructor(protected readonly args: AuthenticatedLightningArgs) {}
}

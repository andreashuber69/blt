// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import type { EventEmitter } from "node:events";
import type { AuthenticatedLightningArgs } from "lightning";
import type { RefresherArgs } from "./Refresher.js";

/**
 * Provides the base implementation for all {@linkcode RefresherArgs}.
 */
export abstract class BaseRefresherArgs<Name extends string, Data> implements RefresherArgs<Name, Data> {
    public readonly name: Name;

    public abstract refresh(current?: Data): Promise<Data>;

    public readonly delayMilliseconds: number;

    public abstract onChanged(listener: () => void): void;

    public onError(listener: (error: unknown) => void) {
        this.emitter.on("error", listener);
    }

    public removeAllListeners() {
        this.emitter.removeAllListeners();
    }

    protected constructor(args: {
        readonly lndArgs: AuthenticatedLightningArgs;
        readonly delayMilliseconds?: number;
        readonly name: Name;
        readonly emitter: EventEmitter;
    }) {
        ({
            lndArgs: this.lndArgs,
            delayMilliseconds: this.delayMilliseconds = 10_000,
            name: this.name,
            emitter: this.emitter,
        } = args);

        if (typeof this.delayMilliseconds !== "number" || this.delayMilliseconds <= 0) {
            throw new Error(`args.delayMilliseconds is invalid: ${args.delayMilliseconds}.`);
        }
    }

    protected readonly lndArgs: AuthenticatedLightningArgs;

    protected readonly emitter: EventEmitter;
}

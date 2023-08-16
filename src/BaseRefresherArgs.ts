// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import type { EventEmitter } from "node:events";
import type { Refresher, RefresherArgs } from "./Refresher.js";

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

    /**
     * Initializes a new instance of {@linkcode BaseRefresherArgs}.
     * @param args See properties for details.
     * @param args.delayMilliseconds The delay before a subsequent refresh, see {@linkcode RefresherArgs.onChanged}.
     * @param args.name The name the {@linkcode Refresher} will pass to listeners subscribed via
     * {@linkcode Refresher.onChanged}.
     * @param args.emitter The {@linkcode EventEmitter} to add listeners to or remove listeners from.
     */
    protected constructor(args: {
        readonly delayMilliseconds?: number;
        readonly name: Name;
        readonly emitter: EventEmitter;
    }) {
        ({ delayMilliseconds: this.delayMilliseconds = 10_000, name: this.name, emitter: this.emitter } = args);

        if (typeof this.delayMilliseconds !== "number" || this.delayMilliseconds <= 0) {
            throw new Error(`args.delayMilliseconds is invalid: ${args.delayMilliseconds}.`);
        }
    }

    protected readonly emitter: EventEmitter;
}

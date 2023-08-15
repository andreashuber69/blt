// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import type { EventEmitter } from "node:events";
import type { Refresher, RefresherArgs } from "./createRefresher.js";

/**
 * Provides the base implementation for all {@linkcode RefresherArgs}.
 */
export abstract class BaseRefresherArgs<Name extends string, Data> implements RefresherArgs<Name, Data> {
    public abstract refresh(current?: Data): Promise<Data>;

    public readonly delayMilliseconds = 10_000;

    public abstract onChanged(listener: () => void): void;

    /**
     * Adds a listener to the `"error"` event of the {@linkcode EventEmitter} passed to the
     * constructor.
     * @param listener The listener to add.
     */
    public onError(listener: (error: unknown) => void) {
        this.emitter.on("error", listener);
    }

    /** Removes all listeners from the {@linkcode EventEmitter} passed to the constructor. */
    public removeAllListeners() {
        this.emitter.removeAllListeners();
    }

    /**
     * Initializes a new instance of {@linkcode BaseRefresherArgs}.
     * @param name The name the {@linkcode Refresher} will pass to listeners subscribed via
     * {@linkcode Refresher.onChanged}.
     * @param emitter The {@linkcode EventEmitter} to add listeners to or remove listeners from.
     */
    protected constructor(public readonly name: Name, protected readonly emitter: EventEmitter) {}
}

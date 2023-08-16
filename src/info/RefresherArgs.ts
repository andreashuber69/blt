// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import type { EventEmitter } from "node:events";
import type { AuthenticatedLightningArgs } from "lightning";

import type { Refresher } from "./Refresher.js";

type PropertyNames = "delayMilliseconds" | "name" | "onChanged" | "onError" | "refresh" | "removeAllListeners";

/** Provides the base implementation for arguments passed to {@linkcode Refresher.create} .*/
export abstract class RefresherArgs<Name extends string, Data> {
    /**
     * The name of the data being refreshed. This name is passed to any listener installed with
     * {@linkcode Refresher.onChanged} when the data has been refreshed.
     */
    public readonly name: Name;

    /** Refreshes the data to the current state. */
    public abstract refresh(current?: Data): Promise<Data>;

    /** The length of time subsequent refreshes should be delayed. */
    public readonly delayMilliseconds: number;

    /**
     * Subscribes the passed listener to all events that might indicate {@linkcode Refresher.data} needs to be
     * refreshed.
     * @description Is called when the first listener is installed with a call to {@linkcode Refresher.onChanged}.
     * @param listener Must be called whenever it has been detected that {@linkcode Refresher.data} might need to be
     * updated. Each call schedules a refresh and notify operation to occur after
     * {@linkcode RefresherArgs.delayMilliseconds}, if and only if no other such operation is currently scheduled
     * or in progress. The refresh and notify operation consists of calling {@linkcode RefresherArgs.refresh},
     * assigning the awaited result to {@linkcode Refresher.data} and finally calling all listeners installed through
     * {@linkcode Refresher.onChanged}.
     */
    public abstract onChanged(listener: () => void): void;

    /**
     * Subscribes the passed listener to all events that indicate an error preventing further update of
     * {@linkcode Refresher.data}.
     * @param listener The listener to add.
     */
    public onError(listener: (error: unknown) => void) {
        this.emitter.on("error", listener);
    }

    /** Is called after each call to {@linkcode Refresher.removeAllListeners}. */
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

/** See {@linkcode RefresherArgs}. */
export type IRefresherArgs<Name extends string, Data> = Pick<RefresherArgs<Name, Data>, PropertyNames>;

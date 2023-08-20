// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import { EventEmitter } from "node:events";
import type { AuthenticatedLightningArgs } from "lightning";

import { Scheduler } from "./Scheduler.js";

type PropertyNames = "data" | "onChanged" | "onError" | "removeAllListeners";

/** Provides the base implementation for the arguments object passed to {@linkcode Refresher.create} .*/
export abstract class Refresher<Name extends string, Data> {
    public static async create<
        T extends Refresher<Name, Data>,
        Args extends { readonly lndArgs: AuthenticatedLightningArgs },
        Name extends string,
        Data,
    >(
        ctor: new (args: Args) => T,
        args2: Args,
    ): Promise<IRefresher<Name, Data>> {
        const result = new ctor(args2);
        await result.refresh(args2.lndArgs);
        return result;
    }

    /** The current state of the data. */
    public get data(): Readonly<Data> {
        if (!this.dataImpl) {
            throw new Error("Unexpected get of data before refresh has completed!");
        }

        return this.dataImpl;
    }

    /**
     * Adds the `listener` function to the end of the listeners array.
     * @param listener The listener to add. Is called whenever {@linkcode IRefresher.data} might have changed.
     */
    public onChanged(listener: (name: Name) => void) {
        this.clientEmitter.on(this.name, listener);

        if (this.clientEmitter.listenerCount(this.name) === 1) {
            const scheduler = new Scheduler(this.delayMilliseconds);

            this.onServerChanged(this.serverEmitter, () => scheduler.call(async () => {
                if (await this.refresh(this.lndArgs)) {
                    this.clientEmitter.emit(this.name, this.name);
                }
            }));
        }
    }

    /**
     * Subscribes the passed listener to all events that indicate an error preventing further update of
     * {@linkcode IRefresher.data}.
     * @param listener The listener to add.
     */
    public onError(listener: (error: unknown) => void) {
        this.serverEmitter.on("error", listener);
    }

    /** Removes all previously added listeners. */
    public removeAllListeners() {
        this.serverEmitter.removeAllListeners();
        this.serverEmitterImpl = undefined;
    }

    protected constructor(args: {
        readonly lndArgs: AuthenticatedLightningArgs;
        readonly delayMilliseconds?: number;
        readonly name: Name;
    }) {
        ({ lndArgs: this.lndArgs, delayMilliseconds: this.delayMilliseconds = 10_000, name: this.name } = args);

        if (typeof this.delayMilliseconds !== "number" || this.delayMilliseconds <= 0) {
            throw new Error(`args.delayMilliseconds is invalid: ${args.delayMilliseconds}.`);
        }
    }

    protected dataImpl: Data | undefined;

    /**
     * Refreshes {@linkcode Refresher.dataImpl} to the current state.
     * @description After {@linkcode Refresher.refresh} fulfills, {@linkcode Refresher.dataImpl} must not be
     * equal to `undefined`.
     * @returns `true` if the current state of {@linkcode Refresher.dataImpl} is different from the old state,
     * otherwise `false`.
     */
    protected abstract refresh(lndArgs: AuthenticatedLightningArgs): Promise<boolean>;

    /**
     * Subscribes `listener` to all `serverEmitter` events that might indicate {@linkcode IRefresher.data} needs to be
     * refreshed.
     * @description Is called when the first listener is installed with a call to {@linkcode IRefresher.onChanged}.
     * @param serverEmitter `listener` will be added to one or more events of this emitter.
     * @param listener Must be called whenever it has been detected that {@linkcode IRefresher.data} might need to
     * be updated. Each call schedules a refresh and notify operation to occur after `delayMilliseconds`, if and only if
     * no other such operation is currently scheduled or in progress. The refresh and notify operation consists of
     * calling {@linkcode IRefresher.refresh}, assigning the awaited result to {@linkcode IRefresher.data} and
     * finally calling all listeners installed through {@linkcode IRefresher.onChanged}.
     */
    protected abstract onServerChanged(serverEmitter: EventEmitter, listener: () => void): void;

    protected abstract createServerEmitter(lndArgs: AuthenticatedLightningArgs): EventEmitter;

    private get serverEmitter() {
        this.serverEmitterImpl ??= this.createServerEmitter(this.lndArgs);
        return this.serverEmitterImpl;
    }

    private readonly lndArgs: AuthenticatedLightningArgs;
    private readonly delayMilliseconds: number;
    private readonly name: Name;
    // eslint-disable-next-line unicorn/prefer-event-target
    private readonly clientEmitter = new EventEmitter();
    private serverEmitterImpl: EventEmitter | undefined;
}

/** See {@linkcode Refresher}. */
export type IRefresher<Name extends string, Data> = Pick<Refresher<Name, Data>, PropertyNames>;

// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import { EventEmitter } from "node:events";
import type { AuthenticatedLightningArgs } from "lightning";

import { Scheduler } from "./Scheduler.js";

type PropertyNames = "data" | "onChanged" | "onError" | "removeAllListeners";

/** Provides the base implementation for the arguments object passed to {@linkcode RefresherArgs.create} .*/
export abstract class RefresherArgs<Name extends string, Data> {
    public static async create<T extends RefresherArgs<Name, Data>, Args, Name extends string, Data>(
        ctor: new (args: Args) => T,
        args2: Args,
    ): Promise<IRefresherArgs<Name, Data>> {
        const result = new ctor(args2);
        await result.refresh();
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
     * @param listener The listener to add. Is called whenever {@linkcode IRefresherArgs.data} might have changed.
     */
    public onChanged(listener: (name: Name) => void) {
        this.clientEmitter.on(this.name, listener);

        if (this.clientEmitter.listenerCount(this.name) === 1) {
            const scheduler = new Scheduler(this.delayMilliseconds);

            this.onServerChanged(() => scheduler.call(async () => {
                if (await this.refresh()) {
                    this.clientEmitter.emit(this.name, this.name);
                }
            }));
        }
    }

    /**
     * Subscribes the passed listener to all events that indicate an error preventing further update of
     * {@linkcode IRefresherArgs.data}.
     * @param listener The listener to add.
     */
    public onError(listener: (error: unknown) => void) {
        this.emitter.on("error", listener);
    }

    /** Is called after each call to {@linkcode IRefresherArgs.removeAllListeners}. */
    public removeAllListeners() {
        this.emitter.removeAllListeners();
        this.emitterImpl = undefined;
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

    protected readonly lndArgs: AuthenticatedLightningArgs;

    protected get emitter() {
        this.emitterImpl ??= this.createEmitter();
        return this.emitterImpl;
    }

    /**
     * Refreshes {@linkcode RefresherArgs.dataImpl} to the current state.
     * @description After {@linkcode RefresherArgs.refresh} fulfills, {@linkcode RefresherArgs.dataImpl} must not be
     * equal to `undefined`.
     * @returns `true` if the current state of {@linkcode RefresherArgs.dataImpl} is different from the old state,
     * otherwise `false`.
     */
    protected abstract refresh(): Promise<boolean>;

    /**
     * Subscribes the passed listener to all events that might indicate {@linkcode IRefresherArgs.data} needs to be
     * refreshed.
     * @description Is called when the first listener is installed with a call to {@linkcode IRefresherArgs.onChanged}.
     * @param listener Must be called whenever it has been detected that {@linkcode IRefresherArgs.data} might need to
     * be updated. Each call schedules a refresh and notify operation to occur after `delayMilliseconds`, if and only if
     * no other such operation is currently scheduled or in progress. The refresh and notify operation consists of
     * calling {@linkcode IRefresherArgs.refresh}, assigning the awaited result to {@linkcode IRefresherArgs.data} and
     * finally calling all listeners installed through {@linkcode IRefresherArgs.onChanged}.
     */
    protected abstract onServerChanged(listener: () => void): void;

    protected abstract createEmitter(): EventEmitter;

    private readonly delayMilliseconds: number;
    private readonly name: Name;
    // eslint-disable-next-line unicorn/prefer-event-target
    private readonly clientEmitter = new EventEmitter();
    private emitterImpl: EventEmitter | undefined;
}

/** See {@linkcode RefresherArgs}. */
export type IRefresherArgs<Name extends string, Data> = Pick<RefresherArgs<Name, Data>, PropertyNames>;

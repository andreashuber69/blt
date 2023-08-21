// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import { EventEmitter } from "node:events";
import type { AuthenticatedLightningArgs } from "lightning";

import { Scheduler } from "./Scheduler.js";

type PropertyNames = "data" | "onChanged" | "onError" | "removeAllListeners";

/** Provides the base for all {@linkcode Refresher} implementations. */
export abstract class Refresher<Name extends string, Data> {
    /**
     * Creates a new {@linkcode Refresher} subclass object.
     * @param ctor The constructor of the class an object should be created of.
     * @param args The arguments to be passed to the constructor.
     */
    public static async create<
        T extends Refresher<Name, Data>,
        Args extends { readonly lndArgs: AuthenticatedLightningArgs },
        Name extends string = T extends Refresher<infer N, unknown> ? N : never,
        Data = T extends Refresher<Name, infer D> ? D : never,
    >(
        ctor: new (_args: Args) => T,
        args: Args,
    ): Promise<IRefresher<Name, Data>> {
        const result = new ctor(args);
        await result.refresh(args.lndArgs, result.dataImpl);
        return result;
    }

    /** The current state of the data. */
    public get data(): Readonly<Data> {
        return this.dataImpl;
    }

    /**
     * Adds `listener` to the end of the listeners array.
     * @param listener The listener to add. Is called whenever {@linkcode IRefresher.data} might have changed.
     */
    public onChanged(listener: (name: Name) => void) {
        this.clientEmitter.on(this.name, listener);

        if (this.clientEmitter.listenerCount(this.name) === 1) {
            const scheduler = new Scheduler(this.delayMilliseconds);

            this.onServerChanged(this.serverEmitter, () => scheduler.call(async () => {
                if (await this.refresh(this.lndArgs, this.dataImpl)) {
                    this.clientEmitter.emit(this.name, this.name);
                }
            }));
        }
    }

    /**
     * Subscribes the passed listener to the `"error"` event of the server emitter, which signals that
     * {@linkcode IRefresher.data} will no longer be updated.
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

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    /**
     * Initializes a new instance of {@linkcode Refresher}.
     * @param args See properties for details.
     * @param args.lndArgs The authenticated lightning args.
     * @param args.delayMilliseconds The length of time each refresh and notify operation will be delayed after a change
     * has been detected.
     * @param args.name The name that will be passed to any listener added through {@linkcode IRefresher.onChanged}.
     * @param args.empty The value {@linkcode IRefresher.data} will be initialized with.
     */
    protected constructor(args: {
        readonly lndArgs: AuthenticatedLightningArgs;
        readonly delayMilliseconds?: number;
        readonly name: Name;
        readonly empty: Data;
    }) {
        ({
            lndArgs: this.lndArgs,
            delayMilliseconds: this.delayMilliseconds = 10_000,
            name: this.name,
            empty: this.dataImpl,
        } = args);

        if (typeof this.delayMilliseconds !== "number" || this.delayMilliseconds <= 0) {
            throw new Error(`args.delayMilliseconds is invalid: ${args.delayMilliseconds}.`);
        }
    }

    /**
     * Refreshes {@linkcode IRefresher.data} to the current state.
     * @param lndArgs The authenticated lightning args.
     * @param current The current state of the data. Overrides must modify this such that it represents the new state
     * after the returned promise fulfills.
     * @returns `true` if the new state is different from the old state, otherwise `false`.
     */
    protected abstract refresh(lndArgs: AuthenticatedLightningArgs, current: Data): Promise<boolean>;

    /**
     * Subscribes `listener` to all `serverEmitter` events that might indicate {@linkcode IRefresher.data} needs to be
     * refreshed.
     * @description Is called when the first listener is installed with a call to {@linkcode IRefresher.onChanged}.
     * @param serverEmitter `listener` will be added to one or more events of this emitter.
     * @param listener Must be called whenever it has been detected that {@linkcode IRefresher.data} might need to
     * be updated. Each call schedules a refresh and notify operation to occur after `delayMilliseconds`, if and only if
     * no other such operation is currently scheduled or in progress. The refresh and notify operation consists of
     * calling {@linkcode IRefresher.refresh} which modifies {@linkcode IRefresher.data} to represent the new state and
     * finally calling all listeners installed through {@linkcode IRefresher.onChanged}.
     */
    protected abstract onServerChanged(serverEmitter: EventEmitter, listener: () => void): void;

    /** Creates a new emitter which will be passed to {@linkcode Refresher.onServerChanged}. */
    protected abstract createServerEmitter(lndArgs: AuthenticatedLightningArgs): EventEmitter;

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    private get serverEmitter() {
        this.serverEmitterImpl ??= this.createServerEmitter(this.lndArgs);
        return this.serverEmitterImpl;
    }

    private readonly lndArgs: AuthenticatedLightningArgs;
    private readonly delayMilliseconds: number;
    private readonly name: Name;
    private readonly dataImpl: Data;
    // eslint-disable-next-line unicorn/prefer-event-target
    private readonly clientEmitter = new EventEmitter();
    private serverEmitterImpl: EventEmitter | undefined;
}

/** See {@linkcode Refresher}. */
export type IRefresher<Name extends string, Data> = Pick<Refresher<Name, Data>, PropertyNames>;

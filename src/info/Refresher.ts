// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import { EventEmitter } from "node:events";
import type { AuthenticatedLightningArgs } from "lightning";

import { Scheduler } from "./Scheduler.js";

/**
 * Provides the base for all {@linkcode IRefresher} implementations.
 * @description Each object implementing the {@linkcode IRefresher} interface offers a {@linkcode IRefresher.data}
 * property exposing a readonly copy of data retrieved from a lightning node. Clients requiring continuous update of
 * {@linkcode IRefresher.data} and subsequent notification, must subscribe to the {@linkcode IRefresher.onChanged} and
 * {@linkcode IRefresher.onError} events. Doing so will enable automatic refresh of {@linkcode IRefresher.data} and
 * subsequent notification after the server has reported a change.
 */
export abstract class Refresher<Name extends string, Data> {
    /** The length of time each refresh and notify operation will be delayed after a change has been detected. */
    public get delayMilliseconds() {
        return this.scheduler.delayMilliseconds;
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
            this.onServerChanged(this.serverEmitter, () => this.scheduler.call(async () => {
                if (await this.refresh(this.lndArgs, this.dataImpl)) {
                    this.clientEmitter.emit(this.name, this.name);
                }
            }));
        }
    }

    /**
     * Adds `listener` to the `"error"` event of the server emitter and subscribes to any exceptions that are
     * thrown during refresh.
     * @param listener The listener to add. If called, {@linkcode IRefresher.data} is no longer up to date.
     */
    public onError(listener: (error: unknown) => void) {
        this.serverEmitter.on("error", listener);
        this.scheduler.onError(listener);
    }

    /** Removes all previously added listeners. */
    public removeAllListeners() {
        this.serverEmitter.removeAllListeners();
        this.scheduler.removeAllListeners();
        this.serverEmitterImpl = undefined;
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    /**
     * Initializes the passed {@linkcode Refresher} subclass object, see {@linkcode Refresher.constructor} for more
     * information.
     * @param refresher The refresher to initialize.
     */
    protected static async init<
        T extends Refresher<Name, Data>,
        Name extends string = T extends Refresher<infer N, unknown> ? N : never,
        Data = T extends Refresher<Name, infer D> ? D : never,
    >(refresher: T): Promise<IRefresher<Name, Data>> {
        await refresher.refresh(refresher.lndArgs, refresher.dataImpl);
        return refresher;
    }

    /**
     * Initializes a new instance of {@linkcode Refresher}.
     * @description The constructors of all abstract subclasses must be protected. Those of concrete subclasses must be
     * private. All concrete subclasses must offer a static `create` method, which calls {@linkcode Refresher.init} with
     * a freshly created object of the subclass.
     * @param args See properties for details.
     * @param args.lndArgs The {@linkcode AuthenticatedLightningArgs} of the node the data should be retrieved from.
     * @param args.delayMilliseconds The length of time each refresh and notify operation will be delayed after a change
     * has been detected.
     * @param args.name The name that will be passed to any listener added through {@linkcode Refresher.onChanged}.
     * @param args.empty The value {@linkcode Refresher.data} will be initialized with.
     */
    protected constructor(args: {
        readonly lndArgs: AuthenticatedLightningArgs;
        readonly delayMilliseconds?: number;
        readonly name: Name;
        readonly empty: Data;
    }) {
        ({ lndArgs: this.lndArgs, name: this.name, empty: this.dataImpl } = args);
        this.scheduler = new Scheduler(args.delayMilliseconds);
    }

    /**
     * Refreshes {@linkcode Refresher.data} to the current state.
     * @param lndArgs The authenticated lightning args.
     * @param current The current state of the data. Overrides must modify this such that it represents the new state
     * after the returned promise fulfills.
     * @returns `true` if the new state is different from the old state, otherwise `false`.
     */
    protected abstract refresh(lndArgs: AuthenticatedLightningArgs, current: Data): Promise<boolean>;

    /**
     * Subscribes `listener` to all `serverEmitter` events that might indicate {@linkcode Refresher.data} needs to be
     * refreshed.
     * @description Is called when the first listener is installed with a call to {@linkcode Refresher.onChanged}.
     * @param serverEmitter `listener` will be added to one or more events of this emitter.
     * @param listener Must be called whenever it has been detected that {@linkcode Refresher.data} might need to
     * be updated. Each call schedules a refresh and notify operation to occur after `delayMilliseconds`, if and only if
     * no other such operation is currently scheduled or in progress. The refresh and notify operation consists of
     * calling {@linkcode Refresher.refresh} which modifies {@linkcode Refresher.data} to represent the new state and
     * finally calling all listeners installed through {@linkcode Refresher.onChanged}.
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
    private readonly scheduler: Scheduler;
    private readonly name: Name;
    private readonly dataImpl: Data;
    // eslint-disable-next-line unicorn/prefer-event-target
    private readonly clientEmitter = new EventEmitter();
    private serverEmitterImpl: EventEmitter | undefined;
}

/** See {@linkcode Refresher}. */
export type IRefresher<Name extends string, Data> =
    Pick<Refresher<Name, Data>, "data" | "delayMilliseconds" | "onChanged" | "onError" | "removeAllListeners">;

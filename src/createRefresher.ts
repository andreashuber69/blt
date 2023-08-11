import { EventEmitter } from "node:events";
import { Scheduler } from "./Scheduler.js";

class RefresherImpl<Name extends string, Data> implements Refresher<Name, Data> {
    public constructor(args: RefresherArgs<Name, Data>, public data: Data) {
        const { name, refresh, delayMilliseconds, on, removeAllListeners } = args;
        this.removeAllListenersImpl = removeAllListeners;
        const scheduler = new Scheduler(delayMilliseconds);

        this.onChanged = () => on((scheduleRefresh: boolean) => scheduleRefresh && scheduler.call(async () => {
            this.data = await refresh(this.data);
            this.emitter.emit(name, name);
        }));
    }

    public on(eventName: Name, listener: (name: Name) => void) {
        this.emitter.on(eventName, listener);

        if (this.emitter.listenerCount(eventName) === 1) {
            this.onChanged();
        }

        return this;
    }

    public removeAllListeners(eventName?: Name) {
        this.emitter.removeAllListeners(eventName);
        this.removeAllListenersImpl();
        return this;
    }

    // eslint-disable-next-line unicorn/prefer-event-target
    private readonly emitter = new EventEmitter();
    private readonly onChanged: () => void;
    private readonly removeAllListenersImpl: () => void;
}

export interface RefresherArgs<Name extends string, Data> {
    /**
     * The name of the data being refreshed. This name is passed to any listener installed with
     * {@linkcode Refresher.on} when the data has been refreshed.
     */
    readonly name: Name;

    /** Refreshes the data to the current state. */
    readonly refresh: (current?: Data) => Promise<Data>;

    /** The length of time subsequent refreshes should be delayed. */
    readonly delayMilliseconds: number;

    /**
     * Is called when the first listener is installed with a call to {@linkcode Refresher.on}. The passed
     * listener function schedules a refresh and notify operation to occur after
     * {@linkcode RefresherArgs.delayMilliseconds}, if and only if `scheduleRefresh` is truthy **and** no other such
     * operation is currently scheduled or in progress. The refresh and notify operation consists of calling `refresh`,
     * assigning the awaited result to {@linkcode Refresher.data} and finally calling all listeners installed through
     * {@linkcode Refresher.on}.
     */
    readonly on: (listener: (scheduleRefresh: boolean) => void) => void;

    /** Is called after each call to {@linkcode Refresher.removeAllListeners}. */
    readonly removeAllListeners: () => void;
}

/**
 * Exposes data that is optionally continuously refreshed from an external source.
 */
export interface Refresher<Name extends string, Data> {
    /** The data, only refreshed as long as at least one listener is registered. */
    readonly data: Readonly<Data>;

    /**
     * Adds the `listener` function to the end of the listeners array for the event named `eventName`.
     * @description Behaves exactly like {@linkcode EventEmitter.on}. The registered listener is called whenever
     * {@linkcode Refresher.data} has changed.
     */
    readonly on: (eventName: Name, listener: (name: Name) => void) => this;

    /**
     * Removes all listeners, or those of the specified `eventName`.
     * @description Behaves exactly like {@linkcode EventEmitter.removeAllListeners}.
     */
    readonly removeAllListeners: (eventName?: Name) => this;
}

/**
 * Creates a new refresher.
 * @description Calls `refresh` and assigns the awaited result to the {@linkcode Refresher.data} property of the
 * returned object.
 * @param args An object implementing {@linkcode RefresherArgs}.
 */
export const createRefresher = async <Name extends string, Data>(
    args: RefresherArgs<Name, Data>,
): Promise<Refresher<Name, Data>> =>
    new RefresherImpl(args, await args.refresh());

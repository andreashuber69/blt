import { EventEmitter } from "node:events";
import { Scheduler } from "./Scheduler.js";

class RefresherImpl<Name extends string, Data> implements Refresher<Name, Data> {
    public constructor(
        name: Name,
        public data: Data,
        delayMilliseconds: number,
        refresh: (current?: Data) => Promise<Data>,
        private readonly subscribe: (listener: (scheduleRefresh: boolean) => void) => void,
        private readonly unsubscribe: () => void,
    ) {
        const scheduler = new Scheduler(delayMilliseconds);

        this.handle = (scheduleRefresh: boolean) => scheduleRefresh && scheduler.call(async () => {
            this.data = await refresh(this.data);
            this.emitter.emit(name, name);
        });
    }

    public on(eventName: Name, listener: (name: Name) => void) {
        this.emitter.on(eventName, listener);

        if (this.emitter.listenerCount(eventName) === 1) {
            this.subscribe(this.handle);
        }

        return this;
    }

    public removeAllListeners(eventName?: Name) {
        this.emitter.removeAllListeners(eventName);
        this.unsubscribe();
        return this;
    }

    // eslint-disable-next-line unicorn/prefer-event-target
    private readonly emitter = new EventEmitter();
    private readonly handle: (scheduleRefresh: boolean) => void;
}

/**
 * Exposes data that is optionally continuously refreshed from an external source.
 */
export interface Refresher<Name extends string, Data> {
    /** The data, only refreshed as long as at least one listener is registered. */
    readonly data: Readonly<Data>;

    /**
     * Adds the `listener` function to the end of the listeners array for the event named `eventName`.
     * @description Behaves exactly like {@link EventEmitter.on}. The registered listener is called whenever
     * {@link Refresher.data} has changed.
     */
    readonly on: (eventName: Name, listener: (name: Name) => void) => this;

    /**
     * Removes all listeners, or those of the specified `eventName`.
     * @description Behaves exactly like {@link EventEmitter.removeAllListeners}.
     */
    readonly removeAllListeners: (eventName?: Name) => this;
}

/**
 * Creates a new refresher.
 * @description Calls `refresh` and assigns the awaited result to the {@linkcode Refresher.data} property of the
 * returned object.
 * @param name The name of the data being refreshed. This name is passed to any listener installed with
 * {@linkcode Refresher.on} when the data has been refreshed.
 * @param refresh Refreshes the data to the current state.
 * @param delayMilliseconds The length of time subsequent refreshes should be delayed.
 * @param subscribe Is called when the first listener is installed with a call to {@linkcode Refresher.on}. The passed
 * listener function schedules a refresh and notify operation to occur after `delayMilliseconds`, if and only if
 * `scheduleRefresh` is truthy **and** no other such operation is currently scheduled or in progress. The refresh and
 * notify operation consists of calling `refresh`, assigning the awaited result to {@linkcode Refresher.data} and
 * finally calling all listeners installed through {@linkcode Refresher.on}.
 * @param unsubscribe Is called after each call to {@link Refresher.removeAllListeners}.
 */
export const createRefresher = async <Name extends string, Data>(
    name: Name,
    refresh: (current?: Data) => Promise<Data>,
    delayMilliseconds: number,
    subscribe: (listener: (scheduleRefresh: boolean) => void) => void,
    unsubscribe: () => void,
): Promise<Refresher<Name, Data>> =>
    new RefresherImpl(name, await refresh(), delayMilliseconds, refresh, subscribe, unsubscribe);

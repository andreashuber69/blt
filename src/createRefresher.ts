// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import { EventEmitter } from "node:events";
import { Scheduler } from "./Scheduler.js";

class RefresherImpl<Name extends string, Data> implements Refresher<Name, Data> {
    public constructor(private readonly args: RefresherArgs<Name, Data>, public data: Data) {}

    public onChanged(listener: (name: Name) => void) {
        this.emitter.on(this.args.name, listener);

        if (this.emitter.listenerCount(this.args.name) === 1) {
            const scheduler = new Scheduler(this.args.delayMilliseconds);

            this.args.onChanged(() => scheduler.call(async () => {
                this.data = await this.args.refresh(this.data);
                this.emitter.emit(this.args.name, this.args.name);
            }));
        }

        return this;
    }

    public onError(listener: (error: unknown) => void) {
        this.args.onError(listener);
        return this;
    }

    public removeAllListeners() {
        this.emitter.removeAllListeners();
        this.args.removeAllListeners();
        return this;
    }

    // eslint-disable-next-line unicorn/prefer-event-target
    private readonly emitter = new EventEmitter();
}

export interface RefresherArgs<Name extends string, Data> {
    /**
     * The name of the data being refreshed. This name is passed to any listener installed with
     * {@linkcode Refresher.onChanged} when the data has been refreshed.
     */
    readonly name: Name;

    /** Refreshes the data to the current state. */
    readonly refresh: (current?: Data) => Promise<Data>;

    /** The length of time subsequent refreshes should be delayed. */
    readonly delayMilliseconds: number;

    /**
     * Subscribes the passed listener to all events that might indicate {@linkcode Refresher.data} needs to be
     * refreshed.
     * @description Is called when the first listener is installed with a call to {@linkcode Refresher.onChanged}.
     * @param listener Must be called whenever it has been detected that {@linkcode Refresher.data} might need to be
     * updated. Each call schedules a refresh and notify operation to occur after
     * {@linkcode RefresherArgs.delayMilliseconds}, if and only if no other such operation is currently scheduled or in
     * progress. The refresh and notify operation consists of calling {@linkcode RefresherArgs.refresh}, assigning the
     * awaited result to {@linkcode Refresher.data} and finally calling all listeners installed through
     * {@linkcode Refresher.onChanged}.
     */
    readonly onChanged: (listener: () => void) => void;

    /**
     * Subscribes the passed listener to all events that indicate an error preventing further update of
     * {@linkcode Refresher.data}.
     */
    readonly onError: (listener: (error: unknown) => void) => void;

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
     * Adds the `listener` function to the end of the listeners array for any event that indicates that
     * {@linkcode Refresher.data} might have changed.
     */
    readonly onChanged: (listener: (name: Name) => void) => void;

    /**
     * Adds the `listener` function to the end of the listeners array for any event that indicates an error preventing
     * further update of {@linkcode Refresher.data}.
     */
    readonly onError: (listener: (error: unknown) => void) => void;

    /**
     * Removes all listeners.
     * @description Behaves like {@linkcode EventEmitter.removeAllListeners}, without the option to only remove the
     * listeners for a given event.
     */
    readonly removeAllListeners: () => void;
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

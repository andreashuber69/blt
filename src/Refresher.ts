// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import { EventEmitter } from "node:events";
import { Scheduler } from "./Scheduler.js";

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
export class Refresher<Name extends string, Data> {
    /**
     * Creates a new refresher.
     * @description Calls {@linkcode RefresherArgs.refresh} and assigns the awaited result to the
     * {@linkcode Refresher.data} property of the returned object.
     * @param args An object implementing {@linkcode RefresherArgs}.
     */
    public static async create<Name extends string, Data>(
        args: RefresherArgs<Name, Data>,
    ): Promise<IRefresher<Name, Data>> {
        return new Refresher<Name, Data>(args, await args.refresh());
    }

    /** The data, only refreshed as long as at least one listener is registered with {@linkcode Refresher.onChanged}. */
    public get data(): Readonly<Data> {
        return this.dataImpl;
    }

    /**
     * Adds the `listener` function to the end of the listeners array.
     * @param listener The listener to add. Is called whenever {@linkcode Refresher.data} might have changed.
     */
    public onChanged(listener: (name: Name) => void) {
        this.emitter.on(this.args.name, listener);

        if (this.emitter.listenerCount(this.args.name) === 1) {
            const scheduler = new Scheduler(this.args.delayMilliseconds);

            this.args.onChanged(() => scheduler.call(async () => {
                this.dataImpl = await this.args.refresh(this.dataImpl);
                this.emitter.emit(this.args.name, this.args.name);
            }));
        }
    }

    /**
     * Adds the `listener` function to the end of the listeners array.
     * @param listener The listener to add. Is called when an error occurred that prevents further update of
     * {@linkcode Refresher.data}.
     */
    public onError(listener: (error: unknown) => void) {
        this.args.onError(listener);
    }

    /**
     * Removes all listeners previously added through {@linkcode Refresher.onChanged} and {@linkcode Refresher.onError}.
     */
    public removeAllListeners() {
        this.emitter.removeAllListeners();
        this.args.removeAllListeners();
    }

    private constructor(private readonly args: RefresherArgs<Name, Data>, private dataImpl: Data) {}

    // eslint-disable-next-line unicorn/prefer-event-target
    private readonly emitter = new EventEmitter();
}

export type IRefresher<Name extends string, Data> =
    Pick<Refresher<Name, Data>, "data" | "onChanged" | "onError" | "removeAllListeners">;

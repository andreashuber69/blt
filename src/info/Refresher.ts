// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import { EventEmitter } from "node:events";

import type { IRefresherArgs } from "./RefresherArgs.js";
import { Scheduler } from "./Scheduler.js";

type PropertyNames = "data" | "onChanged" | "onError" | "removeAllListeners";

/**
 * Exposes data that is optionally continuously refreshed from an external source.
 */
export class Refresher<Name extends string, Data> {
    /**
     * Creates a new refresher.
     * @description Calls {@linkcode IRefresherArgs.refresh} and assigns the awaited result to the
     * {@linkcode IRefresher.data} property of the returned object.
     * @param args An object implementing {@linkcode IRefresherArgs}.
     */
    public static async create<Name extends string, Data>(
        args: IRefresherArgs<Name, Data>,
    ): Promise<IRefresher<Name, Data>> {
        await args.refresh();
        return new Refresher<Name, Data>(args);
    }

    /** The data, only refreshed as long as at least one listener is registered with {@linkcode Refresher.onChanged}. */
    public get data(): Readonly<Data> {
        return this.args.data;
    }

    /**
     * Adds the `listener` function to the end of the listeners array.
     * @param listener The listener to add. Is called whenever {@linkcode Refresher.data} might have changed.
     */
    public onChanged(listener: (name: Name) => void) {
        this.clientEmitter.on(this.args.name, listener);

        if (this.clientEmitter.listenerCount(this.args.name) === 1) {
            const scheduler = new Scheduler(this.args.delayMilliseconds);

            this.args.onChanged(() => scheduler.call(async () => {
                if (await this.args.refresh()) {
                    this.clientEmitter.emit(this.args.name, this.args.name);
                }
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
        this.clientEmitter.removeAllListeners();
        this.args.removeAllListeners();
    }

    private constructor(private readonly args: IRefresherArgs<Name, Data>) {}

    // eslint-disable-next-line unicorn/prefer-event-target
    private readonly clientEmitter = new EventEmitter();
}

/** See {@linkcode Refresher}. */
export type IRefresher<Name extends string, Data> = Pick<Refresher<Name, Data>, PropertyNames>;

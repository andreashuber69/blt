// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import type { EventEmitter } from "node:events";
import type { AuthenticatedLightningArgs } from "lightning";

import type { Refresher } from "./Refresher.js";
import { RefresherArgs } from "./RefresherArgs.js";

/**
 * Provides the base for all {@linkcode RefresherArgs} where {@linkcode Refresher.data} is an array, the elements of
 * which do not implement a particular interface.
 */
export abstract class FullRefresherArgs<Name extends string, Element> extends RefresherArgs<Name, Element[]> {
    public override async refresh(current?: Element[]) {
        const result = current ?? [];
        result.splice(0, Number.POSITIVE_INFINITY, ...await this.getAllData());
        return result;
    }

    protected constructor(args: {
        readonly lndArgs: AuthenticatedLightningArgs;
        readonly delayMilliseconds?: number;
        readonly name: Name;
        readonly emitter: EventEmitter;
    }) {
        super(args);
    }

    /** Gets all data. */
    protected abstract getAllData(): Promise<Element[]>;
}

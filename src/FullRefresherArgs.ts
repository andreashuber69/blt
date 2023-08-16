// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import type { EventEmitter } from "node:events";
import type { AuthenticatedLightningArgs } from "lightning";

import { BaseRefresherArgs } from "./BaseRefresherArgs.js";
import type { Refresher, RefresherArgs } from "./Refresher.js";

/**
 * Provides the base for all {@linkcode RefresherArgs} where {@linkcode Refresher.data} is an array, the elements of
 * which do not implement a particular interface.
 */
export abstract class FullRefresherArgs<Name extends string, Element> extends BaseRefresherArgs<Name, Element[]> {
    public override async refresh(current?: Element[]) {
        const result = current ?? [];
        result.splice(0, Number.POSITIVE_INFINITY, ...await this.getAllData());
        return result;
    }

    protected constructor(name: Name, emitter: EventEmitter, protected readonly args: AuthenticatedLightningArgs) {
        super(name, emitter);
    }

    /** Gets all data. */
    protected abstract getAllData(): Promise<Element[]>;
}

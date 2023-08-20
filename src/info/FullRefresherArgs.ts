// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import type { AuthenticatedLightningArgs } from "lightning";

import type { IRefresherArgs } from "./RefresherArgs.js";
import { RefresherArgs } from "./RefresherArgs.js";

/**
 * Provides an {@linkcode IRefresherArgs} implementation for use cases where {@linkcode IRefresherArgs.data} is an
 * array, the elements of which do not implement a particular interface.
 */
export abstract class FullRefresherArgs<Name extends string, Element> extends RefresherArgs<Name, Element[]> {
    protected constructor(args: {
        readonly lndArgs: AuthenticatedLightningArgs;
        readonly delayMilliseconds?: number;
        readonly name: Name;
    }) {
        super(args);
    }

    /** Gets all data. */
    protected abstract getAllData(): Promise<Element[]>;

    protected override async refresh() {
        this.dataImpl ??= [];
        this.dataImpl.splice(0, Number.POSITIVE_INFINITY, ...await this.getAllData());
        return true;
    }
}

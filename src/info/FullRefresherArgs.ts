// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import type { AuthenticatedLightningArgs } from "lightning";

import type { IRefresher } from "./RefresherArgs.js";
import { Refresher } from "./RefresherArgs.js";

/**
 * Provides an {@linkcode IRefresher} implementation for use cases where {@linkcode IRefresher.data} is an
 * array, the elements of which do not implement a particular interface.
 */
export abstract class FullRefresher<Name extends string, Element> extends Refresher<Name, Element[]> {
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

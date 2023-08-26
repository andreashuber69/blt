// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import type { AuthenticatedLightningArgs } from "lightning";

import type { Emitters, IRefresher } from "./Refresher.js";
import { Refresher } from "./Refresher.js";

/**
 * Provides an {@linkcode IRefresher} implementation for use cases where {@linkcode IRefresher.data} is an
 * array, the elements of which do not implement a particular interface.
 */
// eslint-disable-next-line max-len
export abstract class FullRefresher<Name extends string, Element, ServerEmitters extends Emitters<string>> extends Refresher<Name, Element[], ServerEmitters> {
    protected constructor(args: {
        readonly lndArgs: AuthenticatedLightningArgs;
        readonly delayMilliseconds?: number;
        readonly name: Name;
    }) {
        super({ ...args, empty: [] });
    }

    /** Gets all data. */
    protected abstract getAllData(lndArgs: AuthenticatedLightningArgs): Promise<Element[]>;

    protected override async refresh(lndArgs: AuthenticatedLightningArgs, current: Element[]) {
        current.splice(0, Number.POSITIVE_INFINITY, ...await this.getAllData(lndArgs));
        return true;
    }
}

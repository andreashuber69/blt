// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import type { AuthenticatedLightningArgs } from "lightning";

import { ArrayRefresherArgs } from "./ArrayRefresherArgs.js";
import type { Refresher } from "./createRefresher.js";

/**
 * Provides the base for all {@linkcode ArrayRefresherArgs} where the elements in {@linkcode Refresher.data} do not
 * implement a particular interface.
 */
export abstract class FullRefresherArgs<Name extends string, Element> extends ArrayRefresherArgs<Name, Element> {
    public constructor(protected readonly args: AuthenticatedLightningArgs) {
        super();
    }

    public override readonly refresh = async (current?: Element[]) => {
        const result = current ?? [];
        result.splice(0, Number.POSITIVE_INFINITY, ...await this.getAllData());
        return result;
    };

    /** Gets all data. */
    protected abstract readonly getAllData: () => Promise<Element[]>;
}

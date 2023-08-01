// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import type { TimeBoundElement } from "./TimeBoundElement.js";

export const toSortedArray = async <Element extends TimeBoundElement>(generator: AsyncGenerator<Element>) => {
    const result = new Array<Element>();

    for await (const element of generator) {
        result.push(element);
    }

    result.sort((a, b) => a.created_at.localeCompare(b.created_at));
    return result;
};

// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import type { AuthenticatedLightningArgs } from "lightning";
import { BaseRefresherArgs } from "./BaseRefresherArgs.js";
import type { Refresher, RefresherArgs } from "./createRefresher.js";
import { getRangeDays } from "./getRange.js";
import type { TimeBoundElement } from "./TimeBoundElement.js";
import { toSortedArray } from "./toSortedArray.js";

export interface TimeBoundArgs {
    /** Retrieve time-bound data up to this number of days in the past. */
    readonly days: number;
}

/**
 * Provides the base for all {@linkcode RefresherArgs} where {@linkcode Refresher.data} is an array, the elements of
 * which implement {@linkcode TimeBoundElement}. This enables refreshing data partially, by restricting the time period
 * into which newly created elements can fall.
 */
// eslint-disable-next-line max-len
export abstract class PartialRefresherArgs<Name extends string, Element extends TimeBoundElement> extends BaseRefresherArgs<Name, Element[]> {
    public constructor(protected readonly args: AuthenticatedLightningArgs<TimeBoundArgs>) {
        super();
    }

    public override async refresh(current?: Element[]) {
        const result = current ?? [];
        const { after, before } = getRangeDays(this.args.days);
        result.splice(0, result.findIndex((v) => v.created_at >= after)); // Delete old data
        const lastElementCreatedAt = result.at(-1)?.created_at ?? after;

        // Multiple time-bound elements can theoretically be created at the same time and there's no guarantee that we
        // would get all of them in one go. This is why we must get newly added data at and after the time of the last
        // element and eliminate duplicates ourselves. The matter is complicated by the fact that e.g. forwards do not
        // contain a unique id, so we have to eliminate duplicates by comparing for equality of properties.
        const newElements = await toSortedArray(this.getDataRange(lastElementCreatedAt, before));
        result.push(...this.eliminateDuplicates(result, newElements));
        return result;
    }

    /** Gets data in the time period defined by `after` and `before`, both inclusive. */
    protected abstract getDataRange(after: string, before: string): AsyncGenerator<Element>;

    /** Returns `true` when both elements are equal, otherwise `false`. */
    protected abstract equals(a: Element, b: Element): boolean;

    private eliminateDuplicates(currentElements: readonly Element[], possiblyNewElements: readonly Element[]) {
        const result = new Array<Element>();

        // Since the CPU time needed to execute this method is linear with the product of possiblyNewElements.length and
        // the number of current elements, we only consider items in currentElements that were created at exactly the
        // same time as the last item of currentElements.
        const lastCurrentElements = this.getLastElementsCreatedAtSameTime(currentElements);

        for (const possiblyNewElement of possiblyNewElements) {
            let isNew = true;

            for (const lastCurrentElement of lastCurrentElements) {
                isNew &&= !this.equals(possiblyNewElement, lastCurrentElement);
            }

            if (isNew) {
                result.push(possiblyNewElement);
            }
        }

        return result;
    }

    // We need to reference class type parameters which is not possible for static methods.
    // eslint-disable-next-line @typescript-eslint/class-methods-use-this
    private getLastElementsCreatedAtSameTime(currentElements: readonly Element[]) {
        let index = currentElements.length - 1;

        for (; (index >= 0) && (currentElements[index]?.created_at === currentElements.at(-1)?.created_at); --index) {
            // Intentionally empty
        }

        return currentElements.slice(index + 1);
    }
}

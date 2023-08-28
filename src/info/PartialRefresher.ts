// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import type { AuthenticatedLightningArgs } from "lightning";

import type { TimeBoundElement } from "../TimeBoundElement.js";
import { getRangeDays } from "./getRange.js";
import type { Emitters, IRefresher } from "./Refresher.js";
import { Refresher } from "./Refresher.js";
import { toSortedArray } from "./toSortedArray.js";

/**
 * Provides an {@linkcode IRefresher} implementation for use cases where {@linkcode Refresher.data} is an
 * array, the elements of which implement {@linkcode TimeBoundElement}. This enables refreshing data partially, by
 * restricting the time period into which newly created elements can fall.
 */
export abstract class PartialRefresher<
    Name extends string,
    Element extends TimeBoundElement,
    ServerEmitters extends Emitters<string>,
> extends Refresher<Name, Element[], ServerEmitters> {
    /** The number of days in the past data should be retrieved. */
    public readonly days: number;

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    /**
     * Initializes the passed {@linkcode PartialRefresher} subclass object, see
     * {@linkcode PartialRefresher.constructor} for more information.
     * @param refresher The refresher to initialize.
     */
    protected static async initPartial<
        T extends PartialRefresher<Name, Element, ServerEmitters>,
        Name extends string = T extends PartialRefresher<infer N, TimeBoundElement, Emitters<string>> ? N : never,
        Element extends TimeBoundElement = T extends PartialRefresher<Name, infer E, Emitters<string>> ? E : never,
        ServerEmitters extends Emitters<string> = T extends PartialRefresher<Name, Element, infer S> ? S : never,
    >(refresher: T): Promise<IPartialRefresher<Name, Element>> {
        await Refresher.init<T, Name, Element[], ServerEmitters>(refresher);
        return refresher;
    }

    protected constructor(args: {
        readonly lndArgs: AuthenticatedLightningArgs;
        readonly delayMilliseconds?: number;
        readonly days?: number;
        readonly name: Name;
    }) {
        super({ ...args, empty: [] });
        ({ days: this.days = 14 } = args);

        if (typeof this.days !== "number" || this.days <= 0) {
            throw new Error(`args.days is invalid: ${args.days}.`);
        }
    }

    /** Gets data in the time period defined by `after` and `before`, both inclusive. */
    protected abstract getDataRange(
        lndArgs: AuthenticatedLightningArgs,
        after: string,
        before: string,
    ): AsyncGenerator<Element>;

    /** Returns `true` when both elements are equal, otherwise `false`. */
    protected abstract equals(a: Element, b: Element): boolean;

    protected override async refresh(lndArgs: AuthenticatedLightningArgs, current: Element[]) {
        const { after, before } = getRangeDays(this.days);
        const deletedElements = current.splice(0, current.findIndex((v) => v.created_at >= after));
        const lastElementCreatedAt = current.at(-1)?.created_at ?? after;

        // Multiple time-bound elements can theoretically be created at the same time and there's no guarantee that we
        // would get all of them in one go. This is why we must get newly added data at and after the time of the last
        // element and eliminate duplicates ourselves. The matter is complicated by the fact that e.g. forwards do not
        // contain a unique id, so we have to eliminate duplicates by comparing for equality of properties.
        const possiblyNewElements = await toSortedArray(this.getDataRange(lndArgs, lastElementCreatedAt, before));
        const newElements = this.eliminateDuplicates(current, possiblyNewElements);
        current.push(...newElements);
        return deletedElements.length > 0 || newElements.length > 0;
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

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
    private getLastElementsCreatedAtSameTime(currentElements: readonly Element[]) {
        let index = currentElements.length - 1;

        for (; (index >= 0) && (currentElements[index]?.created_at === currentElements.at(-1)?.created_at); --index) {
            // Intentionally empty
        }

        return currentElements.slice(index + 1);
    }
}


/** See {@linkcode PartialRefresher}. */
export type IPartialRefresher<Name extends string, Element extends TimeBoundElement> = Pick<
    PartialRefresher<Name, Element, Emitters<string>>,
    "data" | "days" | "delayMilliseconds" | "onChanged" | "onError" | "removeAllListeners"
>;

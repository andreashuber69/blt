// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import assert from "node:assert";
import { describe, it } from "node:test";
import type { AuthenticatedLightningArgs, PaginationArgs } from "lightning";

import { connectLnd } from "../../connectLnd.js";
import type { TimeBoundElement } from "../../TimeBoundElement.js";

export const testPaginatedArrayResultFunction = <
    Element extends TimeBoundElement,
    After extends string,
    Before extends string,
>(
    func: (args: AuthenticatedLightningArgs<PaginationArgs>) => AsyncGenerator<Element, void, void>,
    after: After,
    before: Before,
) => {
    describe(func.name, () => {
        it("should yield a number of elements not higher than defined by the limit", async () => {
            const limit = 3;
            let length = 0;

            for await (const _ of func({ limit, ...await connectLnd() })) {
                ++length;
            }

            assert(length < limit + 1);
            assert(length > 0);
        });

        it("should return results of 1 day", async () => {
            const oneDay = 24 * 60 * 60 * 1000;
            const now = Date.now();
            const oneDayAgo = now - oneDay;

            const results = func({
                [after]: new Date(oneDayAgo).toISOString(),
                [before]: new Date(now).toISOString(),
                ...await connectLnd(),
            });

            for await (const result of results) {
                assert(now - new Date(result.created_at).valueOf() < oneDay);
            }
        });
    });
};

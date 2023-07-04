import assert from "node:assert";
import { describe, it } from "node:test";
import type { AuthenticatedLightningArgs, PaginationArgs } from "lightning";
import { connectLnd } from "./connectLnd.js";

export const testPaginatedArrayResultFunction = <
    // eslint-disable-next-line @typescript-eslint/naming-convention
    Return extends Array<{ created_at: string }>,
    After extends string,
    Before extends string,
>(
    func: (args: AuthenticatedLightningArgs<PaginationArgs>) => Promise<Return>,
    after: After,
    before: Before,
) => {
    describe(func.name, () => {
        it("should return an array not longer than defined by the limit", async () => {
            const limit = 3;
            const { length } = await func({ limit, ...await connectLnd() });
            assert(length < limit + 1);
            assert(length > 0);
        });

        it("should return results of 1 day", async () => {
            const oneDay = 24 * 60 * 60 * 1000;
            const now = Date.now();
            const oneDayAgo = now - oneDay;

            const results = await func({
                [after]: new Date(oneDayAgo).toISOString(),
                [before]: new Date(now).toISOString(),
                ...await connectLnd(),
            });

            for (const result of results) {
                assert(now - new Date(result.created_at).valueOf() < oneDay);
            }
        });
    });
};

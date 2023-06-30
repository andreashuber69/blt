import assert from "node:assert";
import { describe, it } from "node:test";
import type { AuthenticatedLightningArgs, PaginationArgs } from "lightning";
import type { RangeArgs } from "../getPaginatedArrayData.js";
import { connectLnd } from "./connectLnd.js";

// eslint-disable-next-line @typescript-eslint/naming-convention
export const testPaginatedArrayResultFunction = <Return extends Array<{ created_at: string }>>(
    func: (args: AuthenticatedLightningArgs<PaginationArgs> & RangeArgs) => Promise<Return>,
) => {
    describe(func.name, () => {
        it("should return an array not longer than defined by the limit", async () => {
            const resultCount = 3;
            const { length } = await func(await connectLnd(undefined, resultCount));
            assert(length < resultCount + 1);
            assert(length > 0);
        });

        it("should return results of 1 day", async () => {
            const now = Date.now();
            const results = await func(await connectLnd(1));

            for (const result of results) {
                assert(now - new Date(result.created_at).valueOf() < 24 * 60 * 60 * 1000);
            }
        });
    });
};

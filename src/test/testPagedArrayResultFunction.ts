import { expect } from "chai";
import type { AuthenticatedLightningArgs, PaginationArgs } from "lightning";
import type { OptionalArgs } from "../getPagedArrayData.js";
import { connectLnd } from "./connectLnd.js";

// eslint-disable-next-line @typescript-eslint/naming-convention
export const testPagedArrayResultFunction = <Return extends Array<{ created_at: string }>>(
    func: (args: AuthenticatedLightningArgs<PaginationArgs> & OptionalArgs) => Promise<Return>,
) => {
    describe(func.name, () => {
        it("should return an array not longer than defined by the limit", async function test() {
            // eslint-disable-next-line @typescript-eslint/no-invalid-this
            this.timeout(0);

            const resultCount = 3;
            const { length } = await func(await connectLnd(undefined, resultCount));
            expect(length).to.be.below(resultCount + 1);
            expect(length).to.be.above(0);
        });

        it("should return results of 1 day", async function test() {
            // eslint-disable-next-line @typescript-eslint/no-invalid-this
            this.timeout(0);

            const now = Date.now();
            const results = await func(await connectLnd(1));

            for (const result of results) {
                expect(now - new Date(result.created_at).valueOf()).to.be.below(24 * 60 * 60 * 1000);
            }
        });
    });
};

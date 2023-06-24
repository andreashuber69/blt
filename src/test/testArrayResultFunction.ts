import { expect } from "chai";
import type { AuthenticatedLightningArgs } from "lightning";
import type { OptionalArgs } from "../getLatestData.js";
import { connectLnd } from "./connectLnd.js";

export const testArrayResultFunction = <
    Args extends AuthenticatedLightningArgs,
    // eslint-disable-next-line @typescript-eslint/naming-convention
    Return extends Array<{ created_at: string }>,
>(func: (args: Args & OptionalArgs) => Promise<Return>) => {
    describe(func.name, () => {
        it("should return results as requested", async function test2() {
            // eslint-disable-next-line @typescript-eslint/no-invalid-this
            this.timeout(0);

            const resultCount = 3;
            const authenticatedLnd = await connectLnd(undefined, resultCount);
            const { length } = await func(authenticatedLnd as Args & OptionalArgs);
            expect(length).to.be.below(resultCount + 1);
            expect(length).to.be.above(0);
        });

        it("should return results of 1 day", async function test2() {
            // eslint-disable-next-line @typescript-eslint/no-invalid-this
            this.timeout(0);

            const now = Date.now();
            const authenticatedLnd = await connectLnd(1);
            const results = await func(authenticatedLnd as Args & OptionalArgs);

            for (const result of results) {
                expect(now - new Date(result.created_at).valueOf()).to.be.below(24 * 60 * 60 * 1000);
            }
        });
    });
};

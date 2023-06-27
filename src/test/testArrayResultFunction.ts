import { expect } from "chai";
import type { AuthenticatedLightningArgs } from "lightning";
import { connectLnd } from "./connectLnd.js";

export const testArrayResultFunction = <Return extends unknown[]>(
    func: (args: AuthenticatedLightningArgs) => Promise<Return>,
) => {
    describe(func.name, () => {
        it("should return a non-empty array", async function test() {
            // eslint-disable-next-line @typescript-eslint/no-invalid-this
            this.timeout(0);
            const { length } = await func(await connectLnd());
            expect(length).to.be.above(0);
        });
    });
};

// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import assert from "node:assert";
import { describe, it } from "node:test";
import type { AuthenticatedLightningArgs } from "lightning";

import { connectLnd } from "../connectLnd.js";

export const testArrayResultFunction = async <Return extends unknown[]>(
    func: (args: AuthenticatedLightningArgs) => Promise<Return>,
) => {
    await describe(func.name, async () => {
        await it("should return a non-empty array", async () => {
            assert((await func(await connectLnd())).length > 0);
        });
    });
};

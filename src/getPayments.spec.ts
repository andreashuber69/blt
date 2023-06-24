import { expect } from "chai";
// Test import chaiAsPromised from "chai-as-promised";

import { connectLnd } from "./connectLnd.js";
import { getPayments } from "./getPayments.js";

// Test use(chaiAsPromised);

describe("getPayments", () => {
    it("should return as many results as requested", async function test() {
        // eslint-disable-next-line @typescript-eslint/no-invalid-this
        this.timeout(0);

        const results = 3;
        const authenticatedLnd = await connectLnd(undefined, results);
        const payments = await getPayments(authenticatedLnd);
        expect(payments.length).to.equal(results);
    });

    it("should return results of 1 day", async function test() {
        // eslint-disable-next-line @typescript-eslint/no-invalid-this
        this.timeout(0);

        const now = Date.now();
        const authenticatedLnd = await connectLnd(1);
        const payments = await getPayments(authenticatedLnd);

        for (const payment of payments) {
            expect(now - new Date(payment.created_at).valueOf()).to.be.below(24 * 60 * 60 * 1000);
        }
    });
});

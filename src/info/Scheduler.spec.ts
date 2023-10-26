// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import assert from "node:assert";
import { describe, it } from "node:test";

import { Scheduler } from "./Scheduler.js";
import { delay } from "./testHelpers/delay.js";

await describe(Scheduler.name, async () => {
    await describe(Scheduler.prototype.call.name, async () => {
        const delayMilliseconds = 1000;

        await it("should delay execution", async () => {
            const scheduler = new Scheduler(delayMilliseconds);
            let done = false;
            const task = () => void (done = true);
            scheduler.call(task);
            assert(!done);
            await delay(delayMilliseconds);
            assert(done);
        });

        await it("should not make other calls while busy", async () => {
            const scheduler = new Scheduler(delayMilliseconds);
            let count = 0;
            const task = () => void (++count);
            scheduler.call(task);
            await delay(delayMilliseconds / 10);
            scheduler.call(task);
            await delay(delayMilliseconds / 10);
            scheduler.call(task);
            assert(count === 0);
            await delay(delayMilliseconds * 3);
            assert(count as number === 1);
            scheduler.call(task);
            await delay(delayMilliseconds);
            assert(count as number === 2);
        });

        await it("should emit errors", async () => {
            const scheduler = new Scheduler(delayMilliseconds);
            const errorMessage = "oops!";

            const errorTask = () => {
                throw new Error(errorMessage);
            };

            scheduler.call(errorTask);

            try {
                await new Promise((resolve, reject) => {
                    setTimeout(resolve, delayMilliseconds + 100);
                    scheduler.onError(reject);
                });

                assert(false, "Unexpected success!");
            } catch (error: unknown) {
                assert(error instanceof Error && error.message === errorMessage);
            } finally {
                scheduler.removeAllListeners();
            }
        });
    });
});

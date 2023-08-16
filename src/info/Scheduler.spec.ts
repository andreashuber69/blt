// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import assert from "node:assert";
import { describe, it } from "node:test";

import { Scheduler } from "./Scheduler.js";
import { delay } from "./testHelpers/delay.js";

describe(Scheduler.name, () => {
    describe(Scheduler.prototype.call.name, () => {
        const delayMilliseconds = 1000;

        it("should delay execution", async () => {
            const executor = new Scheduler(delayMilliseconds);
            let done = false;
            const task = () => void (done = true);
            executor.call(task);
            assert(!done);
            await delay(delayMilliseconds);
            assert(done);
        });

        it("should not make other calls while busy", async () => {
            const executor = new Scheduler(delayMilliseconds);
            let count = 0;
            const task = () => void (++count);
            executor.call(task);
            await delay(delayMilliseconds / 10);
            executor.call(task);
            await delay(delayMilliseconds / 10);
            executor.call(task);
            assert(count === 0);
            await delay(delayMilliseconds * 3);
            assert(count as number === 1);
            executor.call(task);
            await delay(delayMilliseconds);
            assert(count as number === 2);
        });
    });
});

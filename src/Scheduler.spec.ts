import assert from "node:assert";
import { describe, it } from "node:test";
import { Scheduler } from "./Scheduler.js";

const wait = async (delayMilliseconds: number) =>
    await new Promise((resolve) => setTimeout(resolve, delayMilliseconds));

describe(Scheduler.name, () => {
    describe(Scheduler.prototype.call.name, () => {
        const delay = 1000;

        it("should delay execution", async () => {
            const executor = new Scheduler(delay);
            let done = false;
            const task = () => void (done = true);
            executor.call(task);
            assert(!done);
            await wait(delay);
            assert(done);
        });

        it("should not make other calls while busy", async () => {
            const executor = new Scheduler(delay);
            let count = 0;
            const task = () => void (++count);
            executor.call(task);
            await wait(delay / 10);
            executor.call(task);
            await wait(delay / 10);
            executor.call(task);
            assert(count === 0);
            await wait(delay * 3);
            assert(count as number === 1);
            executor.call(task);
            await wait(delay);
            assert(count as number === 2);
        });
    });
});

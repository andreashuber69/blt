import assert from "node:assert";
import { describe, it } from "node:test";
import { DelayedExecutor } from "./DelayedExecutor.js";

describe(DelayedExecutor.name, () => {
    describe(DelayedExecutor.prototype.execute.name, () => {
        const delay = 1000;

        it("should delay execution", async () => {
            const executor = new DelayedExecutor(delay);
            let done = false;
            const task = () => void (done = true);
            executor.execute(task);
            assert(!done);
            await new Promise((resolve) => setTimeout(resolve, delay));
            assert(done);
        });

        it("should not execute other tasks while busy", async () => {
            const executor = new DelayedExecutor(delay);
            let count = 0;
            const task = () => void (++count);
            executor.execute(task);
            executor.execute(task);
            executor.execute(task);
            assert(count === 0);
            await new Promise((resolve) => setTimeout(resolve, delay * 3));
            assert(count as number === 1);
            executor.execute(task);
            await new Promise((resolve) => setTimeout(resolve, delay));
            assert(count as number === 2);
        });
    });
});

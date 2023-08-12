import assert from "node:assert";
import { describe, it } from "node:test";
import type { RefresherArgs } from "./createRefresher.js";
import { createRefresher } from "./createRefresher.js";
import { delay } from "./testHelpers/delay.js";

const refresh = async (data?: string) => await Promise.resolve(`${data ?? ""}X`);

class Subscriber {
    public get listeners(): ReadonlyArray<(scheduleRefresh: boolean) => void> {
        return this.listenersImpl;
    }

    public readonly onChanged = (listener: (scheduleRefresh: boolean) => void) => this.listenersImpl.push(listener);

    public readonly removeAllListeners = () => this.listenersImpl.splice(0, this.listenersImpl.length);

    private readonly listenersImpl = new Array<(scheduleRefresh: boolean) => void>();
}

describe(createRefresher.name, () => {
    it("should return a working refresher", async () => {
        const subscriber = new Subscriber();

        const args: RefresherArgs<"tests", string> = {
            name: "tests",
            refresh,
            delayMilliseconds: 50,
            onChanged: subscriber.onChanged,
            removeAllListeners: subscriber.removeAllListeners,
        };

        const refresher = await createRefresher(args);
        assert(refresher.data === "X");
        assert(subscriber.listeners.length === 0);
        let eventCount = 0;

        const listener = (eventName: string) => {
            assert(eventName === "tests");
            ++eventCount;
        };

        refresher.onChanged(listener);
        await delay(100);
        assert(eventCount === 0);
        assert(refresher.data as string === "X");
        assert(subscriber.listeners.length as number === 1);
        subscriber.listeners[0]?.(true);
        await delay(100);
        assert(eventCount as number === 1);
        assert(refresher.data as string === "XX");
        subscriber.listeners[0]?.(true);
        await delay(100);
        assert(eventCount as number === 2);
        assert(refresher.data as string === "XXX");
        refresher.onChanged(listener);
        await delay(100);
        assert(eventCount as number === 2);
        assert(refresher.data as string === "XXX");
        subscriber.listeners[0]?.(true);
        await delay(100);
        assert(eventCount as number === 4);
        assert(refresher.data as string === "XXXX");
        refresher.removeAllListeners();
        assert(subscriber.listeners.length as number === 0);
    });

    it("should delay refresh", async () => {
        const subscriber = new Subscriber();

        const args: RefresherArgs<"tests", string> = {
            name: "tests",
            refresh,
            delayMilliseconds: 1000,
            onChanged: subscriber.onChanged,
            removeAllListeners: subscriber.removeAllListeners,
        };

        const refresher = await createRefresher(args);
        assert(refresher.data === "X");
        assert(subscriber.listeners.length === 0);
        let eventCount = 0;

        const listener = (eventName: string) => {
            assert(eventName === "tests");
            ++eventCount;
        };

        refresher.onChanged(listener);
        await delay(1100);
        assert(eventCount === 0);
        assert(refresher.data as string === "X");
        assert(subscriber.listeners.length as number === 1);
        subscriber.listeners[0]?.(true);
        await delay(100);
        assert(eventCount === 0);
        assert(refresher.data as string === "X");
        await delay(1000);
        assert(eventCount as number === 1);
        assert(refresher.data as string === "XX");
    });

    it("should not refresh when scheduleRefresh is false", async () => {
        const subscriber = new Subscriber();

        const args: RefresherArgs<"tests", string> = {
            name: "tests",
            refresh,
            delayMilliseconds: 50,
            onChanged: subscriber.onChanged,
            removeAllListeners: subscriber.removeAllListeners,
        };

        const refresher = await createRefresher(args);
        assert(refresher.data === "X");
        assert(subscriber.listeners.length === 0);
        let eventCount = 0;

        const listener = (eventName: string) => {
            assert(eventName === "tests");
            ++eventCount;
        };

        refresher.onChanged(listener);
        await delay(100);
        assert(eventCount === 0);
        assert(refresher.data as string === "X");
        assert(subscriber.listeners.length as number === 1);
        subscriber.listeners[0]?.(false);
        await delay(100);
        assert(eventCount === 0);
        assert(refresher.data as string === "X");
        subscriber.listeners[0]?.(true);
        await delay(100);
        assert(eventCount as number === 1);
        assert(refresher.data as string === "XX");
    });
});

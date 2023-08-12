import assert from "node:assert";
import { describe, it } from "node:test";
import type { RefresherArgs } from "./createRefresher.js";
import { createRefresher } from "./createRefresher.js";
import { delay } from "./testHelpers/delay.js";

const refresh = async (data?: string) => await Promise.resolve(`${data ?? ""}X`);

class Subscriber {
    public get changedListeners(): ReadonlyArray<(scheduleRefresh: boolean) => void> {
        return this.changedListenersImpl;
    }

    public get errorListeners(): ReadonlyArray<(error: unknown) => void> {
        return this.errorListenersImpl;
    }

    public readonly onChanged = (listener: (scheduleRefresh: boolean) => void) => {
        this.changedListenersImpl.push(listener);
    };

    public readonly onError = (listener: (error: unknown) => void) => {
        this.errorListenersImpl.push(listener);
    };

    public readonly removeAllListeners = () => {
        this.changedListenersImpl.splice(0);
        this.errorListenersImpl.splice(0);
    };

    private readonly changedListenersImpl = new Array<(scheduleRefresh: boolean) => void>();
    private readonly errorListenersImpl = new Array<(error: unknown) => void>();
}

describe(createRefresher.name, () => {
    it("should return a working refresher", async () => {
        const subscriber = new Subscriber();
        const { changedListeners, onChanged, onError, removeAllListeners } = subscriber;

        const args: RefresherArgs<"tests", string> = {
            name: "tests",
            refresh,
            delayMilliseconds: 50,
            onChanged,
            onError,
            removeAllListeners,
        };

        const refresher = await createRefresher(args);
        assert(refresher.data === "X");
        assert(changedListeners.length === 0);
        let eventCount = 0;

        const listener = (eventName: string) => {
            assert(eventName === "tests");
            ++eventCount;
        };

        refresher.onChanged(listener);
        await delay(100);
        assert(eventCount === 0);
        assert(refresher.data as string === "X");
        assert(changedListeners.length as number === 1);
        changedListeners[0]?.(true);
        await delay(100);
        assert(eventCount as number === 1);
        assert(refresher.data as string === "XX");
        changedListeners[0]?.(true);
        await delay(100);
        assert(eventCount as number === 2);
        assert(refresher.data as string === "XXX");
        refresher.onChanged(listener);
        await delay(100);
        assert(eventCount as number === 2);
        assert(refresher.data as string === "XXX");
        changedListeners[0]?.(true);
        await delay(100);
        assert(eventCount as number === 4);
        assert(refresher.data as string === "XXXX");
        refresher.removeAllListeners();
        assert(changedListeners.length as number === 0);
    });

    it("should delay refresh", async () => {
        const subscriber = new Subscriber();
        const { changedListeners: listeners, onChanged, onError, removeAllListeners } = subscriber;

        const args: RefresherArgs<"tests", string> = {
            name: "tests",
            refresh,
            delayMilliseconds: 1000,
            onChanged,
            onError,
            removeAllListeners,
        };

        const refresher = await createRefresher(args);
        assert(refresher.data === "X");
        assert(listeners.length === 0);
        let eventCount = 0;

        const listener = (eventName: string) => {
            assert(eventName === "tests");
            ++eventCount;
        };

        refresher.onChanged(listener);
        await delay(1100);
        assert(eventCount === 0);
        assert(refresher.data as string === "X");
        assert(listeners.length as number === 1);
        listeners[0]?.(true);
        await delay(100);
        assert(eventCount === 0);
        assert(refresher.data as string === "X");
        await delay(1000);
        assert(eventCount as number === 1);
        assert(refresher.data as string === "XX");
    });

    it("should not refresh when scheduleRefresh is false", async () => {
        const subscriber = new Subscriber();
        const { changedListeners: listeners, onChanged, onError, removeAllListeners } = subscriber;

        const args: RefresherArgs<"tests", string> = {
            name: "tests",
            refresh,
            delayMilliseconds: 50,
            onChanged,
            onError,
            removeAllListeners,
        };

        const refresher = await createRefresher(args);
        assert(refresher.data === "X");
        assert(listeners.length === 0);
        let eventCount = 0;

        const listener = (eventName: string) => {
            assert(eventName === "tests");
            ++eventCount;
        };

        refresher.onChanged(listener);
        await delay(100);
        assert(eventCount === 0);
        assert(refresher.data as string === "X");
        assert(listeners.length as number === 1);
        listeners[0]?.(false);
        await delay(100);
        assert(eventCount === 0);
        assert(refresher.data as string === "X");
        listeners[0]?.(true);
        await delay(100);
        assert(eventCount as number === 1);
        assert(refresher.data as string === "XX");
    });
});

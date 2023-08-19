// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import assert from "node:assert";
import { describe, it } from "node:test";

import { Refresher } from "./Refresher.js";
import { delay } from "./testHelpers/delay.js";

const refresh = async (data?: string) => await Promise.resolve(`${data ?? ""}X`);

class Subscriber {
    public get changedListeners(): ReadonlyArray<() => void> {
        return this.changedListenersImpl;
    }

    public get errorListeners(): ReadonlyArray<(error: unknown) => void> {
        return this.errorListenersImpl;
    }

    public readonly onServerChanged = (listener: () => void) => {
        this.changedListenersImpl.push(listener);
    };

    public readonly onError = (listener: (error: unknown) => void) => {
        this.errorListenersImpl.push(listener);
    };

    public readonly removeAllListeners = () => {
        this.changedListenersImpl.splice(0);
        this.errorListenersImpl.splice(0);
    };

    private readonly changedListenersImpl = new Array<() => void>();
    private readonly errorListenersImpl = new Array<(error: unknown) => void>();
}

describe(Refresher.name, () => {
    describe(Refresher.create.name, () => {
        it("should return a working refresher", async () => {
            const subscriber = new Subscriber();
            const { changedListeners, errorListeners, onServerChanged, onError, removeAllListeners } = subscriber;

            let dataImpl: string | undefined;

            const args = {
                name: "tests",
                get data() {
                    if (!this.dataImpl) {
                        throw new Error("Something went wrong");
                    }

                    return this.dataImpl;
                },
                async refresh() {
                    this.dataImpl = await refresh(this.dataImpl);
                    return true;
                },
                delayMilliseconds: 50,
                onServerChanged,
                onError,
                removeAllListeners,
                dataImpl,
            };

            const refresher = await Refresher.create(args);
            assert(refresher.data === "X");
            assert(changedListeners.length === 0);

            let errorCount = 0;

            const errorListener = (error: unknown) => {
                assert(error === "error");
                ++errorCount;
            };

            refresher.onError(errorListener);
            assert(errorListeners.length === 1);
            assert(errorCount === 0);

            let changedCount = 0;

            const changedListener = (eventName: string) => {
                assert(eventName === "tests");
                ++changedCount;
            };

            refresher.onChanged(changedListener);
            await delay(100);
            assert(changedCount === 0);
            assert(refresher.data as string === "X");
            assert(changedListeners.length as number === 1);
            changedListeners[0]?.();
            await delay(100);
            assert(changedCount as number === 1);
            assert(refresher.data as string === "XX");
            changedListeners[0]?.();
            await delay(100);
            assert(changedCount as number === 2);
            assert(refresher.data as string === "XXX");
            refresher.onChanged(changedListener);
            await delay(100);
            assert(changedCount as number === 2);
            assert(refresher.data as string === "XXX");
            changedListeners[0]?.();
            await delay(100);
            assert(changedCount as number === 4);
            assert(refresher.data as string === "XXXX");

            errorListeners[0]?.("error");
            assert(errorCount as number === 1);

            refresher.removeAllListeners();
            assert(changedListeners.length as number === 0);
            assert(errorListeners.length as number === 0);
        });

        it("should delay refresh", async () => {
            const subscriber = new Subscriber();
            const { changedListeners: listeners, onServerChanged, onError, removeAllListeners } = subscriber;

            let dataImpl: string | undefined;

            const args = {
                name: "tests",
                get data() {
                    if (!this.dataImpl) {
                        throw new Error("Something went wrong");
                    }

                    return this.dataImpl;
                },
                async refresh() {
                    this.dataImpl = await refresh(this.dataImpl);
                    return true;
                },
                delayMilliseconds: 1000,
                onServerChanged,
                onError,
                removeAllListeners,
                dataImpl,
            };

            const refresher = await Refresher.create(args);
            assert(refresher.data === "X");
            assert(listeners.length === 0);
            let changedCount = 0;

            const changedListener = (eventName: string) => {
                assert(eventName === "tests");
                ++changedCount;
            };

            refresher.onChanged(changedListener);
            await delay(1100);
            assert(changedCount === 0);
            assert(refresher.data as string === "X");
            assert(listeners.length as number === 1);
            listeners[0]?.();
            await delay(100);
            assert(changedCount === 0);
            assert(refresher.data as string === "X");
            await delay(1000);
            assert(changedCount as number === 1);
            assert(refresher.data as string === "XX");
        });
    });
});

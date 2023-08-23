// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import assert from "node:assert";
import { EventEmitter } from "node:events";
import { describe, it } from "node:test";

import type { AuthenticatedLightningArgs, AuthenticatedLnd } from "lightning";
import { Refresher } from "./Refresher.js";
import { delay } from "./testHelpers/delay.js";
import { Scheduler } from "./Scheduler.js";

const refresherName = "test";
const serverEventName = "changed";
const delayMilliseconds = 1000;
const err = "oops!";

interface Data {
    value: string;
}

interface RefresherImplArgs {
    readonly lndArgs: AuthenticatedLightningArgs;
    readonly delayMilliseconds?: number;
}

class RefresherImpl extends Refresher<typeof refresherName, Data> {
    public static async create(args: RefresherImplArgs) {
        return await Refresher.init(new RefresherImpl(args));
    }

    public get currentServerEmitter() {
        return this.currentServerEmitterImpl;
    }

    public throwOnNextRefresh = false;

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    protected override async refresh(_lndArgs: AuthenticatedLightningArgs, current: Data) {
        if (this.throwOnNextRefresh) {
            this.throwOnNextRefresh = false;
            return await Promise.reject(new Error(err));
        }

        current.value += "Z";
        return await Promise.resolve(true);
    }

    protected override onServerChanged(serverEmitter: EventEmitter, listener: () => void) {
        serverEmitter.on(serverEventName, listener);
    }

    protected override createServerEmitter(_lndArgs: { lnd: AuthenticatedLnd }) {
        // eslint-disable-next-line unicorn/prefer-event-target
        this.currentServerEmitterImpl = new EventEmitter();
        return this.currentServerEmitterImpl;
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    private constructor(args: RefresherImplArgs) {
        super({ ...args, name: refresherName, empty: { value: "" } });
    }

    private currentServerEmitterImpl: EventEmitter | undefined;
}

const argsMock = {
    lndArgs: {
        lnd: {} as unknown as AuthenticatedLnd,
    },
    delayMilliseconds,
};

describe(Refresher.name, () => {
    const errorEventName = "error";

    it("should only create a server emitter on demand", async () => {
        const sut = await RefresherImpl.create(argsMock);

        assert((sut as RefresherImpl).currentServerEmitter === undefined);
    });

    it("should keep the server emitter as necessary", async () => {
        const sut = await RefresherImpl.create(argsMock);

        sut.onError(() => { /* intentionally empty */ });
        const serverEmitter = (sut as RefresherImpl).currentServerEmitter;
        assert(serverEmitter instanceof EventEmitter);
        assert(serverEmitter.listenerCount(errorEventName) === 1);

        sut.onError(() => { /* intentionally empty */ });
        assert((sut as RefresherImpl).currentServerEmitter === serverEmitter);
        assert(serverEmitter.listenerCount(errorEventName) === 2);

        sut.onChanged(() => { /* intentionally empty */ });
        assert((sut as RefresherImpl).currentServerEmitter === serverEmitter);
        assert(serverEmitter.listenerCount(serverEventName) === 1);

        sut.onChanged(() => { /* intentionally empty */ });
        assert((sut as RefresherImpl).currentServerEmitter === serverEmitter);
        assert(serverEmitter.listenerCount(serverEventName) === 1);

        sut.removeAllListeners();
        assert(serverEmitter.listenerCount(errorEventName) === 0);
        assert(serverEmitter.listenerCount(serverEventName) === 0);
        sut.onError(() => { /* intentionally empty */ });
        assert((sut as RefresherImpl).currentServerEmitter !== serverEmitter);
    });

    describe(RefresherImpl.create.name, () => {
        it("should throw for invalid delay", async () => {
            try {
                const sut = await RefresherImpl.create({ ...argsMock, delayMilliseconds: -1 });

                assert(false, `Unexpected success: ${sut}`);
            } catch (error) {
                assert(error instanceof Error && error.message === "delayMilliseconds is invalid: -1.");
            }
        });

        it("should apply default for delay", async () => {
            const { delayMilliseconds: _, ...noDelayArgs } = argsMock;
            const sut = await RefresherImpl.create(noDelayArgs);
            assert(sut.delayMilliseconds === new Scheduler().delayMilliseconds);

            const name = await new Promise((resolve, reject) => {
                sut.onChanged(resolve);
                sut.onError(reject);
                (sut as RefresherImpl).currentServerEmitter?.emit(serverEventName);
            });

            assert(name === refresherName);
        });
    });

    describe("data", () => {
        it("should be initialized after creation", async () => {
            const sut = await RefresherImpl.create(argsMock);

            assert(sut.data.value === "Z");
        });
    });

    describe(Refresher.prototype.onChanged.name, () => {
        it("should delay refresh and notification", async () => {
            const sut = await RefresherImpl.create(argsMock);

            let onChangedCalls = 0;

            const onChangedListener = (name: string) => {
                assert(name === refresherName);
                ++onChangedCalls;
            };

            assert(sut.data.value === "Z");

            sut.onChanged(onChangedListener);
            const serverEmitter = (sut as RefresherImpl).currentServerEmitter;
            assert(serverEmitter instanceof EventEmitter);

            assert(onChangedCalls === 0);
            serverEmitter.emit(serverEventName);
            assert(sut.data.value === "Z");
            assert(onChangedCalls === 0);
            await delay(delayMilliseconds + 100);
            assert(sut.data.value as string === "ZZ");
            assert(onChangedCalls as number === 1);
        });
    });

    describe(Refresher.prototype.onError.name, () => {
        it("should notify errors immediately", async () => {
            const sut = await RefresherImpl.create(argsMock);

            let onErrorCalls = 0;

            const onErrorListener = (error: unknown) => {
                assert(error === err);
                ++onErrorCalls;
            };

            sut.onError(onErrorListener);
            const serverEmitter = (sut as RefresherImpl).currentServerEmitter;
            assert(serverEmitter instanceof EventEmitter);

            assert(onErrorCalls === 0);
            serverEmitter.emit(errorEventName, err);
            assert(onErrorCalls as number === 1);
        });

        it("should notify refresh errors", async () => {
            const sut = await RefresherImpl.create(argsMock);

            try {
                await new Promise((resolve, reject) => {
                    sut.onChanged(resolve);
                    sut.onError(reject);
                    (sut as RefresherImpl).throwOnNextRefresh = true;
                    (sut as RefresherImpl).currentServerEmitter?.emit(serverEventName);
                });

                assert(false, `Unexpected success: ${sut}`);
            } catch (error: unknown) {
                assert(error instanceof Error && error.message === err);
            }
        });
    });
});

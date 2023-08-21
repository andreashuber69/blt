// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import assert from "node:assert";
import { EventEmitter } from "node:events";
import { describe, it } from "node:test";

import type { AuthenticatedLightningArgs, AuthenticatedLnd } from "lightning";
import { Refresher } from "./Refresher.js";
import { delay } from "./testHelpers/delay.js";

const refresherName = "test";
const serverEventName = "changed";
const delayMilliseconds = 1000;

interface Data {
    value: string;
}

class RefresherImpl extends Refresher<typeof refresherName, Data> {
    public constructor(args: { lndArgs: AuthenticatedLightningArgs; delayMilliseconds: number }) {
        super({ ...args, name: refresherName, empty: { value: "" } });
    }

    public get currentServerEmitter() {
        return this.currentServerEmitterImpl;
    }

    protected override async refresh(_lndArgs: { lnd: AuthenticatedLnd }, current: Data): Promise<boolean> {
        current.value += "Z";
        return await Promise.resolve(true);
    }

    protected override onServerChanged(serverEmitter: EventEmitter, listener: () => void): void {
        serverEmitter.on(serverEventName, listener);
    }

    protected override createServerEmitter(_lndArgs: { lnd: AuthenticatedLnd }): EventEmitter {
        // eslint-disable-next-line unicorn/prefer-event-target
        this.currentServerEmitterImpl = new EventEmitter();
        return this.currentServerEmitterImpl;
    }

    private currentServerEmitterImpl: EventEmitter | undefined;
}

const argsMock = {
    lndArgs: {
        lnd: {} as unknown as AuthenticatedLnd,
    },
    delayMilliseconds,
};

describe.only(Refresher.name, () => {
    const errorEventName = "error";

    it.only("should only create a server emitter on demand", async () => {
        const refresher = await Refresher.create(RefresherImpl, argsMock);
        assert((refresher as RefresherImpl).currentServerEmitter === undefined);
    });

    it.only("should keep the server emitter as necessary", async () => {
        const sut = await Refresher.create(RefresherImpl, argsMock);

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

    describe.only(Refresher.create.name, () => {
        it.only("should throw for invalid delay", async () => {
            try {
                const refresher = await Refresher.create(RefresherImpl, { ...argsMock, delayMilliseconds: -1 });
                assert(false, `Unexpected success: ${refresher}`);
            } catch (error) {
                assert(error instanceof Error && error.message === "args.delayMilliseconds is invalid: -1.");
            }
        });
    });

    describe.only("data", () => {
        it.only("should be initialized after creation", async () => {
            const sut = await Refresher.create(RefresherImpl, argsMock);

            assert(sut.data.value === "Z");
        });
    });

    describe.only(Refresher.prototype.onChanged.name, () => {
        it.only("should delay refresh and notification", async () => {
            const sut = await Refresher.create(RefresherImpl, argsMock);

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

    describe.only(Refresher.prototype.onError.name, () => {
        const err = "oops!";

        it.only("should notify errors immediately", async () => {
            const sut = await Refresher.create(RefresherImpl, argsMock);

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
    });
});

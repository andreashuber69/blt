// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import assert from "node:assert";
import { describe, it } from "node:test";

import type { NodeInfo } from "./getNodeInfo.js";
import { NodeStatistics } from "./NodeStatistics.js";

const getManagerMethods = <Name extends string>() => ({
    onChanged: (_listener: (name: Name) => void) => { /* empty */ },
    onError: (_listener: (error: unknown) => void) => { /* empty */ },
    removeAllListeners: () => { /* empty */ },
});

const nodeInfo: NodeInfo = {
    identity: {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        public_key: "",
    },
    channels: {
        data: [
            { id: "0x3609x1" },
            { id: "0x1657x1" },
            { id: "0x2916x2" },
        ],
        ...getManagerMethods<"channels">(),
    },
    forwards: {
        data: [
            /* eslint-disable @typescript-eslint/naming-convention */
            {
                created_at: "2023-06-28T00:01:40.000Z",
                fee: 33,
                incoming_channel: "0x3609x1",
                outgoing_channel: "0x1657x1",
                tokens: 237_462,
            } as const,
            {
                created_at: "2023-06-28T00:01:35.000Z",
                fee: 18,
                incoming_channel: "0x3609x1",
                outgoing_channel: "0x1657x1",
                tokens: 131_998,
            } as const,
            {
                created_at: "2023-06-27T17:36:41.000Z",
                fee: 0,
                incoming_channel: "0x2916x2",
                outgoing_channel: "0x3609x1",
                tokens: 100_010,
            } as const,
            {
                created_at: "2023-06-27T17:36:35.000Z",
                fee: 0,
                incoming_channel: "0x2916x2",
                outgoing_channel: "0x3609x1",
                tokens: 100_010,
            } as const,
            {
                created_at: "2023-06-27T08:02:35.000Z",
                fee: 24,
                incoming_channel: "0x3609x1",
                outgoing_channel: "0x1657x1",
                tokens: 173_917,
            } as const,
            /* eslint-enable @typescript-eslint/naming-convention */
        ],
        ...getManagerMethods<"forwards">(),
    },
    payments: {
        data: [],
        ...getManagerMethods<"payments">(),
    },
    ...getManagerMethods<"channels" | "forwards" | "payments">(),
};

describe(NodeStatistics.name, () => {
    describe("constructor", () => {
        it("should create a valid object", () => {
            const sut = new NodeStatistics(nodeInfo);
            assert(sut.channelStatistics);
            console.log(sut.channelStatistics);
        });
    });
});

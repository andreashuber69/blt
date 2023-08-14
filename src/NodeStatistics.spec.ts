// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import assert from "node:assert";
import { describe, it } from "node:test";

import type { NodeInfo } from "./getNodeInfo.js";
import type { ChannelStats } from "./ChannelStats.js";
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
            { id: "0x3609x2" },
            { id: "0x1657x1" },
            { id: "0x3609x1" },
            { id: "0x2091x1" },
            { id: "0x1657x0" },
            { id: "0x2916x2" },
        ],
        ...getManagerMethods<"channels">(),
    },
    forwards: {
        data: [
            /* eslint-disable @typescript-eslint/naming-convention */
            {
                created_at: "2023-07-31T06:08:51.000Z",
                fee: 4,
                incoming_channel: "0x3609x2",
                outgoing_channel: "0x1657x1",
                tokens: 35_949,
            },
            {
                created_at: "2023-07-31T06:08:56.000Z",
                fee: 5,
                incoming_channel: "0x3609x2",
                outgoing_channel: "0x1657x1",
                tokens: 43_497,
            },
            {
                created_at: "2023-07-31T06:51:21.000Z",
                fee: 7,
                incoming_channel: "0x3609x1",
                outgoing_channel: "0x1657x1",
                tokens: 59_023,
            },
            {
                created_at: "2023-07-31T09:06:05.000Z",
                fee: 4,
                incoming_channel: "0x3609x1",
                outgoing_channel: "0x1657x1",
                tokens: 39_186,
            },
            {
                created_at: "2023-07-31T11:05:13.000Z",
                fee: 7,
                incoming_channel: "0x3609x1",
                outgoing_channel: "0x1657x1",
                tokens: 61_526,
            },
            {
                created_at: "2023-07-31T13:56:09.000Z",
                fee: 4,
                incoming_channel: "0x3609x1",
                outgoing_channel: "0x1657x1",
                tokens: 38_508,
            },
            {
                created_at: "2023-07-31T15:12:45.000Z",
                fee: 10,
                incoming_channel: "0x2091x1",
                outgoing_channel: "0x1657x0",
                tokens: 49_845,
            },
            {
                created_at: "2023-07-31T15:14:27.000Z",
                fee: 7,
                incoming_channel: "0x2091x1",
                outgoing_channel: "0x1657x1",
                tokens: 60_316,
            },
            {
                created_at: "2023-07-31T15:17:30.000Z",
                fee: 3,
                incoming_channel: "0x2091x1",
                outgoing_channel: "0x2916x2",
                tokens: 48_008,
            },
            {
                created_at: "2023-07-31T15:20:16.000Z",
                fee: 4,
                incoming_channel: "0x2091x1",
                outgoing_channel: "0x2916x2",
                tokens: 58_089,
            },
            {
                created_at: "2023-07-31T19:49:29.000Z",
                fee: 7,
                incoming_channel: "0x1234x2",
                outgoing_channel: "0x5678x1",
                tokens: 100_000,
            },
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

const verifyFlow = (
    channels: Readonly<Record<string, Readonly<ChannelStats>>>,
    channel: string,
    incomingCount: number,
    incomingTokens: number,
    outgoingCount: number,
    outgoingTokens: number,
) => {
    it(channel, () => {
        const channelStats = channels[channel];
        assert(channelStats);
        const { forwards } = channelStats;
        assert(forwards.incomingCount === incomingCount);
        assert(forwards.incomingTokens === incomingTokens);
        assert(forwards.outgoingCount === outgoingCount);
        assert(forwards.outgoingTokens === outgoingTokens);
    });
};

describe(NodeStatistics.name, () => {
    describe("channelStatistics", () => {
        describe("should contain the correct flows", () => {
            const { channels } = new NodeStatistics(nodeInfo);

            assert(Object.keys(channels).length === nodeInfo.channels.data.length);
            verifyFlow(channels, "0x3609x2", 2, 79_446, 0, 0);
            verifyFlow(channels, "0x1657x1", 0, 0, 7, 338_005);
            verifyFlow(channels, "0x3609x1", 4, 198_243, 0, 0);
            verifyFlow(channels, "0x2091x1", 4, 216_258, 0, 0);
            verifyFlow(channels, "0x1657x0", 0, 0, 1, 49_845);
            verifyFlow(channels, "0x2916x2", 0, 0, 2, 106_097);
        });
    });
});

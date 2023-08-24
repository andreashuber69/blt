// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import assert from "node:assert";
import { describe, it } from "node:test";

import type { ChannelStats } from "./ChannelStats.js";
import type { INodeInfo } from "./info/NodeInfo.js";
import { NodeStats } from "./NodeStats.js";

const getManagerMembers = <Name extends string>() => ({
    delayMilliseconds: 10_000,
    onChanged: (_listener: (name: Name) => void) => { /* empty */ },
    onError: (_listener: (error: unknown) => void) => { /* empty */ },
    removeAllListeners: () => { /* empty */ },
});

const nodeInfo: INodeInfo = {
    /* eslint-disable @typescript-eslint/naming-convention */
    identity: {
        public_key: "",
    },
    channels: {
        data: [
            /* eslint-disable max-len */
            { capacity: 1_000_000, id: "0x3609x2", local_balance: 400_000, partner_public_key: "03864ef025fde8fb587d989186ce6a4a186895ee44a926bfc370e2c366597a3f8f", remote_balance: 600_000 },
            { capacity: 1_000_000, id: "0x1657x1", local_balance: 400_000, partner_public_key: "02abfbe63425b1ba4f245af72a0a85ba16cd13365704655b2abfc13e53ad338e02", remote_balance: 600_000 },
            { capacity: 1_000_000, id: "0x3609x1", local_balance: 400_000, partner_public_key: "0326e692c455dd554c709bbb470b0ca7e0bb04152f777d1445fd0bf3709a2833a3", remote_balance: 600_000 },
            { capacity: 1_000_000, id: "0x2091x1", local_balance: 400_000, partner_public_key: "03f5dcf253ca5ab4a8a0ad27bc5d8787ca920610902425b060311530cb511e9545", remote_balance: 600_000 },
            { capacity: 1_000_000, id: "0x1657x0", local_balance: 400_000, partner_public_key: "029efe15ef5f0fcc2fdd6b910405e78056b28c9b64e1feff5f13b8dce307e67cad", remote_balance: 600_000 },
            { capacity: 1_000_000, id: "0x2916x2", local_balance: 400_000, partner_public_key: "0276dfcb25dfd2f765cee20cef749479967aced11191c230e82efa1bda0ea3d355", remote_balance: 600_000 },
            /* eslint-enable max-len */
        ],
        ...getManagerMembers<"channels">(),
    },
    nodes: {
        data: [
            { alias: "Node 1", color: "", features: [], id: "0x3609x2", sockets: [] },
            { alias: "Node 2", color: "", features: [], id: "0x1657x1", sockets: [] },
            { alias: "Node 3", color: "", features: [], id: "0x3609x1", sockets: [] },
            { alias: "Node 4", color: "", features: [], id: "0x2091x1", sockets: [] },
            { alias: "Node 5", color: "", features: [], id: "0x1657x0", sockets: [] },
            { alias: "Node 6", color: "", features: [], id: "0x2916x2", sockets: [] },
        ],
        ...getManagerMembers<"nodes">(),
    },
    forwards: {
        data: [
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
        ],
        days: 14,
        ...getManagerMembers<"forwards">(),
    },
    /* eslint-enable @typescript-eslint/naming-convention */
    payments: {
        data: [],
        days: 14,
        ...getManagerMembers<"payments">(),
    },
    ...getManagerMembers<"channels" | "forwards" | "payments">(),
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

describe(NodeStats.name, () => {
    describe("channels", () => {
        describe("should contain the correct flows", () => {
            const { channels } = new NodeStats(nodeInfo);

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

// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import assert from "node:assert";
import { describe, it } from "node:test";

import type { IChannelStats } from "./ChannelStats.js";
import { InForward, OutForward } from "./ChannelStats.js";
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
            { capacity: 1_000_000, id: "0x3609x2", local_balance: 400_000, partner_public_key: "03864ef025fde8fb587d989186ce6a4a186895ee44a926bfc370e2c366597a3f8f", transaction_id: "", base_fee: 0, fee_rate: 200 },
            { capacity: 1_000_000, id: "0x1657x1", local_balance: 400_000, partner_public_key: "02abfbe63425b1ba4f245af72a0a85ba16cd13365704655b2abfc13e53ad338e02", transaction_id: "", base_fee: 0, fee_rate: 200 },
            { capacity: 1_000_000, id: "0x3609x1", local_balance: 400_000, partner_public_key: "0326e692c455dd554c709bbb470b0ca7e0bb04152f777d1445fd0bf3709a2833a3", transaction_id: "", base_fee: 0, fee_rate: 200 },
            { capacity: 1_000_000, id: "0x2091x1", local_balance: 400_000, partner_public_key: "03f5dcf253ca5ab4a8a0ad27bc5d8787ca920610902425b060311530cb511e9545", transaction_id: "", base_fee: 0, fee_rate: 200 },
            { capacity: 1_000_000, id: "0x1657x0", local_balance: 400_000, partner_public_key: "029efe15ef5f0fcc2fdd6b910405e78056b28c9b64e1feff5f13b8dce307e67cad", transaction_id: "", base_fee: 0, fee_rate: 200 },
            { capacity: 1_000_000, id: "0x2916x2", local_balance: 400_000, partner_public_key: "0276dfcb25dfd2f765cee20cef749479967aced11191c230e82efa1bda0ea3d355", transaction_id: "", base_fee: 0, fee_rate: 200 },
            /* eslint-enable max-len */
        ],
        ...getManagerMembers<"channels">(),
    },
    closedChannels: {
        data: [],
        ...getManagerMembers<"closedChannels">(),
    },
    nodes: {
        data: [
            { alias: "Node 1", id: "0x3609x2" },
            { alias: "Node 2", id: "0x1657x1" },
            { alias: "Node 3", id: "0x3609x1" },
            { alias: "Node 4", id: "0x2091x1" },
            { alias: "Node 5", id: "0x1657x0" },
            { alias: "Node 6", id: "0x2916x2" },
        ],
        ...getManagerMembers<"nodes">(),
    },
    forwards: {
        data: [
            {
                created_at: "2023-07-31T06:08:51.000Z",
                fee_mtokens: "4000",
                incoming_channel: "0x3609x2",
                outgoing_channel: "0x1657x1",
                mtokens: "35949000",
            },
            {
                created_at: "2023-07-31T06:08:56.000Z",
                fee_mtokens: "5000",
                incoming_channel: "0x3609x2",
                outgoing_channel: "0x1657x1",
                mtokens: "43497000",
            },
            {
                created_at: "2023-07-31T06:51:21.000Z",
                fee_mtokens: "7000",
                incoming_channel: "0x3609x1",
                outgoing_channel: "0x1657x1",
                mtokens: "59023000",
            },
            {
                created_at: "2023-07-31T09:06:05.000Z",
                fee_mtokens: "4000",
                incoming_channel: "0x3609x1",
                outgoing_channel: "0x1657x1",
                mtokens: "39186000",
            },
            {
                created_at: "2023-07-31T11:05:13.000Z",
                fee_mtokens: "7000",
                incoming_channel: "0x3609x1",
                outgoing_channel: "0x1657x1",
                mtokens: "61526000",
            },
            {
                created_at: "2023-07-31T13:56:09.000Z",
                fee_mtokens: "4000",
                incoming_channel: "0x3609x1",
                outgoing_channel: "0x1657x1",
                mtokens: "38508000",
            },
            {
                created_at: "2023-07-31T15:12:45.000Z",
                fee_mtokens: "10000",
                incoming_channel: "0x2091x1",
                outgoing_channel: "0x1657x0",
                mtokens: "49845000",
            },
            {
                created_at: "2023-07-31T15:14:27.000Z",
                fee_mtokens: "7000",
                incoming_channel: "0x2091x1",
                outgoing_channel: "0x1657x1",
                mtokens: "60316000",
            },
            {
                created_at: "2023-07-31T15:17:30.000Z",
                fee_mtokens: "3000",
                incoming_channel: "0x2091x1",
                outgoing_channel: "0x2916x2",
                mtokens: "48008000",
            },
            {
                created_at: "2023-07-31T15:20:16.000Z",
                fee_mtokens: "4000",
                incoming_channel: "0x2091x1",
                outgoing_channel: "0x2916x2",
                mtokens: "58089000",
            },
            {
                created_at: "2023-07-31T19:49:29.000Z",
                fee_mtokens: "7000",
                incoming_channel: "0x1234x2",
                outgoing_channel: "0x5678x1",
                mtokens: "100000000",
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
    transactions: {
        data: [],
        ...getManagerMembers<"transactions">(),
    },
    ...getManagerMembers<"channels" | "forwards" | "payments">(),
};

const verifyFlow = async (
    channels: ReadonlyMap<string, IChannelStats>,
    channelId: string,
    inMaxTokens: number,
    inCount: number,
    inTotalTokens: number,
    outMaxTokens: number,
    outCount: number,
    outTotalTokens: number,
// eslint-disable-next-line @typescript-eslint/max-params
) => {
    await it(channelId, () => {
        const channel = channels.get(channelId);
        assert(channel);
        const { inForwards, outForwards, history } = channel;
        assert(inForwards.maxTokens === inMaxTokens);
        assert(inForwards.count === inCount);
        assert(inForwards.totalTokens === inTotalTokens);
        assert(outForwards.maxTokens === outMaxTokens);
        assert(outForwards.count === outCount);
        assert(outForwards.totalTokens === outTotalTokens);

        let outTokens = 0;
        let inTokens = 0;

        for (const change of history) {
            if (change instanceof OutForward) {
                outTokens += change.amount;
                assert(change.fee);
                assert(change.inChannel);
            } else if (change instanceof InForward) {
                inTokens -= change.amount;
            }
        }

        assert(outTokens === outTotalTokens);
        assert(inTokens === inTotalTokens);
    });
};

await describe(NodeStats.name, async () => {
    await describe("channels", async () => {
        await describe("should contain the correct flows", async () => {
            const { channels } = NodeStats.get(nodeInfo);

            assert([...channels.keys()].length === nodeInfo.channels.data.length);
            await verifyFlow(channels, "0x3609x2", 43_502, 2, 79_455, 0, 0, 0);
            await verifyFlow(channels, "0x1657x1", 0, 0, 0, 61_526, 7, 338_005);
            await verifyFlow(channels, "0x3609x1", 61_533, 4, 198_265, 0, 0, 0);
            await verifyFlow(channels, "0x2091x1", 60_323, 4, 216_282, 0, 0, 0);
            await verifyFlow(channels, "0x1657x0", 0, 0, 0, 49_845, 1, 49_845);
            await verifyFlow(channels, "0x2916x2", 0, 0, 0, 58_089, 2, 106_097);
        });
    });
});

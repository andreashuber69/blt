// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import type { ChannelStats } from "./ChannelStats.js";
import { getNewChannelStats } from "./ChannelStats.js";
import type { INodeInfo } from "./info/NodeInfo.js";
import type { Forward } from "./lightning/getForwards.js";

export class NodeStats {
    public constructor({
        channels: { data: channels },
        nodes: { data: nodes },
        forwards: { data: forwards },
    }: INodeInfo) {
        const nodesMap = Object.fromEntries(nodes.map((n) => [n.id, n]));

        this.channelsImpl = Object.fromEntries(channels.map(
            // eslint-disable-next-line @typescript-eslint/naming-convention
            ({ id, capacity, local_balance, partner_public_key, remote_balance }) => [
                id,
                getNewChannelStats({
                    partnerAlias: nodesMap[id]?.alias,
                    capacity,
                    /* eslint-disable @typescript-eslint/naming-convention */
                    local_balance,
                    partner_public_key,
                    remote_balance,
                    /* eslint-enable @typescript-eslint/naming-convention */
                }),
            ],
        ));

        for (const forward of forwards) {
            this.updateStats("incomingForwards", forward);
            this.updateStats("outgoingForwards", forward);
        }
    }

    public get channels(): Readonly<Record<string, ChannelStats>> {
        return this.channelsImpl;
    }

    private static getAmounts(prop: "incomingForwards" | "outgoingForwards", tokens: number, fee: number) {
        return prop === "incomingForwards" ? { amount: -tokens - fee, fee } : { amount: tokens };
    }

    private readonly channelsImpl: Readonly<Record<string, ReturnType<typeof getNewChannelStats>>>;

    private updateStats(
        prop: "incomingForwards" | "outgoingForwards",
        {
            /* eslint-disable @typescript-eslint/naming-convention */
            created_at,
            fee,
            incoming_channel,
            outgoing_channel,
            tokens,
            /* eslint-enable @typescript-eslint/naming-convention */
        }: Forward,
    ) {
        const stats = this.channelsImpl[prop === "incomingForwards" ? incoming_channel : outgoing_channel];
        const forwardStats = stats?.[prop];

        if (forwardStats) {
            forwardStats.maxTokens = Math.max(forwardStats.maxTokens, tokens);
            ++forwardStats.count;
            forwardStats.totalTokens += tokens;

            stats.history.push({ time: created_at, ...NodeStats.getAmounts(prop, tokens, fee) });
        }
    }
}

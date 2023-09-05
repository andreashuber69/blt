// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import type { ChannelStats } from "./ChannelStats.js";
import { getNewChannelStats } from "./ChannelStats.js";
import type { INodeInfo } from "./info/NodeInfo.js";
import type { Forward } from "./lightning/getForwards.js";

type ChannelsImpl = Map<string, ReturnType<typeof getNewChannelStats>>;

export class NodeStats {
    public static get(
        {
            channels: { data: channels },
            nodes: { data: nodes },
            forwards: { data: forwards },
            payments: { data: payments },
        }: INodeInfo,
    ): INodeStats {
        const nodesMap = new Map(nodes.map((n) => [n.id, n]));

        const channelsImpl = new Map(channels.map(
            // eslint-disable-next-line @typescript-eslint/naming-convention
            ({ id, capacity, local_balance, partner_public_key, remote_balance }) => [
                id,
                getNewChannelStats({
                    partnerAlias: nodesMap.get(id)?.alias,
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
            NodeStats.updateStats(channelsImpl, "incomingForwards", forward);
            NodeStats.updateStats(channelsImpl, "outgoingForwards", forward);
        }

        // eslint-disable-next-line @typescript-eslint/naming-convention
        for (const { attempts, mtokens, fee_mtokens } of payments) {
            const tokens = Number(mtokens) / 1000;
            const fee = Number(fee_mtokens) / 1000;

            // eslint-disable-next-line @typescript-eslint/naming-convention
            for (const { is_confirmed, confirmed_at, route: { hops } } of attempts) {
                if (is_confirmed && confirmed_at) {
                    const outgoing = channelsImpl.get(hops.at(0)?.channel ?? "");

                    if (outgoing) {
                        outgoing.history.set(confirmed_at, { amount: tokens + fee });
                    }

                    const incoming = channelsImpl.get(hops.at(-1)?.channel ?? "");

                    if (incoming) {
                        incoming.history.set(confirmed_at, { amount: -tokens });
                    }
                }
            }
        }

        for (const channel of channelsImpl.values()) {
            channel.history = new Map([...channel.history].sort((a, b) => -a[0].localeCompare(b[0])));
        }

        return new NodeStats(channelsImpl);
    }

    private static updateStats(
        channelsImpl: ChannelsImpl,
        prop: "incomingForwards" | "outgoingForwards",
        {
            /* eslint-disable @typescript-eslint/naming-convention */
            created_at,
            fee_mtokens,
            incoming_channel,
            mtokens,
            outgoing_channel,
            /* eslint-enable @typescript-eslint/naming-convention */
        }: Forward,
    ) {
        const isOutgoing = prop === "outgoingForwards";
        const stats = channelsImpl.get(isOutgoing ? outgoing_channel : incoming_channel);
        const forwardStats = stats?.[prop];

        if (forwardStats) {
            const tokens = Number(mtokens) / 1000;
            const fee = Number(fee_mtokens) / 1000;
            forwardStats.maxTokens = Math.max(forwardStats.maxTokens, tokens);
            ++forwardStats.count;
            forwardStats.totalTokens += tokens;

            stats.history.set(
                created_at,
                { amount: isOutgoing ? tokens : -tokens - fee, ...(isOutgoing ? { fee } : {}) },
            );
        }
    }

    private constructor(public readonly channels: ReadonlyMap<string, ChannelStats>) {}
}

export type INodeStats = Pick<NodeStats, "channels">;

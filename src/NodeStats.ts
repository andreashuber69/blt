// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import type { ChannelStats } from "./ChannelStats.js";
import { getNewChannelStats } from "./ChannelStats.js";
import type { INodeInfo } from "./info/NodeInfo.js";
import type { Forward } from "./lightning/getForwards.js";

type ChannelsImpl = Readonly<Record<string, ReturnType<typeof getNewChannelStats>>>;

export class NodeStats {
    public static get(
        {
            channels: { data: channels },
            nodes: { data: nodes },
            forwards: { data: forwards },
            payments: { data: payments },
        }: INodeInfo,
    ): INodeStats {
        const nodesMap = Object.fromEntries(nodes.map((n) => [n.id, n]));

        const channelStats = Object.fromEntries(channels.map(
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
            NodeStats.updateStats(channelStats, "incomingForwards", forward);
            NodeStats.updateStats(channelStats, "outgoingForwards", forward);
        }

        for (const { attempts, tokens, fee } of payments) {
            const confirmed = attempts.filter((a) => a.is_confirmed)?.at(0);

            if (confirmed?.confirmed_at) {
                // eslint-disable-next-line @typescript-eslint/naming-convention
                const { confirmed_at, route: { hops } } = confirmed;
                const outgoing = channelStats[hops.at(0)?.channel ?? ""];

                if (outgoing) {
                    outgoing.history.push({ time: confirmed_at, amount: tokens + fee });
                }

                const incoming = channelStats[hops.at(-1)?.channel ?? ""];

                if (incoming) {
                    incoming.history.push({ time: confirmed_at, amount: -tokens });
                }
            }
        }

        for (const channel of Object.values(channelStats)) {
            channel.history.sort((a, b) => -a.time.localeCompare(b.time));
        }

        return new NodeStats(channelStats);
    }

    private static updateStats(
        channelsImpl: ChannelsImpl,
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
        const isOutgoing = prop === "outgoingForwards";
        const stats = channelsImpl[isOutgoing ? outgoing_channel : incoming_channel];
        const forwardStats = stats?.[prop];

        if (forwardStats) {
            forwardStats.maxTokens = Math.max(forwardStats.maxTokens, tokens);
            ++forwardStats.count;
            forwardStats.totalTokens += tokens;

            stats.history.push({
                time: created_at,
                amount: isOutgoing ? tokens : -tokens - fee,
                ...(isOutgoing ? { fee } : {}),
            });
        }
    }

    private constructor(public readonly channels: Readonly<Record<string, ChannelStats>>) {}
}

export type INodeStats = Pick<NodeStats, "channels">;

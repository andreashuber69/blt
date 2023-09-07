// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import type { BalanceChange, ChannelStats } from "./ChannelStats.js";
import { getNewChannelStats, IncomingForward, OutgoingForward, Payment } from "./ChannelStats.js";
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
            ({
                id,
                capacity,
                /* eslint-disable @typescript-eslint/naming-convention */
                local_balance,
                partner_public_key,
                remote_balance,
                base_fee,
                fee_rate,
                transaction_id,
                transaction_vout,
                /* eslint-enable @typescript-eslint/naming-convention */
            }) => [
                id,
                getNewChannelStats({
                    partnerAlias: nodesMap.get(id)?.alias,
                    capacity,
                    /* eslint-disable @typescript-eslint/naming-convention */
                    local_balance,
                    partner_public_key,
                    remote_balance,
                    base_fee,
                    fee_rate,
                    transaction_id,
                    transaction_vout,
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
                        this.add(outgoing.history, confirmed_at, new Payment(tokens + fee));
                    }

                    const incoming = channelsImpl.get(hops.at(-1)?.channel ?? "");

                    if (incoming) {
                        this.add(incoming.history, confirmed_at, new Payment(-tokens));
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
            const realTokens = isOutgoing ? tokens : tokens + fee;
            forwardStats.maxTokens = Math.max(forwardStats.maxTokens, realTokens);
            ++forwardStats.count;
            forwardStats.totalTokens += realTokens;

            this.add(
                stats.history,
                created_at,
                isOutgoing ? new OutgoingForward(realTokens, fee) : new IncomingForward(-realTokens, outgoing_channel),
            );
        }
    }

    private static add(history: Map<string, BalanceChange[]>, key: string, value: BalanceChange) {
        if (!history.get(key)?.push(value)) {
            history.set(key, [value]);
        }
    }

    private constructor(public readonly channels: ReadonlyMap<string, ChannelStats>) {}
}

export type INodeStats = Pick<NodeStats, "channels">;

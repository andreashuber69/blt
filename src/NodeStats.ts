// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import type { BalanceChange, ChannelStats } from "./ChannelStats.js";
import { getNewChannelStats, IncomingForward, OutgoingForward, Payment } from "./ChannelStats.js";
import type { ForwardsElement } from "./info/ForwardsRefresher.js";
import type { INodeInfo } from "./info/NodeInfo.js";

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
            ({ id, ...rest }) => [id, getNewChannelStats({ partnerAlias: nodesMap.get(id)?.alias, ...rest })],
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
                    this.add(this.getHistory(channelsImpl, hops.at(0)), confirmed_at, new Payment(tokens + fee));
                    this.add(this.getHistory(channelsImpl, hops.at(-1)), confirmed_at, new Payment(-tokens));
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
        }: ForwardsElement,
    ) {
        const isOut = prop === "outgoingForwards";
        const { [prop]: stats, history } = channelsImpl.get(isOut ? outgoing_channel : incoming_channel) ?? {};

        if (stats) {
            const tokens = Number(mtokens) / 1000;
            const fee = Number(fee_mtokens) / 1000;
            const realTokens = isOut ? tokens : tokens + fee;
            stats.maxTokens = Math.max(stats.maxTokens, realTokens);
            ++stats.count;
            stats.totalTokens += realTokens;

            this.add(
                history,
                created_at,
                isOut ? new OutgoingForward(realTokens, fee) : new IncomingForward(-realTokens, outgoing_channel),
            );
        }
    }

    private static getHistory(channelsImpl: ChannelsImpl, hop: { readonly channel: string } | undefined) {
        return channelsImpl.get(hop?.channel ?? "")?.history;
    }

    private static add(history: Map<string, BalanceChange[]> | undefined, key: string, value: BalanceChange) {
        if (history && !history.get(key)?.push(value)) {
            history.set(key, [value]);
        }
    }

    private constructor(public readonly channels: ReadonlyMap<string, ChannelStats>) {}
}

export type INodeStats = Pick<NodeStats, "channels">;

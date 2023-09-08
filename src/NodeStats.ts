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
            NodeStats.updateStats(channelsImpl.get(forward.incoming_channel), false, forward);
            NodeStats.updateStats(channelsImpl.get(forward.outgoing_channel), true, forward);
        }

        // eslint-disable-next-line @typescript-eslint/naming-convention
        for (const { attempts, confirmed_at } of payments) {
            // eslint-disable-next-line @typescript-eslint/naming-convention
            for (const { is_confirmed, route } of attempts) {
                if (is_confirmed) {
                    const { tokens, fee } = this.getTokens(route);
                    this.add(this.getHistory(channelsImpl, route.hops.at(0)), confirmed_at, new Payment(tokens));
                    // eslint-disable-next-line max-len
                    this.add(this.getHistory(channelsImpl, route.hops.at(-1)), confirmed_at, new Payment(-tokens + fee));
                }
            }
        }

        for (const channel of channelsImpl.values()) {
            channel.history = new Map([...channel.history].sort((a, b) => -a[0].localeCompare(b[0])));
        }

        return new NodeStats(channelsImpl);
    }

    private static updateStats(
        channelStats: ReturnType<typeof getNewChannelStats> | undefined,
        isOut: boolean,
        forward: ForwardsElement,
    ) {
        if (channelStats) {
            const { [isOut ? "outgoingForwards" : "incomingForwards"]: forwardStats, history } = channelStats;
            const { tokens, fee } = this.getTokens(forward);
            const real = isOut ? tokens : tokens + fee;
            forwardStats.maxTokens = Math.max(forwardStats.maxTokens, real);
            ++forwardStats.count;
            forwardStats.totalTokens += real;
            // eslint-disable-next-line @typescript-eslint/naming-convention
            const { created_at, outgoing_channel } = forward;
            const change = isOut ? new OutgoingForward(real, fee) : new IncomingForward(-real, outgoing_channel);
            this.add(history, created_at, change);
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

    // eslint-disable-next-line @typescript-eslint/naming-convention
    private static getTokens({ fee_mtokens, mtokens }: { readonly fee_mtokens: string; readonly mtokens: string }) {
        return { tokens: Number(mtokens) / 1000, fee: Number(fee_mtokens) / 1000 };
    }

    private constructor(public readonly channels: ReadonlyMap<string, ChannelStats>) {}
}

export type INodeStats = Pick<NodeStats, "channels">;

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
            // eslint-disable-next-line @typescript-eslint/naming-convention
            const { incoming_channel, outgoing_channel } = forward;
            const incomingStats = channelsImpl.get(incoming_channel);
            NodeStats.updateStats(incomingStats, false, forward);
            const outgoingStats = channelsImpl.get(outgoing_channel);
            NodeStats.updateStats(outgoingStats, true, forward);
        }

        // eslint-disable-next-line @typescript-eslint/naming-convention
        for (const { attempts, confirmed_at } of payments) {
            // eslint-disable-next-line @typescript-eslint/naming-convention
            for (const { is_confirmed, route } of attempts) {
                if (is_confirmed) {
                    const { rawTokens, fee } = this.getTokens(route);
                    const outgoingId = route.hops.at(0)?.channel;
                    this.add(this.getHistory(channelsImpl, outgoingId), confirmed_at, new Payment(rawTokens));
                    const incomingId = route.hops.at(-1)?.channel;
                    this.add(this.getHistory(channelsImpl, incomingId), confirmed_at, new Payment(-rawTokens + fee));
                }
            }
        }

        for (const channel of channelsImpl.values()) {
            channel.history = new Map([...channel.history].sort((a, b) => -a[0].localeCompare(b[0])));
        }

        return new NodeStats(channelsImpl);
    }

    private static updateStats(channelStats: ChannelStats | undefined, isOut: boolean, forward: ForwardsElement) {
        if (channelStats) {
            const { [isOut ? "outgoingForwards" : "incomingForwards"]: forwardStats, history } = channelStats;
            const { rawTokens, fee } = this.getTokens(forward);
            const tokens = isOut ? rawTokens : rawTokens + fee;
            forwardStats.maxTokens = Math.max(forwardStats.maxTokens, tokens);
            ++forwardStats.count;
            forwardStats.totalTokens += tokens;
            // eslint-disable-next-line @typescript-eslint/naming-convention
            const { created_at, outgoing_channel } = forward;

            const change =
                isOut ? new OutgoingForward(tokens, fee) : new IncomingForward(-tokens, fee, outgoing_channel);

            this.add(history, created_at, change);
        }
    }

    private static getHistory(channelsImpl: ChannelsImpl, channel: string | undefined) {
        return channelsImpl.get(channel ?? "")?.history;
    }

    private static add(history: Map<string, BalanceChange[]> | undefined, key: string, value: BalanceChange) {
        if (history && !history.get(key)?.push(value)) {
            history.set(key, [value]);
        }
    }

    // eslint-disable-next-line @typescript-eslint/naming-convention
    private static getTokens({ fee_mtokens, mtokens }: { readonly fee_mtokens: string; readonly mtokens: string }) {
        return { rawTokens: Number(mtokens) / 1000, fee: Number(fee_mtokens) / 1000 };
    }

    private constructor(public readonly channels: ReadonlyMap<string, ChannelStats>) {}
}

export type INodeStats = Pick<NodeStats, "channels">;

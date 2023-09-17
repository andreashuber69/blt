// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import type { MutableForwardStats } from "./ChannelStats.js";
import { ChannelStats, IncomingForward, OutgoingForward, Payment } from "./ChannelStats.js";
import type { INodeInfo } from "./info/NodeInfo.js";

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
            // TODO: Consider getting rid of the map, use array instead
            ({ id, ...rest }) => [id, new ChannelStats({ partnerAlias: nodesMap.get(id)?.alias, ...rest })],
        ));

        for (const forward of forwards) {
            // eslint-disable-next-line @typescript-eslint/naming-convention
            const { created_at, incoming_channel, outgoing_channel } = forward;
            const { rawTokens, fee } = this.getTokens(forward);
            const incomingStats = channelsImpl.get(incoming_channel);
            NodeStats.updateStats(incomingStats?.incomingForwards, rawTokens + fee);
            incomingStats?.addToHistory(new IncomingForward(created_at, -rawTokens - fee, fee, outgoing_channel));
            const outgoingStats = channelsImpl.get(outgoing_channel);
            NodeStats.updateStats(outgoingStats?.outgoingForwards, rawTokens);
            outgoingStats?.addToHistory(new OutgoingForward(created_at, rawTokens, fee));
        }

        // eslint-disable-next-line @typescript-eslint/naming-convention
        for (const { attempts, confirmed_at } of payments) {
            // eslint-disable-next-line @typescript-eslint/naming-convention
            for (const { is_confirmed, route } of attempts) {
                if (is_confirmed) {
                    const { rawTokens, fee } = this.getTokens(route);
                    const outgoingStats = channelsImpl.get(route.hops.at(0)?.channel ?? "");
                    outgoingStats?.addToHistory(new Payment(confirmed_at, rawTokens));
                    const incomingStats = channelsImpl.get(route.hops.at(-1)?.channel ?? "");
                    incomingStats?.addToHistory(new Payment(confirmed_at, -rawTokens + fee));
                }
            }
        }

        return new NodeStats(channelsImpl);
    }

    private static updateStats(forwardStats: MutableForwardStats | undefined, tokens: number) {
        if (forwardStats) {
            forwardStats.maxTokens = Math.max(forwardStats.maxTokens, tokens);
            ++forwardStats.count;
            forwardStats.totalTokens += tokens;
        }
    }

    // eslint-disable-next-line @typescript-eslint/naming-convention
    private static getTokens({ fee_mtokens, mtokens }: { readonly fee_mtokens: string; readonly mtokens: string }) {
        return { rawTokens: Number(mtokens) / 1000, fee: Number(fee_mtokens) / 1000 };
    }

    private constructor(public readonly channels: ReadonlyMap<string, ChannelStats>) {}
}

export type INodeStats = Pick<NodeStats, "channels">;

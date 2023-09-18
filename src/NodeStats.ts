// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import { ChannelStats } from "./ChannelStats.js";
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
            ({ id, ...rest }) => [id, new ChannelStats({ id, partnerAlias: nodesMap.get(id)?.alias, ...rest })],
        ));

        for (const forward of forwards) {
            // eslint-disable-next-line @typescript-eslint/naming-convention
            const { created_at, incoming_channel, outgoing_channel } = forward;
            const { rawTokens, fee } = this.getTokens(forward);
            const incomingStats = channelsImpl.get(incoming_channel);
            incomingStats?.addIncomingForward(created_at, -rawTokens - fee, fee, outgoing_channel);
            const outgoingStats = channelsImpl.get(outgoing_channel);
            outgoingStats?.addOutgoingForward(created_at, rawTokens, fee);
        }

        // eslint-disable-next-line @typescript-eslint/naming-convention
        for (const { attempts, confirmed_at } of payments) {
            // eslint-disable-next-line @typescript-eslint/naming-convention
            for (const { is_confirmed, route } of attempts) {
                if (is_confirmed) {
                    const { rawTokens, fee } = this.getTokens(route);
                    const outgoingStats = channelsImpl.get(route.hops.at(0)?.channel ?? "");
                    outgoingStats?.addPayment(confirmed_at, rawTokens);
                    const incomingStats = channelsImpl.get(route.hops.at(-1)?.channel ?? "");
                    incomingStats?.addPayment(confirmed_at, -rawTokens + fee);
                }
            }
        }

        return new NodeStats(channelsImpl);
    }

    // eslint-disable-next-line @typescript-eslint/naming-convention
    private static getTokens({ fee_mtokens, mtokens }: { readonly fee_mtokens: string; readonly mtokens: string }) {
        return { rawTokens: Number(mtokens) / 1000, fee: Number(fee_mtokens) / 1000 };
    }

    private constructor(public readonly channels: ReadonlyMap<string, ChannelStats>) {}
}

export type INodeStats = Pick<NodeStats, "channels">;

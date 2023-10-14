// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import type { IChannelStats } from "./ChannelStats.js";
import { ChannelStats } from "./ChannelStats.js";
import type { INodeInfo } from "./info/NodeInfo.js";

export class NodeStats {
    public static get(
        {
            channels: { data: channels },
            closedChannels: { data: closedChannels },
            nodes: { data: nodes },
            forwards: { data: forwards, days },
            payments: { data: payments },
        }: INodeInfo,
    ): INodeStats {
        const nodesMap = new Map(nodes.map((n) => [n.id, n]));

        const channelsImpl = new Map(channels.map(
            ({ id, ...rest }) => {
                const node = nodesMap.get(id);

                const partnerFeeRate = node?.channels?.
                    find((c) => c.id === id)?.policies?.
                    find((p) => p.public_key === rest.partner_public_key)?.
                    fee_rate;

                return [id, new ChannelStats({ id, partnerAlias: node?.alias, partnerFeeRate, ...rest })];
            },
        ));

        const closedChannelIds = new Set(closedChannels.map((c) => c.id));

        for (const forward of forwards) {
            // eslint-disable-next-line @typescript-eslint/naming-convention
            const { created_at, incoming_channel, outgoing_channel } = forward;
            const { rawTokens, fee } = this.getTokens(forward);
            const inChannel = channelsImpl.get(incoming_channel);
            const outChannel = channelsImpl.get(outgoing_channel);
            inChannel?.addInForward(created_at, -rawTokens - fee, fee, outChannel);
            outChannel?.addOutForward(created_at, rawTokens, fee, inChannel);
        }

        // eslint-disable-next-line @typescript-eslint/naming-convention
        for (const { attempts, confirmed_at } of payments) {
            // eslint-disable-next-line @typescript-eslint/naming-convention
            for (const { is_confirmed, route } of attempts) {
                if (is_confirmed) {
                    const { rawTokens, fee } = this.getTokens(route);
                    const outId = route.hops.at(0)?.channel ?? "";
                    const outChannel = channelsImpl.get(outId);
                    const inId = route.hops.at(-1)?.channel ?? "";
                    const inChannel = channelsImpl.get(inId);

                    // Make sure that rebalances are recognized as such even if one of the involved channels has been
                    // closed.
                    if ((outChannel ?? closedChannelIds.has(outId)) && (inChannel ?? closedChannelIds.has(inId))) {
                        outChannel?.addOutRebalance(confirmed_at, rawTokens, fee);
                        inChannel?.addInRebalance(confirmed_at, -rawTokens + fee, fee);
                    } else {
                        outChannel?.addPayment(confirmed_at, rawTokens);
                        inChannel?.addPayment(confirmed_at, -rawTokens + fee);
                    }
                }
            }
        }

        return new NodeStats(channelsImpl, days);
    }

    // eslint-disable-next-line @typescript-eslint/naming-convention
    private static getTokens({ fee_mtokens, mtokens }: { readonly fee_mtokens: string; readonly mtokens: string }) {
        return { rawTokens: Number(mtokens) / 1000, fee: Number(fee_mtokens) / 1000 };
    }

    private constructor(public readonly channels: ReadonlyMap<string, IChannelStats>, public readonly days: number) {}
}

/** See {@linkcode NodeStats}. */
export type INodeStats = Pick<NodeStats, "channels" | "days">;

// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import type { ChannelStats } from "./ChannelStats.js";
import { getNewChannelStats } from "./ChannelStats.js";
import type { INodeInfo } from "./info/NodeInfo.js";

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

        // eslint-disable-next-line @typescript-eslint/naming-convention
        for (const { incoming_channel, outgoing_channel, tokens } of [...forwards].reverse()) {
            const incoming = this.channelsImpl[incoming_channel];
            const outgoing = this.channelsImpl[outgoing_channel];

            // A forward should no longer appear in the statistics if one or both channels have been closed.
            if (incoming && outgoing) {
                incoming.incomingForwards.maxTokens = Math.max(incoming.incomingForwards.maxTokens, tokens);
                ++incoming.incomingForwards.count;
                incoming.incomingForwards.totalTokens += tokens;

                outgoing.outgoingForwards.maxTokens = Math.max(outgoing.outgoingForwards.maxTokens, tokens);
                ++outgoing.outgoingForwards.count;
                outgoing.outgoingForwards.totalTokens += tokens;
            }
        }
    }

    public get channels(): Readonly<Record<string, ChannelStats>> {
        return this.channelsImpl;
    }

    private readonly channelsImpl: Readonly<Record<string, ReturnType<typeof getNewChannelStats>>>;
}

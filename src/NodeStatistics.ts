// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import type { NodeInfo } from "./getNodeInfo.js";

export interface ChannelStatistics {
    outgoingTokens: number;
    incomingTokens: number;
}

export class NodeStatistics {
    public constructor({ channels: { data: channels }, forwards: { data: forwards } }: NodeInfo) {
        this.channelStatisticsImpl =
            Object.fromEntries(channels.map(({ id }) => [id, { outgoingTokens: 0, incomingTokens: 0 }]));

        // eslint-disable-next-line @typescript-eslint/naming-convention
        for (const { incoming_channel, outgoing_channel, tokens } of forwards) {
            const incoming = this.channelStatisticsImpl[incoming_channel];

            if (incoming) {
                incoming.incomingTokens += tokens;
            }

            const outgoing = this.channelStatisticsImpl[outgoing_channel];

            if (outgoing) {
                outgoing.outgoingTokens += tokens;
            }
        }
    }

    public get channelStatistics(): Readonly<Record<string, Readonly<ChannelStatistics>>> {
        return this.channelStatisticsImpl;
    }

    private readonly channelStatisticsImpl: Readonly<Record<string, ChannelStatistics>>;
}

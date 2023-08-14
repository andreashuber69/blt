// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
// eslint-disable-next-line max-classes-per-file
import type { NodeInfo } from "./getNodeInfo.js";

interface Forwards {
    incomingPayments: number;
    incomingTokens: number;
    outgoingPayments: number;
    outgoingTokens: number;
}

class ChannelStatisticsImpl implements ChannelStatistics {
    public readonly forwards = { incomingPayments: 0, incomingTokens: 0, outgoingPayments: 0, outgoingTokens: 0 };
}

export interface ChannelStatistics {
    readonly forwards: Readonly<Forwards>;
}

export class NodeStatistics {
    public constructor({ channels: { data: channels }, forwards: { data: forwards } }: NodeInfo) {
        this.channelStatisticsImpl = Object.fromEntries(channels.map(({ id }) => [id, new ChannelStatisticsImpl()]));

        // eslint-disable-next-line @typescript-eslint/naming-convention
        for (const { incoming_channel, outgoing_channel, tokens } of forwards) {
            const incoming = this.channelStatisticsImpl[incoming_channel];
            const outgoing = this.channelStatisticsImpl[outgoing_channel];

            // A forward should no longer appear in the statistics if one or both channels have been closed.
            if (incoming && outgoing) {
                ++incoming.forwards.incomingPayments;
                incoming.forwards.incomingTokens += tokens;
                ++outgoing.forwards.outgoingPayments;
                outgoing.forwards.outgoingTokens += tokens;
            }
        }
    }

    public get channelStatistics(): Readonly<Record<string, ChannelStatistics>> {
        return this.channelStatisticsImpl;
    }

    private readonly channelStatisticsImpl: Readonly<Record<string, ChannelStatisticsImpl>>;
}

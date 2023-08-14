// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import type { ChannelStats } from "./ChannelStats.js";
import { getNewChannelStats } from "./ChannelStats.js";
import type { NodeInfo } from "./getNodeInfo.js";

export class NodeStatistics {
    public constructor({ channels: { data: channels }, forwards: { data: forwards } }: NodeInfo) {
        this.channelsImpl = Object.fromEntries(channels.map(({ id }) => [id, getNewChannelStats()]));

        // eslint-disable-next-line @typescript-eslint/naming-convention
        for (const { incoming_channel, outgoing_channel, tokens } of forwards) {
            const incoming = this.channelsImpl[incoming_channel];
            const outgoing = this.channelsImpl[outgoing_channel];

            // A forward should no longer appear in the statistics if one or both channels have been closed.
            if (incoming && outgoing) {
                ++incoming.forwards.incomingCount;
                incoming.forwards.incomingTokens += tokens;
                ++outgoing.forwards.outgoingCount;
                outgoing.forwards.outgoingTokens += tokens;
            }
        }
    }

    public get channels(): Readonly<Record<string, ChannelStats>> {
        return this.channelsImpl;
    }

    private readonly channelsImpl: Readonly<Record<string, ReturnType<typeof getNewChannelStats>>>;
}

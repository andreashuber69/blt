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
            this.updateStats("incomingForwards", this.channelsImpl[incoming_channel] ?? {}, tokens);
            this.updateStats("outgoingForwards", this.channelsImpl[outgoing_channel] ?? {}, tokens);
        }
    }

    public get channels(): Readonly<Record<string, ChannelStats>> {
        return this.channelsImpl;
    }

    private readonly channelsImpl: Readonly<Record<string, ReturnType<typeof getNewChannelStats>>>;

    private updateStats(
        prop: "incomingForwards" | "outgoingForwards",
        { [prop]: stats }: Partial<(typeof this.channelsImpl)[string]>,
        tokens: number,
    ) {
        if (stats) {
            stats.maxTokens = Math.max(stats.maxTokens, tokens);
            ++stats.count;
            stats.totalTokens += tokens;
        }
    }
}

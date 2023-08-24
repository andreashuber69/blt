// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import type { ForwardStats } from "./ForwardStats.js";
import { getNewForwardStats } from "./ForwardStats.js";
import type { Channel } from "./lightning/getChannels.js";

type ChannelProperties = Omit<Channel, "id"> & { readonly partnerAlias?: string | undefined };

export interface ChannelStats extends ChannelProperties {
    readonly forwards: ForwardStats;
}

export const getNewChannelStats = (props: ChannelProperties) => ({
    ...props,
    forwards: getNewForwardStats(),
});

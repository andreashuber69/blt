// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import type { ForwardStats } from "./ForwardStats.js";
import { getNewForwardStats } from "./ForwardStats.js";
import type { Channel } from "./lightning/getChannels.js";

export interface ChannelStats extends Omit<Channel, "id"> {
    readonly forwards: ForwardStats;
}

export const getNewChannelStats = (props: Omit<Channel, "id">) => ({
    ...props,
    forwards: getNewForwardStats(),
});

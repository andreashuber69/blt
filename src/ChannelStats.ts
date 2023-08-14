// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import type { ForwardStats } from "./ForwardStats.js";
import { getNewForwardStats } from "./ForwardStats.js";

export interface ChannelStats {
    readonly forwards: ForwardStats;
}

export const getNewChannelStats = () => new class implements ChannelStats {
    public readonly forwards = getNewForwardStats();
}();

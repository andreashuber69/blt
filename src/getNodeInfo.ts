// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import type { AuthenticatedLightningArgs, GetIdentityResult } from "lightning";
import { getIdentity } from "lightning";
import type { Channel } from "./Channel.js";
import { ChannelsRefresherArgs } from "./ChannelsRefresherArgs.js";
import { createRefresher } from "./createRefresher.js";
import type { Refresher } from "./createRefresher.js";
import type { Forward } from "./Forward.js";
import { ForwardsRefresherArgs } from "./ForwardsRefresherArgs.js";
import type { Identity } from "./Identity.js";
import type { TimeBoundArgs } from "./PartialRefresherArgs.js";
import type { Payment } from "./Payment.js";
import { PaymentsRefresherArgs } from "./PaymentsRefresherArgs.js";

class NodeInfoImpl implements NodeInfo {
    public constructor(
        public readonly identity: GetIdentityResult,
        public readonly channels: Refresher<"channels", Channel[]>,
        public readonly forwards: Refresher<"forwards", Forward[]>,
        public readonly payments: Refresher<"payments", Payment[]>,
    ) {}
}

/**
 * Provides various information about a node.
 * @description All time-bound data (like {@link NodeInfo.forwards}) will be sorted earliest to latest. Apart from
 * being sorted, the data is provided as it came from LND. Further sanitation will be necessary, for example, a forward
 * may refer to a channel that is no longer open and will thus not appear in {@link NodeInfo.channels}.
 */
export interface NodeInfo {
    readonly identity: Identity;

    /** The currently open channels. */
    readonly channels: Refresher<"channels", Channel[]>;

    /** The forwards routed through the node. */
    readonly forwards: Refresher<"forwards", Forward[]>;

    /** The payments made from the node. */
    readonly payments: Refresher<"payments", Payment[]>;
}

/**
 * Gets information about the node.
 * @param args The authenticated LND API object, optionally combined with a number how far back historical data should
 * be retrieved. The default is 14 days.
 */
export const getNodeInfo = async (args: AuthenticatedLightningArgs<Partial<TimeBoundArgs>>): Promise<NodeInfo> => {
    const sanitized = { days: 14, ...args };

    if (typeof sanitized.days !== "number" || sanitized.days <= 0) {
        throw new Error(`args.days is invalid: ${args.days}.`);
    }

    return new NodeInfoImpl(
        await getIdentity(sanitized),
        await createRefresher(new ChannelsRefresherArgs(sanitized)),
        await createRefresher(new ForwardsRefresherArgs(sanitized)),
        await createRefresher(new PaymentsRefresherArgs(sanitized)),
    );
};

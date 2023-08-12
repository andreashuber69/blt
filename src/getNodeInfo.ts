// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import type { AuthenticatedLightningArgs } from "lightning";
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

const refresherNames = ["channels", "forwards", "payments"] as const;

type RefresherName = (typeof refresherNames)[number];

class NodeInfoImpl implements NodeInfo {
    public constructor(
        public readonly identity: Identity,
        public readonly channels: Refresher<"channels", Channel[]>,
        public readonly forwards: Refresher<"forwards", Forward[]>,
        public readonly payments: Refresher<"payments", Payment[]>,
    ) {}

    public onChanged(listener: (name: RefresherName) => void) {
        return this.forEachRefresher((refresher) => refresher.onChanged(listener));
    }

    public onError(listener: (error: unknown) => void) {
        return this.forEachRefresher((refresher) => refresher.onError(listener));
    }

    public removeAllListeners() {
        return this.forEachRefresher((refresher) => refresher.removeAllListeners());
    }

    private forEachRefresher(callback: (refresher: NodeInfo[RefresherName]) => void) {
        for (const refresherName of refresherNames) {
            callback(this[refresherName]);
        }

        return this;
    }
}

type RefresherProperty<Name extends RefresherName, Data> = {
    readonly [name in Name]: Refresher<Name, Data>;
};

/**
 * Provides various information about a node.
 * @description All time-bound data (like {@linkcode NodeInfo.forwards}) will be sorted earliest to latest. Apart from
 * being sorted, the data is provided as it came from LND. Further sanitation will be necessary, for example, a forward
 * may refer to a channel that is no longer open and will thus not appear in {@linkcode NodeInfo.channels}.
 */
export interface NodeInfo extends
    RefresherProperty<"channels", Channel[]>,
    RefresherProperty<"forwards", Forward[]>,
    RefresherProperty<"payments", Payment[]> {
    readonly identity: Identity;

    /**
     * Calls {@linkcode Refresher.onChanged} for all {@linkcode Refresher} typed properties, forwarding `listener`.
     * @description When `listener` is called, {@linkcode Refresher.data} of the {@linkcode Refresher} named `name` has
     * changed.
     */
    readonly onChanged: (listener: (name: RefresherName) => void) => this;

    /**
     * Calls {@linkcode Refresher.onError} for all {@linkcode Refresher} typed properties, forwarding `listener`.
     * @description When `listener` is called, client code dependent on being notified about changes should discard this
     * object and create a new one via {@linkcode getNodeInfo}.
     */
    readonly onError: (listener: (error: unknown) => void) => this;

    /** Calls {@linkcode Refresher.removeAllListeners} for all {@linkcode Refresher} typed properties. */
    readonly removeAllListeners: () => this;
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

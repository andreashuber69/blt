// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import type { AuthenticatedLightningArgs } from "lightning";
import { getIdentity } from "lightning";

import type { Channel } from "./Channel.js";
import { ChannelsRefresherArgs } from "./ChannelsRefresherArgs.js";
import type { Forward } from "./Forward.js";
import { ForwardsRefresherArgs } from "./ForwardsRefresherArgs.js";
import type { Identity } from "./Identity.js";
import type { Payment } from "./Payment.js";
import { PaymentsRefresherArgs } from "./PaymentsRefresherArgs.js";
import type { IRefresher } from "./Refresher.js";
import { Refresher } from "./Refresher.js";

const refresherNames = ["channels", "forwards", "payments"] as const;

type RefresherName = (typeof refresherNames)[number];

class NodeInfoImpl implements NodeInfo {
    public constructor(
        public readonly identity: Identity,
        public readonly channels: IRefresher<"channels", Channel[]>,
        public readonly forwards: IRefresher<"forwards", Forward[]>,
        public readonly payments: IRefresher<"payments", Payment[]>,
    ) {}

    public onChanged(listener: (name: RefresherName) => void) {
        this.forEachRefresher((refresher) => refresher.onChanged(listener));
    }

    public onError(listener: (error: unknown) => void) {
        this.forEachRefresher((refresher) => refresher.onError(listener));
    }

    public removeAllListeners() {
        this.forEachRefresher((refresher) => refresher.removeAllListeners());
    }

    private forEachRefresher(callback: (refresher: NodeInfo[RefresherName]) => void) {
        for (const refresherName of refresherNames) {
            callback(this[refresherName]);
        }
    }
}

type RefresherProperty<Name extends RefresherName, Data> = {
    readonly [name in Name]: IRefresher<Name, Data>;
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
    readonly onChanged: (listener: (name: RefresherName) => void) => void;

    /**
     * Calls {@linkcode Refresher.onError} for all {@linkcode Refresher} typed properties, forwarding `listener`.
     * @description When `listener` is called, client code dependent on being notified about changes should discard this
     * object and create a new one via {@linkcode getNodeInfo}.
     */
    readonly onError: (listener: (error: unknown) => void) => void;

    /** Calls {@linkcode Refresher.removeAllListeners} for all {@linkcode Refresher} typed properties. */
    readonly removeAllListeners: () => void;
}

/**
 * Gets information about the node.
 * @param args See properties for details.
 * @param args.lndArgs The {@linkcode AuthenticatedLightningArgs} of the node the data should be retrieved from.
 * @param args.delayMilliseconds The amount of time a refresh operation should be delayed after a change has been
 * detected.
 * @param args.days The number of days in the past time-bound data should be retrieved.
 */
export const getNodeInfo = async (args: {
    readonly lndArgs: AuthenticatedLightningArgs;
    readonly delayMilliseconds?: number;
    readonly days?: number;
}): Promise<NodeInfo> => new NodeInfoImpl(
    await getIdentity(args.lndArgs),
    await Refresher.create(new ChannelsRefresherArgs(args)),
    await Refresher.create(new ForwardsRefresherArgs(args)),
    await Refresher.create(new PaymentsRefresherArgs(args)),
);

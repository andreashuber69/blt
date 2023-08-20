// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import type { AuthenticatedLightningArgs } from "lightning";
import { getIdentity } from "lightning";

import type { Channel } from "../lightning/getChannels.js";
import type { Forward } from "../lightning/getForwards.js";
import type { Payment } from "../lightning/getPayments.js";
import type { Identity } from "../lightning/Identity.js";
import { ChannelsRefresherArgs } from "./ChannelsRefresherArgs.js";
import { ForwardsRefresherArgs } from "./ForwardsRefresherArgs.js";
import { PaymentsRefresherArgs } from "./PaymentsRefresherArgs.js";
import type { IRefresherArgs } from "./RefresherArgs.js";
import { RefresherArgs } from "./RefresherArgs.js";

const refresherNames = ["channels", "forwards", "payments"] as const;

type RefresherName = (typeof refresherNames)[number];

type RefresherProperty<Name extends RefresherName, Data> = {
    readonly [name in Name]: IRefresherArgs<Name, Data>;
};

type PropertyNames = "channels" | "forwards" | "identity" | "onChanged" | "onError" | "payments" | "removeAllListeners";

/**
 * Provides various information about a node.
 * @description All time-bound data (like {@linkcode NodeInfo.forwards}) will be sorted earliest to latest. Apart
 * from being sorted, the data is provided as it came from LND. Further sanitation will be necessary, for example, a
 * forward may refer to a channel that is no longer open and will thus not appear in {@linkcode NodeInfo.channels}.
 */
export class NodeInfo implements
    RefresherProperty<"channels", Channel[]>,
    RefresherProperty<"forwards", Forward[]>,
    RefresherProperty<"payments", Payment[]> {
    /**
     * Gets information about a node.
     * @param args See properties for details.
     * @param args.lndArgs The {@linkcode AuthenticatedLightningArgs} of the node the data should be retrieved from.
     * @param args.delayMilliseconds The amount of time a refresh operation should be delayed after a change has been
     * detected.
     * @param args.days The number of days in the past time-bound data should be retrieved.
     */
    public static async get(args: {
        readonly lndArgs: AuthenticatedLightningArgs;
        readonly delayMilliseconds?: number;
        readonly days?: number;
    }): Promise<INodeInfo> {
        return new NodeInfo(
            await getIdentity(args.lndArgs),
            await RefresherArgs.create(ChannelsRefresherArgs, args),
            await RefresherArgs.create(ForwardsRefresherArgs, args),
            await RefresherArgs.create(PaymentsRefresherArgs, args),
        );
    }

    /**
     * Calls {@linkcode IRefresherArgs.onChanged} for all {@linkcode IRefresherArgs} typed properties, forwarding
     * `listener`.
     * @description When `listener` is called, {@linkcode IRefresherArgs.data} of the {@linkcode IRefresherArgs} named
     * `name` might have changed.
     * @param listener The listener to add.
     */
    public onChanged(listener: (name: RefresherName) => void) {
        this.forEachRefresher((refresher) => refresher.onChanged(listener));
    }

    /**
     * Calls {@linkcode IRefresherArgs.onError} for all {@linkcode IRefresherArgs} typed properties, forwarding
     * `listener`.
     * @description When `listener` is called, client code dependent on being notified about changes should discard this
     * object and create a new one via {@linkcode NodeInfo.get}.
     * @param listener The listener to add.
     */
    public onError(listener: (error: unknown) => void) {
        this.forEachRefresher((refresher) => refresher.onError(listener));
    }

    /** Calls {@linkcode IRefresherArgs.removeAllListeners} for all {@linkcode IRefresherArgs} typed properties. */
    public removeAllListeners() {
        this.forEachRefresher((refresher) => refresher.removeAllListeners());
    }

    private constructor(
        public readonly identity: Identity,
        public readonly channels: IRefresherArgs<"channels", Channel[]>,
        public readonly forwards: IRefresherArgs<"forwards", Forward[]>,
        public readonly payments: IRefresherArgs<"payments", Payment[]>,
    ) {}

    private forEachRefresher(callback: (refresher: NodeInfo[RefresherName]) => void) {
        for (const refresherName of refresherNames) {
            callback(this[refresherName]);
        }
    }
}

/** See {@linkcode NodeInfo}. */
export type INodeInfo = Pick<NodeInfo, PropertyNames>;

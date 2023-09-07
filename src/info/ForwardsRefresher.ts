// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import type { AuthenticatedLightningArgs, SubscribeToForwardsForwardEvent } from "lightning";
import { subscribeToForwards } from "lightning";

import type { Forward } from "../lightning/getForwards.js";
import { getForwards } from "../lightning/getForwards.js";
import { PartialRefresher } from "./PartialRefresher.js";
import type { IPartialRefresher } from "./PartialRefresher.js";
import type { Emitters } from "./Refresher.js";

type ForwardsEmitters = Emitters<"forwards">;

export interface IForwardsRefresherArgs {
    /** The {@linkcode AuthenticatedLightningArgs} of the node the data should be retrieved from. */
    readonly lndArgs: AuthenticatedLightningArgs;

    /** The length of time each refresh and notify operation will be delayed after a change has been detected. */
    readonly delayMilliseconds?: number;

    /** The number of days in the past forwards should be retrieved. */
    readonly days?: number;
}

export type ForwardsElement = Forward;

/** Implements {@linkcode IPartialRefresher} for forwards. */
export class ForwardsRefresher extends PartialRefresher<"forwards", ForwardsElement, ForwardsEmitters> {
    /**
     * Creates a new object implementing {@linkcode IPartialRefresher} for forwards.
     * @param args See {@linkcode IForwardsRefresherArgs}.
     */
    public static async create(args: IForwardsRefresherArgs) {
        return await this.initPartial(new ForwardsRefresher(args));
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    protected override getDataRange(lndArgs: AuthenticatedLightningArgs, after: string, before: string) {
        return getForwards({ ...lndArgs, after, before });
    }

    protected override equals(a: ForwardsElement, b: ForwardsElement) {
        return a.created_at === b.created_at && a.fee_mtokens === b.fee_mtokens && a.mtokens === b.mtokens &&
            a.incoming_channel === b.incoming_channel && a.outgoing_channel === b.outgoing_channel;
    }

    protected override onServerChanged({ forwards }: ForwardsEmitters, listener: () => void) {
        forwards.on("forward", (e: SubscribeToForwardsForwardEvent) => {
            if (e.is_confirmed) {
                listener();
            }
        });
    }

    protected override createServerEmitters(lndArgs: AuthenticatedLightningArgs) {
        return { forwards: subscribeToForwards(lndArgs) } as const;
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    private constructor(args: IForwardsRefresherArgs) {
        super({ ...args, name: "forwards" });
    }
}

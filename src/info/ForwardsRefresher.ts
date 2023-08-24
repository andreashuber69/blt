// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import type { EventEmitter } from "node:events";
import type { AuthenticatedLightningArgs, SubscribeToForwardsForwardEvent } from "lightning";
import { subscribeToForwards } from "lightning";

import type { Forward } from "../lightning/getForwards.js";
import { getForwards } from "../lightning/getForwards.js";
import { log } from "../Logger.js";
import { PartialRefresher } from "./PartialRefresher.js";
import type { IPartialRefresher } from "./PartialRefresher.js";

export interface IForwardsRefresherArgs {
    /** The {@linkcode AuthenticatedLightningArgs} of the node the data should be retrieved from. */
    readonly lndArgs: AuthenticatedLightningArgs;

    /** The length of time each refresh and notify operation will be delayed after a change has been detected. */
    readonly delayMilliseconds?: number;

    /** The number of days in the past forwards should be retrieved. */
    readonly days?: number;
}

export class ForwardsRefresher extends PartialRefresher<"forwards", Forward> {
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

    protected override equals(a: Forward, b: Forward) {
        return a.created_at === b.created_at && a.fee === b.fee && a.tokens === b.tokens &&
        a.incoming_channel === b.incoming_channel && a.outgoing_channel === b.outgoing_channel;
    }

    protected override onServerChanged(serverEmitter: EventEmitter, listener: () => void) {
        serverEmitter.on("forward", (e: SubscribeToForwardsForwardEvent) => {
            if (e.is_confirmed) {
                log(`forward ${e.at}: ${JSON.stringify(e, undefined, 2)}`);
                listener();
            } else {
                log(`UNCONFIRMED forward ${e.at}: ${JSON.stringify(e, undefined, 2)}`);
            }
        });
    }

    protected override createServerEmitter(lndArgs: AuthenticatedLightningArgs) {
        return subscribeToForwards(lndArgs);
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    private constructor(args: IForwardsRefresherArgs) {
        super({ ...args, name: "forwards" });
    }
}

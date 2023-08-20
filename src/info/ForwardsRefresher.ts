// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import type { EventEmitter } from "node:events";
import type { AuthenticatedLightningArgs, SubscribeToForwardsForwardEvent } from "lightning";
import { subscribeToForwards } from "lightning";

import type { Forward } from "../lightning/getForwards.js";
import { getForwards } from "../lightning/getForwards.js";
import { log } from "../Logger.js";
import { PartialRefresher } from "./PartialRefresher.js";

export class ForwardsRefresher extends PartialRefresher<"forwards", Forward> {
    public constructor(args: {
        readonly lndArgs: AuthenticatedLightningArgs;
        readonly delayMilliseconds?: number;
        readonly days?: number;
    }) {
        super({ ...args, name: "forwards" });
    }

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
            }
        });
    }

    protected override createServerEmitter(lndArgs: AuthenticatedLightningArgs) {
        return subscribeToForwards(lndArgs);
    }
}

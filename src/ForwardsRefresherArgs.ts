// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import type { AuthenticatedLightningArgs, SubscribeToForwardsForwardEvent } from "lightning";
import { subscribeToForwards } from "lightning";
import type { Forward } from "./lightning/getForwards.js";
import { getForwards } from "./lightning/getForwards.js";
import { log } from "./Logger.js";
import { PartialRefresherArgs } from "./PartialRefresherArgs.js";

export class ForwardsRefresherArgs extends PartialRefresherArgs<"forwards", Forward> {
    public constructor(args: {
        readonly lndArgs: AuthenticatedLightningArgs;
        readonly delayMilliseconds?: number;
        readonly days?: number;
    }) {
        super({ ...args, name: "forwards", emitter: subscribeToForwards(args.lndArgs) });
    }

    public override onChanged(listener: () => void) {
        this.emitter.on("forward", (e: SubscribeToForwardsForwardEvent) => {
            if (e.is_confirmed) {
                log(`forward ${e.at}: ${e}`);
                listener();
            }
        });
    }

    protected override getDataRange(after: string, before: string) {
        return getForwards({ ...this.lndArgs, after, before });
    }

    // eslint-disable-next-line @typescript-eslint/class-methods-use-this
    protected override equals(a: Forward, b: Forward) {
        return a.created_at === b.created_at && a.fee === b.fee && a.tokens === b.tokens &&
        a.incoming_channel === b.incoming_channel && a.outgoing_channel === b.outgoing_channel;
    }
}

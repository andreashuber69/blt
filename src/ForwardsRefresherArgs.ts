// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import type { SubscribeToForwardsForwardEvent } from "lightning";
import { subscribeToForwards } from "lightning";
import type { Forward } from "./Forward.js";
import { getForwards } from "./getForwards.js";
import { log } from "./Logger.js";
import { PartialRefresherArgs } from "./PartialRefresherArgs.js";

export class ForwardsRefresherArgs extends PartialRefresherArgs<"forwards", Forward> {
    public override readonly name = "forwards";

    public override onChanged(listener: () => void) {
        this.emitter.on("forward", (e: SubscribeToForwardsForwardEvent) => {
            if (e.is_confirmed) {
                log(`forward ${e.at}: ${e.tokens}`);
                listener();
            }
        });
    }

    public override onError(listener: (error: unknown) => void): void {
        this.emitter.on("error", listener);
    }

    public override removeAllListeners() {
        this.emitter.removeAllListeners();
    }

    protected override getDataRange(after: string, before: string) {
        return getForwards({ ...this.args, after, before });
    }

    // eslint-disable-next-line @typescript-eslint/class-methods-use-this
    protected override equals(a: Forward, b: Forward) {
        return a.created_at === b.created_at && a.fee === b.fee && a.tokens === b.tokens &&
        a.incoming_channel === b.incoming_channel && a.outgoing_channel === b.outgoing_channel;
    }

    private readonly emitter = subscribeToForwards(this.args);
}

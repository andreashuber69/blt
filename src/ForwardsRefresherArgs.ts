// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import type { SubscribeToForwardsForwardEvent } from "lightning";
import { subscribeToForwards } from "lightning";
import type { Forward } from "./Forward.js";
import { getForwards } from "./getForwards.js";
import { PartialRefresherArgs } from "./PartialRefresherArgs.js";
import { toSortedArray } from "./toSortedArray.js";

export class ForwardsRefresherArgs extends PartialRefresherArgs<"forwards", Forward> {
    public override readonly name = "forwards";

    public override readonly subscribe = (listener: (scheduleRefresh: boolean) => void) =>
        this.emitter.on("forward", (e: SubscribeToForwardsForwardEvent) => listener(e.is_confirmed));

    public override readonly unsubscribe = () => this.emitter.removeAllListeners();

    protected override readonly getDataRange = async (after: string, before: string) =>
        await toSortedArray(getForwards({ ...this.args, after, before }));

    // eslint-disable-next-line @typescript-eslint/class-methods-use-this
    protected override readonly equals = (a: Forward, b: Forward) =>
        a.created_at === b.created_at && a.fee === b.fee && a.fee_mtokens === b.fee_mtokens && a.tokens === b.tokens &&
        a.mtokens === b.mtokens && a.incoming_channel === b.incoming_channel &&
        a.outgoing_channel === b.outgoing_channel;

    private readonly emitter = subscribeToForwards(this.args);
}

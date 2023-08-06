// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import { subscribeToPayments } from "lightning";
import { getPayments } from "./getPayments.js";
import { PartialRefresherArgs } from "./PartialRefresherArgs.js";
import type { Payment } from "./Payment.js";
import { toSortedArray } from "./toSortedArray.js";

export class PaymentsRefresherArgs extends PartialRefresherArgs<"payments", Payment> {
    public override readonly name = "payments";

    public override readonly subscribe = (listener: (scheduleRefresh: boolean) => void) =>
        this.emitter.on("confirmed", () => listener(true));

    public override readonly unsubscribe = () => this.emitter.removeAllListeners();

    protected override readonly getDataRange = async (after: string, before: string) =>
        // eslint-disable-next-line @typescript-eslint/naming-convention
        await toSortedArray(getPayments({ ...this.args, created_after: after, created_before: before }));

    // eslint-disable-next-line @typescript-eslint/class-methods-use-this
    protected override readonly equals = (a: Payment, b: Payment) => a.id === b.id;

    private readonly emitter = subscribeToPayments(this.args);
}

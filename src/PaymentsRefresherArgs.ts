// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import type { SubscribeToPaymentsPaymentEvent } from "lightning";
import { subscribeToPayments } from "lightning";
import { getPayments } from "./getPayments.js";
import { log } from "./Logger.js";
import { PartialRefresherArgs } from "./PartialRefresherArgs.js";
import type { Payment } from "./Payment.js";

export class PaymentsRefresherArgs extends PartialRefresherArgs<"payments", Payment> {
    public override readonly name = "payments";

    public override onChanged(listener: () => void) {
        this.emitter.on("confirmed", (e: SubscribeToPaymentsPaymentEvent) => {
            log(`payment ${e.created_at}: ${e.tokens}`);
            listener();
        });
    }

    public override onError(listener: (error: unknown) => void): void {
        this.emitter.on("error", listener);
    }

    public override removeAllListeners() {
        this.emitter.removeAllListeners();
    }

    protected override getDataRange(after: string, before: string) {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        return getPayments({ ...this.args, created_after: after, created_before: before });
    }

    // eslint-disable-next-line @typescript-eslint/class-methods-use-this
    protected override equals(a: Payment, b: Payment) {
        return a.id === b.id;
    }

    private readonly emitter = subscribeToPayments(this.args);
}

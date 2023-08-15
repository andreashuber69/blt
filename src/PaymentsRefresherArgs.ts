// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import type { AuthenticatedLightningArgs, SubscribeToPaymentsPaymentEvent } from "lightning";
import { subscribeToPayments } from "lightning";
import { getPayments } from "./getPayments.js";
import { log } from "./Logger.js";
import type { TimeBoundArgs } from "./PartialRefresherArgs.js";
import { PartialRefresherArgs } from "./PartialRefresherArgs.js";
import type { Payment } from "./Payment.js";

export class PaymentsRefresherArgs extends PartialRefresherArgs<"payments", Payment> {
    public constructor(args: AuthenticatedLightningArgs<TimeBoundArgs>) {
        super("payments", subscribeToPayments(args), args);
    }

    public override onChanged(listener: () => void) {
        this.emitter.on("confirmed", (e: SubscribeToPaymentsPaymentEvent) => {
            log(`payment ${e.created_at}: ${e.tokens}`);
            listener();
        });
    }

    protected override getDataRange(after: string, before: string) {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        return getPayments({ ...this.args, created_after: after, created_before: before });
    }

    // eslint-disable-next-line @typescript-eslint/class-methods-use-this
    protected override equals(a: Payment, b: Payment) {
        return a.id === b.id;
    }
}

// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import type { AuthenticatedLightningArgs, SubscribeToPaymentsPaymentEvent } from "lightning";
import { subscribeToPayments } from "lightning";
import { getPayments } from "./getPayments.js";
import { log } from "./Logger.js";
import { PartialRefresherArgs } from "./PartialRefresherArgs.js";
import type { Payment } from "./Payment.js";

export class PaymentsRefresherArgs extends PartialRefresherArgs<"payments", Payment> {
    public constructor(args: {
        readonly lndArgs: AuthenticatedLightningArgs;
        readonly delayMilliseconds?: number;
        readonly days?: number;
    }) {
        super({ ...args, name: "payments", emitter: subscribeToPayments(args.lndArgs) });
    }

    public override onChanged(listener: () => void) {
        this.emitter.on("confirmed", (e: SubscribeToPaymentsPaymentEvent) => {
            log(`payment ${e.created_at}: ${e.tokens}`);
            listener();
        });
    }

    protected override getDataRange(after: string, before: string) {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        return getPayments({ ...this.lndArgs, created_after: after, created_before: before });
    }

    // eslint-disable-next-line @typescript-eslint/class-methods-use-this
    protected override equals(a: Payment, b: Payment) {
        return a.id === b.id;
    }
}

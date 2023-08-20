// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import type { AuthenticatedLightningArgs, SubscribeToPaymentsPaymentEvent } from "lightning";
import { subscribeToPayments } from "lightning";

import type { Payment } from "../lightning/getPayments.js";
import { getPayments } from "../lightning/getPayments.js";
import { log } from "../Logger.js";
import { PartialRefresher } from "./PartialRefresher.js";

export class PaymentsRefresher extends PartialRefresher<"payments", Payment> {
    public constructor(args: {
        readonly lndArgs: AuthenticatedLightningArgs;
        readonly delayMilliseconds?: number;
        readonly days?: number;
    }) {
        super({ ...args, name: "payments" });
    }

    protected override getDataRange(lndArgs: AuthenticatedLightningArgs, after: string, before: string) {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        return getPayments({ ...lndArgs, created_after: after, created_before: before });
    }

    protected override equals(a: Payment, b: Payment) {
        return a.id === b.id;
    }

    protected override onServerChanged(listener: () => void) {
        this.emitter.on("confirmed", (e: SubscribeToPaymentsPaymentEvent) => {
            log(`payment ${e.created_at}: ${e.tokens}`);
            listener();
        });
    }

    protected override createEmitter(lndArgs: AuthenticatedLightningArgs) {
        return subscribeToPayments(lndArgs);
    }
}

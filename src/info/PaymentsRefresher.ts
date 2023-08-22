// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import type { EventEmitter } from "node:events";
import type { AuthenticatedLightningArgs, SubscribeToPaymentsPaymentEvent } from "lightning";
import { subscribeToPayments } from "lightning";

import type { Payment } from "../lightning/getPayments.js";
import { getPayments } from "../lightning/getPayments.js";
import { log } from "../Logger.js";
import { PartialRefresher } from "./PartialRefresher.js";
import { Refresher } from "./Refresher.js";

interface PaymentsRefresherArgs {
    readonly lndArgs: AuthenticatedLightningArgs;
    readonly delayMilliseconds?: number;
    readonly days?: number;
}

export class PaymentsRefresher extends PartialRefresher<"payments", Payment> {
    public static async create(args: PaymentsRefresherArgs) {
        return await Refresher.init(new PaymentsRefresher(args));
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    protected override getDataRange(lndArgs: AuthenticatedLightningArgs, after: string, before: string) {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        return getPayments({ ...lndArgs, created_after: after, created_before: before });
    }

    protected override equals(a: Payment, b: Payment) {
        return a.id === b.id;
    }

    protected override onServerChanged(serverEmitter: EventEmitter, listener: () => void) {
        serverEmitter.on("confirmed", (e: SubscribeToPaymentsPaymentEvent) => {
            log(`payment ${e.created_at}: ${e.tokens}`);
            listener();
        });
    }

    protected override createServerEmitter(lndArgs: AuthenticatedLightningArgs) {
        return subscribeToPayments(lndArgs);
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    private constructor(args: PaymentsRefresherArgs) {
        super({ ...args, name: "payments" });
    }
}

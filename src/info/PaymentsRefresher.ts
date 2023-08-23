// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import type { EventEmitter } from "node:events";
import type { AuthenticatedLightningArgs, SubscribeToPaymentsPaymentEvent } from "lightning";
import { subscribeToPayments } from "lightning";

import type { Payment } from "../lightning/getPayments.js";
import { getPayments } from "../lightning/getPayments.js";
import { log } from "../Logger.js";
import { PartialRefresher } from "./PartialRefresher.js";
import type { IPartialRefresher } from "./PartialRefresher.js";

export interface IPaymentsRefresherArgs {
    /** The {@linkcode AuthenticatedLightningArgs} of the node the data should be retrieved from. */
    readonly lndArgs: AuthenticatedLightningArgs;

    /** The length of time each refresh and notify operation will be delayed after a change has been detected. */
    readonly delayMilliseconds?: number;

    /** The number of days in the past payments should be retrieved. */
    readonly days?: number;
}

export class PaymentsRefresher extends PartialRefresher<"payments", Payment> {
    /**
     * Creates a new object implementing {@linkcode IPartialRefresher} for payments.
     * @param args See {@linkcode IPaymentsRefresherArgs}.
     */
    public static async create(args: IPaymentsRefresherArgs) {
        return await this.initPartial(new PaymentsRefresher(args));
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

    private constructor(args: IPaymentsRefresherArgs) {
        super({ ...args, name: "payments" });
    }
}

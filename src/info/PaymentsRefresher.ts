// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import type { AuthenticatedLightningArgs } from "lightning";
import { subscribeToPayments } from "lightning";

import type { Payment } from "../lightning/getPayments.js";
import { getPayments } from "../lightning/getPayments.js";
import { PartialRefresher } from "./PartialRefresher.js";
import type { IPartialRefresher } from "./PartialRefresher.js";
import type { Emitters } from "./Refresher.js";

type PaymentsEmitters = Emitters<"payments">;

export interface IPaymentsRefresherArgs {
    /** The {@linkcode AuthenticatedLightningArgs} of the node the data should be retrieved from. */
    readonly lndArgs: AuthenticatedLightningArgs;

    /** The length of time each refresh and notify operation will be delayed after a change has been detected. */
    readonly delayMilliseconds?: number;

    /** The number of days in the past payments should be retrieved. */
    readonly days?: number;
}

export type PaymentsElement = Payment;

/** Implements {@linkcode IPartialRefresher} for confirmed payments. */
export class PaymentsRefresher extends PartialRefresher<"payments", PaymentsElement, PaymentsEmitters> {
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

    protected override equals(a: PaymentsElement, b: PaymentsElement) {
        return a.id === b.id;
    }

    protected override onServerChanged({ payments }: PaymentsEmitters, listener: () => void) {
        payments.on("confirmed", listener);
    }

    protected override createServerEmitters(lndArgs: AuthenticatedLightningArgs) {
        return { payments: subscribeToPayments(lndArgs) } as const;
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    private constructor(args: IPaymentsRefresherArgs) {
        super({ ...args, name: "payments" });
    }
}

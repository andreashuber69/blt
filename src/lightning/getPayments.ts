// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import type { GetPaymentsArgs } from "lightning";
import { getPayments as lndGetPayments } from "lightning";

import { getPaginatedArrayData } from "./getPaginatedArrayData.js";
import type { YieldType } from "./YieldType.js";

export const getPayments = (args: GetPaymentsArgs) => getPaginatedArrayData(lndGetPayments, args, "payments");

export type Payment = Readonly<
    Pick<
        YieldType<ReturnType<typeof getPayments>>,
        "attempts" | "created_at" | "destination" | "fee_mtokens" | "id" | "is_confirmed" | "mtokens"
    >
>;

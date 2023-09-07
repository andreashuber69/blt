// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import type { GetPaymentsArgs } from "lightning";
import { getPayments as lndGetPayments } from "lightning";

import { generatorPick } from "./generatorPick.js";
import { getPaginatedArrayData } from "./getPaginatedArrayData.js";
import type { YieldType } from "./YieldType.js";

const properties = ["attempts", "created_at", "destination", "fee_mtokens", "id", "is_confirmed", "mtokens"] as const;

export const getPayments = (args: GetPaymentsArgs) =>
    generatorPick(getPaginatedArrayData(lndGetPayments, args, "payments"), properties);

export type Payment = YieldType<ReturnType<typeof getPayments>>;

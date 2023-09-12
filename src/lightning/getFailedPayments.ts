// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import type { GetFailedPaymentsArgs } from "lightning";
import { getFailedPayments as lndGetFailedPayments } from "lightning";

import { generatorPick } from "./generatorPick.js";
import { getPaginatedArrayData } from "./getPaginatedArrayData.js";
import type { YieldType } from "./YieldType.js";

const properties = ["created_at", "id"] as const;

export const getFailedPayments = (args: GetFailedPaymentsArgs) =>
    generatorPick(getPaginatedArrayData(lndGetFailedPayments, args, "payments"), properties);

export type FailedPayment = YieldType<typeof getFailedPayments>;

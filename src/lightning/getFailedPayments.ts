// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import type { GetFailedPaymentsArgs } from "lightning";
import { getFailedPayments as lndGetFailedPayments } from "lightning";

import { getPaginatedArrayData } from "./getPaginatedArrayData.js";

export const getFailedPayments = (args: GetFailedPaymentsArgs) =>
    getPaginatedArrayData(lndGetFailedPayments, args, "payments");

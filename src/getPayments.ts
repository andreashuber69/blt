import type { GetPaymentsArgs } from "lightning";
import { getPayments as lndGetPayments } from "lightning";

import { getPaginatedArrayData } from "./getPaginatedArrayData.js";

export const getPayments = (args: GetPaymentsArgs) =>
    getPaginatedArrayData(lndGetPayments, args, "payments");

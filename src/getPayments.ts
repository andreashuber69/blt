import type { GetPaymentsArgs } from "lightning";
import { getPayments as lndGetPayments } from "lightning";

import { getPaginatedArrayData } from "./getPaginatedArrayData.js";

export const getPayments = async (args: GetPaymentsArgs) =>
    await getPaginatedArrayData(lndGetPayments, args, "payments");

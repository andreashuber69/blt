import type { GetFailedPaymentsArgs } from "lightning";
import { getFailedPayments as lndGetFailedPayments } from "lightning";

import { getPaginatedArrayData } from "./getPaginatedArrayData.js";

export const getFailedPayments = async (args: GetFailedPaymentsArgs) =>
    await getPaginatedArrayData(lndGetFailedPayments, args, "payments");

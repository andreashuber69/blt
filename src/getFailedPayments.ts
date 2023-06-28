import type { GetFailedPaymentsArgs } from "lightning";
import { getFailedPayments as lndGetFailedPayments } from "lightning";

import type { RangeArgs } from "./getPaginatedArrayData.js";
import { getPaginatedArrayData } from "./getPaginatedArrayData.js";

export const getFailedPayments = async (args: GetFailedPaymentsArgs & RangeArgs) =>
    await getPaginatedArrayData(lndGetFailedPayments, args, "created_after", "created_before", "payments");

import type { GetPaymentsArgs } from "lightning";
import { getPayments as lndGetPayments } from "lightning";

import type { RangeArgs } from "./getPaginatedArrayData.js";
import { getPaginatedArrayData } from "./getPaginatedArrayData.js";

export const getPayments = async (args: GetPaymentsArgs & RangeArgs) =>
    await getPaginatedArrayData(lndGetPayments, args, "created_after", "created_before", "payments");

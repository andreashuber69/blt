import type { GetPaymentsArgs } from "lightning";
import { getPayments as lndGetPayments } from "lightning";

import type { RangeArgs } from "./getPagedArrayData.js";
import { getPagedArrayData } from "./getPagedArrayData.js";

export const getPayments = async (args: GetPaymentsArgs & RangeArgs) =>
    await getPagedArrayData(lndGetPayments, args, "created_after", "created_before", "payments");

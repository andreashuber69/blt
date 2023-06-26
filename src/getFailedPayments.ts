import type { GetFailedPaymentsArgs } from "lightning";
import { getFailedPayments as lndGetFailedPayments } from "lightning";

import type { OptionalArgs } from "./getPagedArrayData.js";
import { getPagedArrayData } from "./getPagedArrayData.js";

export const getFailedPayments = async (args: GetFailedPaymentsArgs & OptionalArgs) =>
    await getPagedArrayData(lndGetFailedPayments, args, "created_after", "created_before", "payments");

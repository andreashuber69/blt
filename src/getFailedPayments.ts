import type { GetFailedPaymentsArgs } from "lightning";
import { getFailedPayments as lndGetFailedPayments } from "lightning";

import type { OptionalArgs } from "./getLatestData.js";
import { getLatestData } from "./getLatestData.js";

export const getFailedPayments = async (args: GetFailedPaymentsArgs & OptionalArgs) =>
    await getLatestData(lndGetFailedPayments, args, "created_after", "created_before", "payments");

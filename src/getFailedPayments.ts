import type { GetFailedPaymentsArgs } from "lightning";
import { getFailedPayments as lndGetFailedPayments } from "lightning";

import type { Days } from "./getLatestData.js";
import { getLatestData } from "./getLatestData.js";

export const getFailedPayments = async (args: Days & GetFailedPaymentsArgs) =>
    await getLatestData(lndGetFailedPayments, args, "created_after", "created_before", "payments");

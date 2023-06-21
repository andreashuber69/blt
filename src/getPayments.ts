import type { GetPaymentsArgs } from "lightning";
import { getPayments as lndGetPayments } from "lightning";

import type { Days } from "./getLatestData.js";
import { getLatestData } from "./getLatestData.js";

export const getPayments = async (args: Days & GetPaymentsArgs) =>
    await getLatestData(lndGetPayments, args, "created_after", "created_before", "payments");

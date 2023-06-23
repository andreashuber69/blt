import type { GetPaymentsArgs } from "lightning";
import { getPayments as lndGetPayments } from "lightning";

import type { OptionalArgs } from "./getLatestData.js";
import { getLatestData } from "./getLatestData.js";

export const getPayments = async (args: GetPaymentsArgs & OptionalArgs) =>
    await getLatestData(lndGetPayments, args, "created_after", "created_before", "payments");

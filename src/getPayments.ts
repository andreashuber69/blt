// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import type { GetPaymentsArgs } from "lightning";
import { getPayments as lndGetPayments } from "lightning";

import { getPaginatedArrayData } from "./getPaginatedArrayData.js";

export const getPayments = (args: GetPaymentsArgs) => getPaginatedArrayData(lndGetPayments, args, "payments");

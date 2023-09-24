// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import type { GetPaymentsArgs } from "lightning";
import { getPayments as lndGetPayments } from "lightning";

import { generatorPick } from "./generatorPick.js";
import { getPaginatedArrayData } from "./getPaginatedArrayData.js";
import type { YieldType } from "./YieldType.js";

// "created_at" is necessary for partial update (the current getPayments interface only allows to limit the time
// span of the creation date). confirmed_at is necessary to establish an accurate balance history of a channel.
const properties = ["attempts", "confirmed_at", "created_at", "fee_mtokens", "id", "is_confirmed", "mtokens"] as const;

export const getPayments = (args: GetPaymentsArgs) =>
    generatorPick(getPaginatedArrayData(lndGetPayments, args, "payments"), properties);

export type Payment = YieldType<typeof getPayments>;

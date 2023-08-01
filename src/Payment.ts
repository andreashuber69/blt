// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import type { getPayments } from "./getPayments.js";
import type { YieldType } from "./YieldType.js";

export type Payment = Readonly<YieldType<ReturnType<typeof getPayments>>>;

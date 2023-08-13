// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import type { getPayments } from "./getPayments.js";
import type { YieldType } from "./YieldType.js";

type PropertyNames = "created_at" | "destination" | "fee" | "id" | "is_confirmed" | "tokens";

export type Payment = Readonly<Pick<YieldType<ReturnType<typeof getPayments>>, PropertyNames>>;

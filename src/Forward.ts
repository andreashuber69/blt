// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import type { getForwards } from "./getForwards.js";
import type { YieldType } from "./YieldType.js";

type PropertyNames = "created_at" | "fee" | "incoming_channel" | "outgoing_channel" | "tokens";

export type Forward = Readonly<Pick<YieldType<ReturnType<typeof getForwards>>, PropertyNames>>;

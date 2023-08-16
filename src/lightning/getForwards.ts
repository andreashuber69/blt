// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import type { GetForwardsArgs } from "lightning";
import { getForwards as lndGetForwards } from "lightning";

import { getPaginatedArrayData } from "./getPaginatedArrayData.js";
import type { YieldType } from "./YieldType.js";

type PropertyNames = "created_at" | "fee" | "incoming_channel" | "outgoing_channel" | "tokens";

export const getForwards = (args: GetForwardsArgs) => getPaginatedArrayData(lndGetForwards, args, "forwards");

export type Forward = Readonly<Pick<YieldType<ReturnType<typeof getForwards>>, PropertyNames>>;

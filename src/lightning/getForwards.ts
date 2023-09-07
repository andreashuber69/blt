// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import type { GetForwardsArgs } from "lightning";
import { getForwards as lndGetForwards } from "lightning";

import { generatorPick } from "./generatorPick.js";
import { getPaginatedArrayData } from "./getPaginatedArrayData.js";
import type { YieldType } from "./YieldType.js";

const properties = ["created_at", "fee_mtokens", "incoming_channel", "mtokens", "outgoing_channel"] as const;

export const getForwards = (args: GetForwardsArgs) =>
    generatorPick(getPaginatedArrayData(lndGetForwards, args, "forwards"), properties);

export type Forward = YieldType<ReturnType<typeof getForwards>>;

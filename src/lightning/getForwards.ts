// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import type { GetForwardsArgs } from "lightning";
import { getForwards as lndGetForwards } from "lightning";

import { getPaginatedArrayData } from "./getPaginatedArrayData.js";
import type { YieldType } from "./YieldType.js";

export const getForwards = (args: GetForwardsArgs) => getPaginatedArrayData(lndGetForwards, args, "forwards");

export type Forward = Readonly<
    Pick<
        YieldType<ReturnType<typeof getForwards>>,
        "created_at" | "fee_mtokens" | "incoming_channel" | "mtokens" | "outgoing_channel"
    >
>;

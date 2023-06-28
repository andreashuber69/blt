import type { GetForwardsArgs } from "lightning";
import { getForwards as lndGetForwards } from "lightning";

import type { RangeArgs } from "./getPaginatedArrayData.js";
import { getPaginatedArrayData } from "./getPaginatedArrayData.js";

export const getForwards = async (args: GetForwardsArgs & RangeArgs) =>
    await getPaginatedArrayData(lndGetForwards, args, "after", "before", "forwards");

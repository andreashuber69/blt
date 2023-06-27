import type { GetForwardsArgs } from "lightning";
import { getForwards as lndGetForwards } from "lightning";

import type { RangeArgs } from "./getPagedArrayData.js";
import { getPagedArrayData } from "./getPagedArrayData.js";

export const getForwards = async (args: GetForwardsArgs & RangeArgs) =>
    await getPagedArrayData(lndGetForwards, args, "after", "before", "forwards");

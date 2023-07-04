import type { GetForwardsArgs } from "lightning";
import { getForwards as lndGetForwards } from "lightning";

import { getPaginatedArrayData } from "./getPaginatedArrayData.js";

export const getForwards = async (args: GetForwardsArgs) =>
    await getPaginatedArrayData(lndGetForwards, args, "forwards");

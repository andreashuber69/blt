import type { GetForwardsArgs } from "lightning";
import { getForwards as lndGetForwards } from "lightning";

import type { Days } from "./getLatestData.js";
import { getLatestData } from "./getLatestData.js";

export const getForwards = async (args: Days & GetForwardsArgs) =>
    await getLatestData(lndGetForwards, args, "after", "before", "forwards");

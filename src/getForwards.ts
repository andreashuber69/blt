import type { GetForwardsArgs } from "lightning";
import { getForwards as lndGetForwards } from "lightning";

import type { OptionalArgs } from "./getLatestData.js";
import { getLatestData } from "./getLatestData.js";

export const getForwards = async (args: GetForwardsArgs & OptionalArgs) =>
    await getLatestData(lndGetForwards, args, "after", "before", "forwards");

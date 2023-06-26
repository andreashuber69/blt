import type { GetForwardsArgs } from "lightning";
import { getForwards as lndGetForwards } from "lightning";

import type { OptionalArgs } from "./getPagedArrayData.js";
import { getPagedArrayData } from "./getPagedArrayData.js";

export const getForwards = async (args: GetForwardsArgs & OptionalArgs) =>
    await getPagedArrayData(lndGetForwards, args, "after", "before", "forwards");

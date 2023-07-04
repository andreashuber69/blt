import type { GetForwardsArgs } from "lightning";
import { getForwards as lndGetForwards } from "lightning";

import { getPaginatedArrayData } from "./getPaginatedArrayData.js";

export const getForwards = (args: GetForwardsArgs) => getPaginatedArrayData(lndGetForwards, args, "forwards");

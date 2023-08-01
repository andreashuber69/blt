// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import type { getForwards } from "./getForwards.js";
import type { YieldType } from "./YieldType.js";

export type Forward = Readonly<YieldType<ReturnType<typeof getForwards>>>;

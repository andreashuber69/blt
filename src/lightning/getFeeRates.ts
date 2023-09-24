// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import type { AuthenticatedLightningArgs } from "lightning";
import { getFeeRates as lndGetFeeRates } from "lightning";

import { arrayPick } from "./arrayPick.js";
import { getArrayData } from "./getArrayData.js";

const properties = ["base_fee", "fee_rate", "id"] as const;

export const getFeeRates = async (args: AuthenticatedLightningArgs) =>
    arrayPick(await getArrayData(lndGetFeeRates, args, "channels"), properties);

export type FeeRate = Awaited<ReturnType<typeof getFeeRates>>[number];

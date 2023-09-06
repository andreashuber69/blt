// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import type { AuthenticatedLightningArgs } from "lightning";
import { getFeeRates as lndGetFeeRates } from "lightning";

import { getArrayData } from "./getArrayData.js";

export const getFeeRates = async (args: AuthenticatedLightningArgs) =>
    await getArrayData(lndGetFeeRates, args, "channels");

export type FeeRate = Readonly<Pick<
    Awaited<ReturnType<typeof getFeeRates>>[number],
    "base_fee" | "fee_rate" | "id" | "transaction_id" | "transaction_vout"
>>;

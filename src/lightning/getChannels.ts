// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import type { GetChannelsArgs } from "lightning";
import { getChannels as lndGetChannels } from "lightning";

import { arrayPick } from "./arrayPick.js";
import { getArrayData } from "./getArrayData.js";

const properties = ["capacity", "id", "local_balance", "partner_public_key", "transaction_id"] as const;

export const getChannels = async (args: GetChannelsArgs) =>
    arrayPick(await getArrayData(lndGetChannels, args, "channels"), properties);

export type Channel = Awaited<ReturnType<typeof getChannels>>[number];

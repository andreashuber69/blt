// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import type { GetClosedChannelsArgs } from "lightning";
import { getClosedChannels as lndGetClosedChannels } from "lightning";

import { arrayPick } from "./arrayPick.js";
import { getArrayData } from "./getArrayData.js";

const properties = ["id"] as const;

export const getClosedChannels = async (args: GetClosedChannelsArgs) =>
    arrayPick(await getArrayData(lndGetClosedChannels, args, "channels"), properties);

export type ClosedChannel = Awaited<ReturnType<typeof getClosedChannels>>[number];

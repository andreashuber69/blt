// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import type { GetChannelsArgs } from "lightning";
import { getChannels as lndGetChannels } from "lightning";

import { getArrayData } from "./getArrayData.js";

export const getChannels = async (args: GetChannelsArgs) => await getArrayData(lndGetChannels, args, "channels");

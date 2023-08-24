// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import type { GetChannelsArgs } from "lightning";
import { getChannels as lndGetChannels } from "lightning";

import { getArrayData } from "./getArrayData.js";

export const getChannels = async (args: GetChannelsArgs) => await getArrayData(lndGetChannels, args, "channels");

export type Channel =
    // eslint-disable-next-line max-len
    Readonly<Pick<Awaited<ReturnType<typeof getChannels>>[number], "capacity" | "id" | "local_balance" | "remote_balance">>;

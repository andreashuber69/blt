// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import type { GetChannelsArgs } from "lightning";
import { getChannels as lndGetChannels } from "lightning";

import { getArrayData } from "./getArrayData.js";

type PropertyNames = "capacity" | "id" | "local_balance" | "remote_balance";

export const getChannels = async (args: GetChannelsArgs) => await getArrayData(lndGetChannels, args, "channels");

export type Channel = Readonly<Pick<Awaited<ReturnType<typeof getChannels>>[number], PropertyNames>>;

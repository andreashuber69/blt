// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import type { getChannels } from "./getChannels.js";

type PropertyNames = "capacity" | "id" | "local_balance" | "other_ids" | "remote_balance";

export type Channel = Readonly<Pick<Awaited<ReturnType<typeof getChannels>>[number], PropertyNames>>;

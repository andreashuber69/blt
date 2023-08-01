// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import type { getChannels } from "./getChannels.js";

export type Channel = Readonly<Awaited<ReturnType<typeof getChannels>>[number]>;

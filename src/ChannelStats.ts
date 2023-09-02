// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import type { DeepReadonly } from "./DeepReadonly.js";
import { getNewForwardStats } from "./ForwardStats.js";
import type { Channel } from "./lightning/getChannels.js";

type ChannelProperties = Omit<Channel, "id"> & { readonly partnerAlias?: string | undefined };

export const getNewChannelStats = (props: ChannelProperties) => ({
    ...props,
    forwards: getNewForwardStats(),
    history: new Array<{
        time: string;
        amount: number;
        fee?: number;
    }>(),
});

export type ChannelStats = DeepReadonly<ReturnType<typeof getNewChannelStats>>;

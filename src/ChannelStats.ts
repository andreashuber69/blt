// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import type { DeepReadonly } from "./DeepReadonly.js";
import type { Channel } from "./lightning/getChannels.js";

const getNewForwardStats = () => ({
    maxTokens: 0,
    count: 0,
    totalTokens: 0,
});

type ChannelProperties = Omit<Channel, "id"> & { readonly partnerAlias?: string | undefined };

/** Contains information about what happened at a point in time in a channel. */
export interface HistoryValue {
    /**
     * By what amount did the channel balance change?
     * @description A positive value means that the channel balance decreased; a negative value means that it increased.
     */
    readonly amount: number;

    /** If the the balance change was due to an outgoing forward, contains the fee that was paid. */
    readonly fee?: number;
}

export const getNewChannelStats = (props: ChannelProperties) => ({
    ...props,
    incomingForwards: getNewForwardStats(),
    outgoingForwards: getNewForwardStats(),

    /**
     * Contains the balance history of the channel, sorted from latest to earliest. The key is the ISO 8601 date & time.
     * @description The sort order as well as the fact that {@linkcode HistoryValue.amount} is positive when the
     * balance decreased makes balance history reconstruction straight-forward. Starting with the current balance of a
     * channel, an algorithm can iterate through the history and just add {@linkcode HistoryValue.amount} to get the
     * balance before the point in time of the current history element being iterated over.
     */
    history: new Map<string, HistoryValue[]>(),
});

export type ChannelStats = DeepReadonly<ReturnType<typeof getNewChannelStats>>;

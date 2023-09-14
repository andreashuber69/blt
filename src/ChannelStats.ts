// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import type { ChannelsElement } from "./info/ChannelsRefresher.js";

const getNewForwardStats = () => ({
    maxTokens: 0,
    count: 0,
    totalTokens: 0,
});

/** Contains information about a balance change in a channel. */
export abstract class BalanceChange {
    public get balance() {
        if (this.balanceImpl === undefined) {
            throw new Error("The balance has not been set.");
        }

        return this.balanceImpl;
    }

    public set balance(value: number) {
        if (this.balanceImpl !== undefined) {
            throw new Error("The balance must not be set multiple times.");
        }

        this.balanceImpl = value;
    }

    /**
     * Initializes a new instance.
     * @param amount By what amount did the channel balance change? A positive value means that the channel balance
     * decreased; a negative value means that it increased.
     */
    protected constructor(public readonly amount: number) {}

    private balanceImpl: number | undefined;
}

export class Payment extends BalanceChange {
    public constructor(amount: number) {
        super(amount);
    }
}

export class IncomingForward extends BalanceChange {
    /**
     * Initializes a new instance.
     * @param amount See {@linkcode BalanceChange.constructor}.
     * @param fee The fee that was paid for the forward.
     * @param outgoingChannelId The id of the channel the amount was forwarded to.
     */
    public constructor(amount: number, public readonly fee: number, public readonly outgoingChannelId: string) {
        super(amount);
    }
}

export class OutgoingForward extends BalanceChange {
    /**
     * Initializes a new instance.
     * @param amount See {@linkcode BalanceChange.constructor}.
     * @param fee The fee that was paid for the forward.
     */
    public constructor(amount: number, public readonly fee: number) {
        super(amount);
    }
}

export const getNewChannelStats = (
    props: Omit<ChannelsElement, "id"> & { readonly partnerAlias?: string | undefined },
) => ({
    ...props,
    incomingForwards: getNewForwardStats(),
    outgoingForwards: getNewForwardStats(),

    /**
     * Contains the balance history of the channel, sorted from latest to earliest. The key is the ISO 8601 date & time.
     * @description The sort order as well as the fact that {@linkcode BalanceChange.amount} is positive when the
     * balance decreased makes balance history reconstruction straight-forward. Starting with the current balance of a
     * channel, an algorithm can iterate through the history and just add {@linkcode BalanceChange.amount} to get the
     * balance before the point in time of the current history element being iterated over.
     */
    history: new Map<string, BalanceChange[]>(),
});

export type ChannelStats = Readonly<ReturnType<typeof getNewChannelStats>>;

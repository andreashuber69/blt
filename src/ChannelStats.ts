// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import type { DeepReadonly } from "./DeepReadonly.js";
import type { ChannelsElement } from "./info/ChannelsRefresher.js";

const getNewForwardStats = () => ({
    maxTokens: 0,
    count: 0,
    totalTokens: 0,
});

export type MutableForwardStats = ReturnType<typeof getNewForwardStats>;

/** Contains information about a balance change in a channel. */
export abstract class BalanceChange {
    /** Gets the local channel balance after the change. */
    public get balance() {
        return this.data.balance;
    }

    /**
     * Gets the standardized distance of the current balance to the target balance.
     * @description 0 means that {@linkcode BalanceChange.balance} is equal to the target balance. -1 expresses that
     * {@linkcode BalanceChange.balance} is at the furthest point possible below the target. +1 means the opposite.
     */
    public get targetBalanceDistance() {
        return this.data.targetBalanceDistance;
    }

    public setData(balance: number, targetBalanceDistance: number) {
        if (this.dataImpl !== undefined) {
            throw new Error("The data must not be set multiple times.");
        }

        this.dataImpl = { balance, targetBalanceDistance };
    }

    /**
     * Initializes a new instance.
     * @param amount By what amount did the channel balance change? A positive value means that the channel balance
     * decreased; a negative value means that it increased.
     */
    protected constructor(public readonly amount: number) {}

    private dataImpl: { readonly balance: number; readonly targetBalanceDistance: number } | undefined;

    private get data() {
        if (this.dataImpl === undefined) {
            throw new Error("The data has not been set.");
        }

        return this.dataImpl;
    }
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
     */
    history: new Map<string, BalanceChange[]>(),
});

export type MutableChannelStats = ReturnType<typeof getNewChannelStats>;

export type ChannelStats = DeepReadonly<MutableChannelStats>;

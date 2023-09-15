// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import type { ChannelsElement } from "./info/ChannelsRefresher.js";

const getNewForwardStats = () => ({
    maxTokens: 0,
    count: 0,
    totalTokens: 0,
});

/** Contains information about a balance change in a channel. */
export abstract class BalanceChange {
    /** Gets the local channel balance after the change. */
    public get balance() {
        return this.getData("balanceImpl");
    }

    public set balance(value: number) {
        this.setData("balanceImpl", value);
    }

    /**
     * Gets the standardized distance of the current balance to the target balance.
     * @description 0 means that {@linkcode BalanceChange.balance} is equal to the target balance. -1 expresses that
     * {@linkcode BalanceChange.balance} is at the furthest point possible below the target. +1 means the opposite.
     */
    public get targetBalanceDistance() {
        return this.getData("targetBalanceDistanceImpl");
    }

    public set targetBalanceDistance(value: number) {
        this.setData("targetBalanceDistanceImpl", value);
    }

    /**
     * Initializes a new instance.
     * @param amount By what amount did the channel balance change? A positive value means that the channel balance
     * decreased; a negative value means that it increased.
     */
    protected constructor(public readonly amount: number) {}

    // eslint-disable-next-line @typescript-eslint/prefer-readonly
    private balanceImpl: number | undefined;
    // eslint-disable-next-line @typescript-eslint/prefer-readonly
    private targetBalanceDistanceImpl: number | undefined;

    private getData(prop: "balanceImpl" | "targetBalanceDistanceImpl") {
        const result = this[prop];

        if (result === undefined) {
            throw new Error("The data has not been set.");
        }

        return result;
    }

    private setData(prop: "balanceImpl" | "targetBalanceDistanceImpl", value: number) {
        if (this[prop] !== undefined) {
            throw new Error("The data must not be set multiple times.");
        }

        this[prop] = value;
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

export type ChannelStats = Readonly<ReturnType<typeof getNewChannelStats>>;

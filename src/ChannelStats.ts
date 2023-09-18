// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import { getTargetBalanceDistance } from "./getTargetBalanceDistance.js";
import type { ChannelsElement } from "./info/ChannelsRefresher.js";

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
     * @param time The ISO 8601 date &amp; time.
     * @param amount By what amount did the channel balance change? A positive value means that the channel balance
     * decreased; a negative value means that it increased.
     */
    protected constructor(public readonly time: string, public readonly amount: number) {}

    private dataImpl: { readonly balance: number; readonly targetBalanceDistance: number } | undefined;

    private get data() {
        if (this.dataImpl === undefined) {
            throw new Error("The data has not been set.");
        }

        return this.dataImpl;
    }
}

export class Payment extends BalanceChange {
    public constructor(time: string, amount: number) {
        super(time, amount);
    }
}

export class IncomingForward extends BalanceChange {
    /**
     * Initializes a new instance.
     * @param time The ISO 8601 date &amp; time.
     * @param amount See {@linkcode BalanceChange.constructor}.
     * @param fee The fee that was paid for the forward.
     * @param outgoingChannelId The id of the channel the amount was forwarded to.
     */
    public constructor(
        time: string,
        amount: number,
        public readonly fee: number,
        public readonly outgoingChannelId: string,
    ) {
        super(time, amount);
    }
}

export class OutgoingForward extends BalanceChange {
    /**
     * Initializes a new instance.
     * @param time The ISO 8601 date &amp; time.
     * @param amount See {@linkcode BalanceChange.constructor}.
     * @param fee The fee that was paid for the forward.
     */
    public constructor(time: string, amount: number, public readonly fee: number) {
        super(time, amount);
    }
}

export class ChannelStats {
    public constructor(public readonly properties: ChannelsElement & { readonly partnerAlias?: string | undefined }) {}

    public get incomingForwards(): Readonly<typeof this.incomingForwardsImpl> {
        return this.incomingForwardsImpl;
    }

    public get outgoingForwards(): Readonly<typeof this.outgoingForwardsImpl> {
        return this.outgoingForwardsImpl;
    }

    /** Gets the balance history of the channel, sorted from latest to earliest. */
    public get history(): readonly BalanceChange[] {
        if (this.isUnsorted) {
            this.historyImpl.sort((a, b) => -a.time.localeCompare(b.time));
            this.isUnsorted = false;
        }

        return this.historyImpl;
    }

    /**
     * Gets {@linkcode BalanceChange.targetBalanceDistance} of the latest element in the history. Returns the distance
     * to half the capacity if the history is empty.
     */
    public get targetBalanceDistance() {
        return this.history[0] ?
            this.history[0].targetBalanceDistance :
            getTargetBalanceDistance(
                this.properties.local_balance,
                this.properties.capacity / 2,
                this.properties.capacity,
            );
    }

    public addIncomingForward(time: string, amount: number, fee: number, outgoingChannelId: string) {
        this.addToHistory(new IncomingForward(time, amount, fee, outgoingChannelId));
        this.updateStats(this.incomingForwardsImpl, amount);
    }

    public addOutgoingForward(time: string, amount: number, fee: number) {
        this.addToHistory(new OutgoingForward(time, amount, fee));
        this.updateStats(this.outgoingForwardsImpl, amount);
    }

    public addPayment(time: string, amount: number) {
        this.addToHistory(new Payment(time, amount));
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    private static getNewForwardStats() {
        return {
            maxTokens: 0,
            count: 0,
            totalTokens: 0,
        };
    }

    private readonly historyImpl = new Array<BalanceChange>();
    private isUnsorted = false;
    private readonly incomingForwardsImpl = ChannelStats.getNewForwardStats();
    private readonly outgoingForwardsImpl = ChannelStats.getNewForwardStats();

    private addToHistory(change: BalanceChange) {
        this.isUnsorted = true;
        this.historyImpl.push(change);
    }

    private updateStats(stats: ReturnType<typeof ChannelStats.getNewForwardStats>, tokens: number) {
        const absoluteTokens = Math.abs(tokens);
        stats.maxTokens = Math.max(stats.maxTokens, absoluteTokens);
        ++stats.count;
        stats.totalTokens += absoluteTokens;
    }
}

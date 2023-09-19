// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import type { DeepReadonly } from "./DeepReadonly.js";
import type { ChannelsElement } from "./info/ChannelsRefresher.js";

/** Contains information about a balance change in a channel. */
export abstract class BalanceChange {
    /** Gets the local channel balance after the change. */
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
     * @param time The ISO 8601 date &amp; time.
     * @param amount By what amount did the channel balance change? A positive value means that the channel balance
     * decreased; a negative value means that it increased.
     */
    protected constructor(public readonly time: string, public readonly amount: number) {}

    private balanceImpl: number | undefined;
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
    public get history(): DeepReadonly<BalanceChange[]> {
        if (this.isUnsorted) {
            this.historyImpl.sort((a, b) => -a.time.localeCompare(b.time));
            let balance = this.properties.local_balance;

            for (const change of this.historyImpl) {
                change.balance = balance;
                balance += change.amount;
            }

            this.isUnsorted = false;
        }

        return this.historyImpl;
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

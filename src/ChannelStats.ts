// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import type { DeepReadonly } from "./DeepReadonly.js";
import type { ChannelsElement } from "./info/ChannelsRefresher.js";

/** Contains information about a balance change in a channel. */
export abstract class BalanceChange {
    /**
     * Initializes a new instance.
     * @param time The ISO 8601 date &amp; time.
     * @param amount By what amount did the channel balance change? A positive value means that the channel balance
     * decreased; a negative value means that it increased.
     */
    public constructor(public readonly time: string, public readonly amount: number) {}

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

    private balanceImpl: number | undefined;
}

export class Payment extends BalanceChange {
    /** See {@linkcode BalanceChange.constructor}. */
    public constructor(time: string, amount: number) {
        super(time, amount);
    }
}

export abstract class Forward extends BalanceChange {
    /**
     * See {@linkcode BalanceChange.constructor}.
     * @param time See {@linkcode BalanceChange.constructor}.
     * @param amount See {@linkcode BalanceChange.constructor}.
     * @param fee The fee that was paid for the forward.
     */
    protected constructor(time: string, amount: number, public readonly fee: number) {
        super(time, amount);
    }
}

export class InForward extends Forward {
    /**
     * See {@linkcode Forward.constructor}.
     * @param time See {@linkcode Forward.constructor}.
     * @param amount See {@linkcode Forward.constructor}.
     * @param fee See {@linkcode Forward.constructor}.
     */
    public constructor(
        time: string,
        amount: number,
        fee: number,
        public readonly outChannel: IChannelStats | undefined,
    ) {
        super(time, amount, fee);
    }
}

export class OutForward extends Forward {
    /** See {@linkcode Forward.constructor}. */
    public constructor(
        time: string,
        amount: number,
        fee: number,
        public readonly inChannel: IChannelStats | undefined,
    ) {
        super(time, amount, fee);
    }
}

export class ChannelStats {
    public constructor(public readonly properties: ChannelsElement & { readonly partnerAlias?: string | undefined }) {}

    public get inForwards(): Readonly<typeof this.inForwardsImpl> {
        return this.inForwardsImpl;
    }

    public get outForwards(): Readonly<typeof this.outForwardsImpl> {
        return this.outForwardsImpl;
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

    public addInForward(time: string, amount: number, fee: number, outChannel: IChannelStats | undefined) {
        this.addToHistory(new InForward(time, amount, fee, outChannel));
        this.updateStats(this.inForwardsImpl, amount);
    }

    public addOutForward(time: string, amount: number, fee: number, inChannel: IChannelStats | undefined) {
        this.addToHistory(new OutForward(time, amount, fee, inChannel));
        this.updateStats(this.outForwardsImpl, amount);
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
    private readonly inForwardsImpl = ChannelStats.getNewForwardStats();
    private readonly outForwardsImpl = ChannelStats.getNewForwardStats();

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

/** See {@linkcode ChannelStats}. */
export type IChannelStats = Pick<ChannelStats, "history" | "inForwards" | "outForwards" | "properties">;

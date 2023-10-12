// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import type { DeepReadonly } from "./DeepReadonly.js";
import type { ChannelsElement } from "./info/ChannelsRefresher.js";

/** Represents a balance change in a channel. */
export abstract class Change {
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

/**
 * Represents a balance change in a channel that leaves the node balance essentially unchanged, because it is
 * compensated by a simultaneous change in another channel, see subclasses for details.
 */
export abstract class SelfChange extends Change {
    /**
     * See {@linkcode Change.constructor}.
     * @param time See {@linkcode Change.constructor}.
     * @param amount See {@linkcode Change.constructor}.
     * @param fee The fee that was paid.
     */
    protected constructor(time: string, amount: number, public readonly fee: number) {
        super(time, amount);
    }
}

/** Represents an incoming self change, see {@linkcode SelfChange}. */
export abstract class InSelfChange extends SelfChange {
    /**
     * See {@linkcode SelfChange.constructor}.
     * @param time See {@linkcode SelfChange.constructor}.
     * @param amount See {@linkcode SelfChange.constructor}.
     * @param fee See {@linkcode SelfChange.constructor}.
     * @param outChannel The outgoing channel participating in this self change.
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

/** Represents an outgoing self change, see {@linkcode SelfChange}. */
export class OutSelfChange extends SelfChange {
    /**
     * See {@linkcode SelfChange.constructor}.
     * @param time See {@linkcode SelfChange.constructor}.
     * @param amount See {@linkcode SelfChange.constructor}.
     * @param fee See {@linkcode SelfChange.constructor}.
     * @param inChannel The incoming channel participating in this self change.
     */
    public constructor(
        time: string,
        amount: number,
        fee: number,
        public readonly inChannel: IChannelStats | undefined,
    ) {
        super(time, amount, fee);
    }
}

/** Represents an incoming forward. */
export class InForward extends InSelfChange {
    /** See {@linkcode InSelfChange.constructor}. */
    public constructor(time: string, amount: number, fee: number, outChannel: IChannelStats | undefined) {
        super(time, amount, fee, outChannel);
    }
}

/** Represents an outgoing forward. */
export class OutForward extends OutSelfChange {
    /** See {@linkcode OutSelfChange.constructor}. */
    public constructor(time: string, amount: number, fee: number, inChannel: IChannelStats | undefined) {
        super(time, amount, fee, inChannel);
    }
}

/** Represents an incoming rebalance. */
export class InRebalance extends SelfChange {
    /** See {@linkcode SelfChange.constructor}. */
    public constructor(time: string, amount: number, fee: number) {
        super(time, amount, fee);
    }
}

/** Represents an outgoing rebalance. */
export class OutRebalance extends SelfChange {
    /** See {@linkcode SelfChange.constructor}. */
    public constructor(time: string, amount: number, fee: number) {
        super(time, amount, fee);
    }
}

export class Payment extends Change {
    /** See {@linkcode Change.constructor}. */
    public constructor(time: string, amount: number) {
        super(time, amount);
    }
}

export interface NodeProperties {
    readonly partnerAlias: string | undefined;
    readonly partnerFeeRate: number | undefined;
}

export class ChannelStats {
    public constructor(public readonly properties: ChannelsElement & NodeProperties) {}

    public get inForwards(): Readonly<typeof this.inForwardsImpl> {
        return this.inForwardsImpl;
    }

    public get outForwards(): Readonly<typeof this.outForwardsImpl> {
        return this.outForwardsImpl;
    }

    /** Gets the balance history of the channel, sorted from latest to earliest. */
    public get history(): DeepReadonly<Change[]> {
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

    public addInRebalance(time: string, amount: number, fee: number) {
        this.addToHistory(new InRebalance(time, amount, fee));
    }

    public addOutRebalance(time: string, amount: number, fee: number) {
        this.addToHistory(new OutRebalance(time, amount, fee));
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

    private readonly historyImpl = new Array<Change>();
    private isUnsorted = false;
    private readonly inForwardsImpl = ChannelStats.getNewForwardStats();
    private readonly outForwardsImpl = ChannelStats.getNewForwardStats();

    private addToHistory(change: Change) {
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

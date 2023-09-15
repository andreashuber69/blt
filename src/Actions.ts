// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import type { ChannelStats, MutableChannelStats } from "./ChannelStats.js";
import { IncomingForward, OutgoingForward } from "./ChannelStats.js";
import type { YieldType } from "./lightning/YieldType.js";
import type { INodeStats } from "./NodeStats.js";

export interface ActionsConfig {
    /** The minimum number of past forwards routed through a channel to consider it as indicative for future flow. */
    readonly minChannelForwards: number;

    /**
     * The minimal balance a channel should have as a fraction of its capacity.
     * @description For example, 0.25 means that suggested actions will not let the local balance fall below 1/4 of the
     * channel capacity and not let it go above 3/4 (such that the remote balance will not fall below 1/4).
     */
    readonly minChannelBalanceFraction: number;

    /**
     * The minimum absolute distance from the target a channel or node balance can have before balance actions are
     * suggested. 0 means that rebalancing is proposed even if the target deviates only 1 satoshi. 1 means that no
     * rebalancing is ever suggested.
     */
    readonly minRebalanceDistance: number;

    /** The fraction to be added to the largest past forward to allow for even larger forwards in the future. */
    readonly largestForwardMarginFraction: number;

    /** The maximum fee rate on a channel in PPM. */
    readonly maxFeeRate: number;
}

export interface Action {
    readonly entity: "channel" | "node";
    readonly id?: string;
    readonly alias?: string | undefined;
    readonly priority: number;
    readonly variable: string;
    readonly actual: number;
    readonly target: number;
    readonly max: number;
    readonly reason: string;
}

/**
 * Suggests actions for a routing LND node to get closer to profitability and avoid situations of low liquidity.
 * @description
 * The actions suggested by this class are made under the following <b>assumptions</b>:
 * <ul>
 * <li>No external data logging or storage is necessary, which means that actions are only ever calculated based on
 * historical data that can be retrieved from the node. For example, forwards and payments that happened in the last 30
 * days can be retrieved from LND via associated RPC functions. However, it is currently not possible to get an accurate
 * log of the fee rate on a given channel. Historical fee rates could be calculated from the fees that have been paid by
 * outgoing forwards, but doing so only works reliably when the base fee is constant, forwards never overpay fees and
 * the fee rate is never set externally. Obviously, especially the last condition is rarely met in reality, which is why
 * historical fee rates can only ever be <b>estimated</b>. For example, imagine a channel that has seen regular outgoing
 * forwards at a rate of 100ppm. At some point the human operator decides to raise the rate to 1000ppm, which will
 * obviously lead to an immediate drop of outgoing forwards. A week later the operator drops the fee rate back to 100ppm
 * and then looks at the actions proposed by {@linkcode Actions.get}. Since the code has no way of knowing that the rate
 * was much too high over the last 7 days, it will inevitably conclude that the sudden drop of outgoing flow calls for a
 * lower fee rate.</li>
 * <li>Actions are proposed based on long term data and on very recent events. For the former category,
 * this class produces consistent results even when consulted intermittently (e.g. once a day). Actions of the latter
 * category are only suggested if they happened in the last few minutes. For these immediate actions, it is thus
 * expected that {@linkcode Actions.get} is run with updated statistics immediately after each change and that the
 * actions are then executed immediately. Obviously, for this to work correctly, the clocks of the lightning node and
 * the computer calling {@linkcode Actions.get} must be in sync.</li>
 * <li>Base fees on all channels are assumed to remain constant. The currently set base fee is used to calculate the
 * rate paid by past forwards.</li>
 * <li>If there are past outgoing forwards for a channel, the fee rate paid by the last forward is assumed to have
 * been in effect up to the point when {@linkcode Actions.get} is run. If no outgoing forwards were made in the past
 * 30 days and the channel has been open for that length of time, this class can only suggest to drop the fee rate to
 * zero, due to the fact that there is no way to determine whether the fee has been lowered before, see above.</li>
 * <li>Payments sent to or received from other nodes are neither expected to occur regularly nor is any attempt made to
 * anticipate them. While a single payment can skew fee calculation only in the short to medium term, regular
 * substantial payments will probably lower the profitability of the node.</li>
 * <li>With the exception of channels that did not ever see any outgoing forwards (see above), fees are always increased
 * or decreased relative to the fee rate paid by the last outgoing forward. For a fee increase, if the new fee target
 * happens to lie below the currently set fee rate, it is assumed that there is a good reason for the higher rate and
 * no action will be suggested. The opposite happens for fee decreases. These rules allow for human intervention and
 * also ensure that actions based on long term data will not interfere with immediate actions.</li>
 * <li>There is an ongoing effort to adjust channel balances to the given targets. Therefore, if a channel balance
 * stays below the minimum balance for long periods of time, this is taken as an indicator that the fee rate on the
 * channel itself is too low for rebalancing to succeed. It is thus raised depending on how long the balance has been
 * staying below the minimum. On the other hand, if a channel balance stays above the maximum for long, this means that
 * incoming flow was forwarded to channels with fees set too low. In order for rebalancing to work in the opposite
 * direction the fees on those channels should therefore be raised depending on how long the balance has been staying
 * above the maximum.</li>
 * </ul>
 * The actions are calculated as outlined below:
 * <ul>
 * <li>Observe incoming and outgoing flow of each channel and set the local balance target to optimize liquidity.
 * For example, very few channels have a good balance between incoming and outgoing forwards. It's much more likely for
 * a channel to have &gt;90% of its routing flow going out or coming in. For these channels it makes little sense to set
 * the balance target to half their capacity. On the other hand, it neither makes sense to target a local balance of
 * &gt;90% or &lt;10% (depending on flow direction), as doing so would preclude most routing in the other direction.
 * Such bidirectional routing is highly desirable (because it reduces rebalancing) and should therefore not be made
 * impossible by low liquidity. This is why the suggested actions will not let channel balance go below or above a given
 * limit (e.g. 25% and 75%).</li>
 * <li>Set the target of the total local balance of the node to the sum of the target balances of all channels.</li>
 * <li>Monitor individual channel balance. If the balance falls below certain thresholds, this means that the fee on the
 * channel itself is too low and should therefore be raised immediately. If channel balance raises above certain
 * thresholds, this means that the recent incoming flow was forwarded to channels with fees too low and the fees on
 * those channels should be raised immediately.</li>
 * <li>If the local balance stays close to or above the target and no forwarding flow is outgoing over long periods of
 * time, this means that the fee on the channel is too high and should be reduced slowly until it either reaches 0 or
 * outgoing flow reduces the balance.</li>
 * <li>If the local balance stays substantially below the target and rebalancing success is very low, the fee is likely
 * too low (as rebalancing sets the current fee as an upper limit) and should be increased slowly.</li>
 * </ul>
 * Note that the actions suggested by this class deliberately do not define how the targets should be reached. Some
 * targets can be trivially reached with automation (e.g. fees) others are much harder (e.g. individual channel
 * balances) or even even downright impossible to reach automatically (e.g. total node balance). An external component
 * should therefore define how these actions should be implemented.
 */
export class Actions {
    public static *get({ channels }: INodeStats, config: ActionsConfig) {
        let actual = 0;
        let target = 0;
        let max = 0;

        for (const [id, stats] of channels.entries()) {
            const channelBalanceAction = this.getChannelBalanceAction(id, stats, config);
            actual += channelBalanceAction.actual;
            target += channelBalanceAction.target;
            max += channelBalanceAction.max;

            this.updateStats(stats, channelBalanceAction);
            yield* this.filterBalanceAction(channelBalanceAction);
            yield* this.getFeeActions(id, channels, config);
        }

        const nodeBalanceAction = {
            entity: "node",
            variable: "balance",
            priority: this.getPriority(4, actual, target, config.minRebalanceDistance * max),
            actual,
            target,
            max,
            reason: "This is the sum of the target balances of all channels.",
        } satisfies Action;

        yield* this.filterBalanceAction(nodeBalanceAction);
    }

    private static getChannelBalanceAction(
        id: string,
        {
            partnerAlias,
            capacity,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            local_balance,
            incomingForwards: incoming,
            outgoingForwards: outgoing,
        }: ChannelStats,
        {
            minChannelBalanceFraction,
            minRebalanceDistance: maxBalanceDeviationFraction,
            minChannelForwards,
            largestForwardMarginFraction,
        }: ActionsConfig,
    ): Action {
        const createAction = (targetBalance: number, reason: string) => {
            const target = Math.round(targetBalance);

            return {
                entity: "channel",
                id,
                alias: partnerAlias,
                priority: this.getPriority(2, local_balance, target, maxBalanceDeviationFraction * capacity),
                variable: "balance",
                actual: local_balance,
                target,
                max: capacity,
                reason,
            } as const;
        };

        const optimalBalance =
            Math.round(outgoing.totalTokens / (incoming.totalTokens + outgoing.totalTokens) * capacity);

        if (Number.isNaN(optimalBalance) || incoming.count + outgoing.count < minChannelForwards) {
            return createAction(
                0.5 * capacity,
                `There are fewer forwards (${incoming.count + outgoing.count}) than required (${minChannelForwards}) ` +
                "to predict future flow, defaulting to half the capacity.",
            );
        }

        const largestForwardMarginMultiplier = (1 + largestForwardMarginFraction);

        // What minimum balance do we need to have in the channel to accommodate the largest outgoing forward?
        // To accommodate still larger future forwards, we apply the multiplier.
        const minLargestForwardBalance = Math.round(outgoing.maxTokens * largestForwardMarginMultiplier);

        // What maximum balance can we have in the channel to accommodate the largest incoming forward? To
        // accommodate still larger future forwards, we apply the multiplier.
        const maxLargestForwardBalance = Math.round(capacity - (incoming.maxTokens * largestForwardMarginMultiplier));

        const marginPercent = Math.round(largestForwardMarginFraction * 100);

        if (minLargestForwardBalance > maxLargestForwardBalance) {
            // eslint-disable-next-line no-warning-comments
            // TODO: "Increase" the channel capacity?
            return createAction(
                0.5 * capacity,
                `The sum of the largest incoming (${incoming.maxTokens}) and outgoing (${outgoing.maxTokens}) ` +
                `forwards + ${marginPercent}% exceeds the capacity of ${capacity}, defaulting to half the capacity.`,
            );
        }

        const minBalance = Math.round(minChannelBalanceFraction * capacity);

        if (optimalBalance < minBalance) {
            return createAction(
                minBalance,
                `The optimal balance according to flow (${optimalBalance}) is below the minimum balance.`,
            );
        }

        const maxBalance = capacity - minBalance;

        if (optimalBalance > maxBalance) {
            return createAction(
                maxBalance,
                `The optimal balance according to flow (${optimalBalance}) is above the maximum balance.`,
            );
        }

        if (optimalBalance < minLargestForwardBalance) {
            // eslint-disable-next-line no-warning-comments
            // TODO: "Increase" the channel capacity?
            return createAction(
                minLargestForwardBalance,
                `The optimal balance according to flow (${optimalBalance}) is below the minimum balance to route ` +
                `the largest past outgoing forward of ${outgoing.maxTokens} + ${marginPercent}%.`,
            );
        }

        if (optimalBalance > maxLargestForwardBalance) {
            // eslint-disable-next-line no-warning-comments
            // TODO: "Increase" the channel capacity?
            return createAction(
                maxLargestForwardBalance,
                `The optimal balance according to flow (${optimalBalance}) is above the maximum balance to route ` +
                `the largest past incoming forward of ${incoming.maxTokens} + ${marginPercent}%.`,
            );
        }

        return createAction(optimalBalance, "This is the optimal balance according to flow.");
    }

    // eslint-disable-next-line @typescript-eslint/naming-convention
    private static updateStats({ local_balance, history }: MutableChannelStats, { target, max }: Action) {
        let balance = local_balance;

        for (const changes of history.values()) {
            for (const change of changes) {
                change.setData(balance, this.getDistance(balance, target, max));
                balance += change.amount;
            }
        }
    }

    private static *getFeeActions(id: string, channels: ReadonlyMap<string, ChannelStats>, config: ActionsConfig) {
        const channel = channels.get(id);

        if (!channel) {
            throw new Error("Channel statistics not found!");
        }

        for (const historyEntry of this.getHistory(channel, config)) {
            if (yield* this.getFeeAction(id, channel, historyEntry, channels, config)) {
                break;
                // TODO no outgoing forwards in the last 30 days
            }
        }
    }

    private static *filterBalanceAction(action: Action) {
        if (action.priority > 1) {
            yield action;
        }
    }

    private static getPriority(base: number, actual: number, target: number, deviation: number) {
        return base ** Math.floor(Math.abs(actual - target) / deviation);
    }

    private static getDistance(balance: number, target: number, max: number) {
        return balance <= target ? (balance / target) - 1 : (balance - target) / (max - target);
    }

    // Provides the already filtered history relevant to choose a new fee for the given channel.
    // For a channel with the balance below the minimum, returns all changes that lowered the balance. Returns the
    // opposite for a channel with the current balance above the maximum. Returns all changes for all other channels.
    private static *getHistory(channel: ChannelStats, config: ActionsConfig) {
        const getFraction = this.getFractionFunction(channel, config);

        for (const [time, changes] of channel.history) {
            for (const change of changes) {
                const fraction = getFraction?.(change.balance);

                if (this.isRelevant(channel, config, change.amount)) {
                    yield { time, change, fraction } as const;
                }
            }
        }
    }

    private static *getFeeAction(
        id: string,
        channel: ChannelStats,
        { time, change, fraction }: YieldType<typeof this.getHistory>,
        channels: ReadonlyMap<string, ChannelStats>,
        config: ActionsConfig,
    ) {
        const elapsedMilliseconds = Date.now() - new Date(time).valueOf();

        if (fraction) {
            const isRecent = elapsedMilliseconds < 5 * 60 * 1000;
            // For recent changes we depend on the fraction only, for older changes we also consider how long we were
            // out of bounds.
            const addFraction = isRecent ? 0.5 * fraction : fraction; // TODO long term fee increase

            // For all changes that pushed the local balance below the minimum or above the maximum, we calculate the
            // resulting fee increase. In the end we choose the highest fee increase for each channel. This approach
            // guarantees that we do the "right thing", even when there are conflicting increases from "emergency"
            // measures and long term measures. For example, a channel could have had a balance slightly below the
            // minimum for two weeks when another outgoing forward reduces the balance slightly more. When this code is
            // run immediately afterwards, it will produce two fee increases. An "emergency" one (designed to curb
            // further outflow) and a long term one, which is designed to slowly raise the fee to the point where
            // rebalances are able to increase outgoing liquidity. In this case it is likely that the long term fee
            // increase is higher than the immediate one. On the other hand, when the time span between the two outgoing
            // forwards is much shorter, it is likely that the immediate fee increase is higher.
            if (change instanceof OutgoingForward) {
                yield* this.getIncreaseFeeAction(
                    id,
                    channel,
                    config,
                    this.increaseFeeRate(change.amount, change.fee, channel.base_fee, addFraction),
                    `The most recent outgoing forward took the balance to ${change.balance}.`, // TODO message
                );
            } else if (change instanceof IncomingForward) {
                const { amount, balance, fee, outgoingChannelId } = change;
                const outgoingChannel = channels.get(outgoingChannelId);

                if (!outgoingChannel) {
                    throw new Error("Outgoing channel statistics not found!");
                }

                yield* this.getIncreaseFeeAction(
                    outgoingChannelId,
                    outgoingChannel,
                    config,
                    this.increaseFeeRate(-amount - fee, fee, outgoingChannel.base_fee, addFraction),
                    `An incoming forward in channel ${id} (${channel.partnerAlias}) took its balance ` +
                    `to ${balance} and was routed out through this channel.`, // TODO message
                );
            }
        } else if (change instanceof OutgoingForward) {
            const subtractFraction = elapsedMilliseconds / 30 / 24 / 60 / 60 / 1000; // TODO: take days from settings

            yield* this.getDecreaseFeeAction(
                id,
                channel,
                config,
                this.decreaseFeeRate(change.amount, change.fee, channel.base_fee, subtractFraction),
                `The most recent outgoing forward took place on ${time}.`,
            );

            return true;
        }

        return false;
    }

    private static *getIncreaseFeeAction(
        id: string,
        channel: ChannelStats,
        config: ActionsConfig,
        targetFee: number,
        reason: string,
    ) {
        if (targetFee > channel.fee_rate) {
            yield this.createFeeAction(id, channel, config, targetFee, reason);
        }
    }

    private static *getDecreaseFeeAction(
        id: string,
        channel: ChannelStats,
        config: ActionsConfig,
        targetFee: number,
        reason: string,
    ) {
        if (targetFee < channel.fee_rate) {
            yield this.createFeeAction(id, channel, config, targetFee, reason);
        }
    }

    private static increaseFeeRate(amount: number, fee: number, baseFee: number, addFraction: number) {
        // If the fee rate has been really low then the formula wouldn't increase it meaningfully. An increase to
        // at least 30 seems like a good idea.
        return Math.max(this.getFeeRate(amount, fee, baseFee) * (1 + addFraction), 30);
    }

    private static decreaseFeeRate(amount: number, fee: number, baseFee: number, subtractFraction: number) {
        return Math.max(this.getFeeRate(amount, fee, baseFee) * (1 - subtractFraction), 0);
    }

    private static getFractionFunction(channel: ChannelStats, config: ActionsConfig) {
        const { capacity } = channel;
        const minBalance = Math.round(capacity * config.minChannelBalanceFraction);

        return this.choose(channel, config, {
            belowMin: (balance: number) => 1 - (balance / minBalance),
            between: undefined,
            aboveMax: (balance: number) => 1 - ((capacity - balance) / minBalance),
        });
    }

    private static isRelevant(channel: ChannelStats, config: ActionsConfig, amount: number) {
        return this.choose(channel, config, { belowMin: amount > 0, between: true, aboveMax: amount < 0 });
    }

    private static choose<T>(
        // eslint-disable-next-line @typescript-eslint/naming-convention
        { local_balance, capacity }: ChannelStats,
        { minChannelBalanceFraction }: ActionsConfig,
        { belowMin, between, aboveMax }: { readonly belowMin: T; readonly between: T; readonly aboveMax: T },
    ) {
        const minBalance = minChannelBalanceFraction * capacity;

        if (local_balance < minBalance) {
            return belowMin;
        } else if (local_balance > capacity - minBalance) {
            return aboveMax;
        }

        return between;
    }

    private static getFeeRate(amount: number, fee: number, baseFee: number) {
        return Math.round((fee - baseFee) / amount * 1_000_000);
    }

    private static createFeeAction(
        id: string,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        { partnerAlias, fee_rate }: ChannelStats,
        { maxFeeRate }: ActionsConfig,
        targetFee: number,
        reason: string,
    ) {
        const target = Math.round(targetFee);

        return {
            entity: "channel",
            id,
            alias: partnerAlias,
            priority: 1,
            variable: "feeRate",
            actual: fee_rate,
            target,
            max: maxFeeRate,
            reason,
        } as const satisfies Action;
    }

    private constructor() { /* Intentionally empty */ }
}

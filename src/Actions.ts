// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import type { BalanceChange, IChannelStats } from "./ChannelStats.js";
import { IncomingForward, OutgoingForward } from "./ChannelStats.js";
import type { DeepReadonly } from "./DeepReadonly.js";
import type { INodeStats } from "./NodeStats.js";

/**
 * Exposes various configuration variables that are used by {@linkcode Actions.get} to propose changes.
 * @description Some variables refer to the distance of the local balance from the target balance. This is a
 * normalized value to make algorithms independent from the channel capacity. A distance of 0 means that the local
 * balance is equal to the target balance. -1 signifies the local balance being 0, 1 means that the balance is equal
 * to the capacity of the channel. So, a value of -0.3 equates to the current balance being 30% less than the target.
 * However, a value of +0.3 means that the current balance is equal to the target balance + 30% of the (capacity -
 * target balance). This different calculation of negative and positive distance "automatically" introduces different
 * limits for channels with a target balance far below or above 50% of the capacity. For example, a channel with a
 * local target balance of 70% and {@linkcode ActionsConfig.minFeeIncreaseDistance} of 0.5 could have a local balance
 * varying between 35% and 85% without any fee increases ever being proposed.
 */
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
     * suggested. A value close to 0 means that rebalancing is proposed even if the target deviates very little (0
     * itself is not allowed as that equates to infinite priority for a difference of even 1 satoshi). 1 means that no
     * rebalancing is ever suggested.
     */
    readonly minRebalanceDistance: number;

    /** The fraction to be added to the largest past forward to allow for even larger forwards in the future. */
    readonly largestForwardMarginFraction: number;

    /**
     * The minimum absolute distance from the target a channel balance can have before fee increase actions are
     * suggested. A value close to 0 means that the proposed fee changes are rather large (0 itself is not allowed as
     * that equates to the {@linkcode ActionsConfig.maxFeeRate} being suggested for every fee increase. 1 means that no
     * fee increases are ever suggested. Values around 0.4 are probably sensible.
     */
    readonly minFeeIncreaseDistance: number;

    /** The number of days a channel can be without outgoing forwards before fee decrease actions are suggested. */
    readonly feeDecreaseWaitDays: number;

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
 * stays substantially below the target for long periods of time, this is taken as an indicator that the fee rate on the
 * channel itself is too low for rebalancing to succeed. It is thus raised depending on how long the balance has been
 * staying below the target. On the other hand, if a channel balance stays substantially above the target for long, this
 * means that incoming flow was forwarded to channels with fees set too low. In order for rebalancing to work in the
 * opposite direction the fees on those channels should therefore be raised depending on how long the balance has been
 * staying above the target.</li>
 * </ul>
 * The actions are calculated as outlined below:
 * <ul>
 * <li>Observe incoming and outgoing flow of each channel and set the local balance target to optimize liquidity.
 * For example, very few channels have a good balance between incoming and outgoing forwards. It's much more likely for
 * a channel to have &gt;90% of its routing flow going out or coming in. For these channels it makes little sense to set
 * the balance target to half their capacity. On the other hand, it neither makes sense to target a local balance of
 * &gt;90% or &lt;10% (depending on flow direction), as doing so would preclude most routing in the other direction.
 * Such bidirectional routing is highly desirable (because it reduces rebalancing) and should therefore not be made
 * impossible by low liquidity. This is why the suggested actions will not let channel balance go below or above
 * {@linkcode ActionsConfig.minChannelBalanceFraction} (e.g. 25% and 75%).</li>
 * <li>Set the target of the total local balance of the node to the sum of the target balances of all channels.</li>
 * <li>Monitor individual channel balance. If the distance of the local balance to the target falls below
 * -{@linkcode ActionsConfig.minFeeIncreaseDistance}, this means that the fee on the channel itself is too low and
 * should therefore be raised. If channel balance raises above +{@linkcode ActionsConfig.minFeeIncreaseDistance}, this
 * means that incoming flow was forwarded to channels with fees too low and the fees on those channels should be raised.
 * </li>
 * <li>If the target balance distance stays above -{@linkcode ActionsConfig.minFeeIncreaseDistance} and no forwarding
 * flow is outgoing for more than {@linkcode ActionsConfig.feeDecreaseWaitDays}, this means that the fee on the channel
 * is too high and should be reduced slowly until it either reaches 0 or outgoing flow reduces the balance.</li>
 * </ul>
 * Note that the actions suggested by this class deliberately do not define how the targets should be reached. Some
 * targets can be trivially reached with automation (e.g. fees) others are much harder (e.g. individual channel
 * balances) or even even downright impossible to reach automatically (e.g. total node balance). An external component
 * should therefore define how these actions should be implemented.
 */
export class Actions {
    public constructor(stats: INodeStats, private readonly config: ActionsConfig) {
        this.channels = new Map([...stats.channels.values()].map(
            (channel) => ([channel, Actions.getChannelBalanceAction(channel, config)]),
        ));
    }

    public *get() {
        let actual = 0;
        let target = 0;
        let max = 0;

        for (const balanceAction of this.channels.values()) {
            actual += balanceAction.actual;
            target += balanceAction.target;
            max += balanceAction.max;
            yield* Actions.filterBalanceAction(balanceAction);
        }

        const nodeBalanceAction: Action = {
            entity: "node",
            variable: "balance",
            priority: Actions.getPriority(
                4,
                Actions.getTargetBalanceDistance(actual, target, max),
                this.config.minRebalanceDistance,
            ),
            actual,
            target,
            max,
            reason: "This is the sum of the target balances of all channels.",
        };

        yield* Actions.filterBalanceAction(nodeBalanceAction);
        yield* this.getFeeActions();
    }

    private static getChannelBalanceAction(
        {
            // eslint-disable-next-line @typescript-eslint/naming-convention
            properties: { id, partnerAlias, capacity, local_balance },
            incomingForwards: incoming,
            outgoingForwards: outgoing,
        }: IChannelStats,
        {
            minChannelBalanceFraction,
            minRebalanceDistance,
            minChannelForwards,
            largestForwardMarginFraction,
        }: ActionsConfig,
    ): Action {
        const createAction = (targetBalance: number, reason: string): Action => {
            const target = Math.round(targetBalance);

            return {
                entity: "channel",
                id,
                alias: partnerAlias,
                priority: this.getPriority(
                    2,
                    this.getTargetBalanceDistance(local_balance, target, capacity),
                    minRebalanceDistance,
                ),
                variable: "balance",
                actual: local_balance,
                target,
                max: capacity,
                reason,
            };
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
            // TODO: "Increase" the channel capacity?
            return createAction(
                minLargestForwardBalance,
                `The optimal balance according to flow (${optimalBalance}) is below the minimum balance to route ` +
                `the largest past outgoing forward of ${outgoing.maxTokens} + ${marginPercent}%.`,
            );
        }

        if (optimalBalance > maxLargestForwardBalance) {
            // TODO: "Increase" the channel capacity?
            return createAction(
                maxLargestForwardBalance,
                `The optimal balance according to flow (${optimalBalance}) is above the maximum balance to route ` +
                `the largest past incoming forward of ${incoming.maxTokens} + ${marginPercent}%.`,
            );
        }

        return createAction(optimalBalance, "This is the optimal balance according to flow.");
    }

    private static *filterBalanceAction(action: Action) {
        if (action.priority > 1) {
            yield action;
        }
    }

    private static getTargetBalanceDistance(balance: number, target: number, capacity: number) {
        return balance <= target ? (balance / target) - 1 : (balance - target) / (capacity - target);
    }

    private static getPriority(base: number, distance: number, minRebalanceDistance: number) {
        return base ** Math.floor(Math.abs(distance) / minRebalanceDistance);
    }

    // Provides the already filtered history relevant to choose a new fee for the given channel.
    // For a channel with a negative target balance distance, returns all changes that lowered the balance below (or
    // further below) minFeeIncreaseDistance up to the point where the target balance distance goes back below
    // minFeeIncreaseDistance. Returns the opposite for a channel with a positive target balance distance. Returns all
    // changes for all other channels.
    private static *filterHistory<T extends BalanceChange>(
        history: DeepReadonly<BalanceChange[]>,
        ctor: new (...args: never[]) => T,
        done: (change: Readonly<BalanceChange>) => boolean,
    ) {
        for (const change of history) {
            if (done(change)) {
                return;
            } else if (change instanceof ctor) {
                yield change;
            }
        }
    }

    // eslint-disable-next-line @typescript-eslint/naming-convention
    private static getFeeRate({ amount, fee }: OutgoingForward, { properties: { base_fee } }: IChannelStats) {
        return Math.round((fee - base_fee) / amount * 1_000_000);
    }

    private readonly channels: ReadonlyMap<IChannelStats, Action>;

    private *getFeeActions() {
        for (const channelEntry of this.channels.entries()) {
            if (channelEntry[0].history.length > 0) {
                yield* this.getFeeAction(channelEntry);
            } else {
                // TODO: channel without any forwards or payments
            }
        }
    }

    private *getFeeAction([channel, { target }]: readonly [IChannelStats, Action]) {
        const getDistance =
            (balance: number) => Actions.getTargetBalanceDistance(balance, target, channel.properties.capacity);

        const currentDistance = getDistance(channel.properties.local_balance);

        if (currentDistance <= -this.config.minFeeIncreaseDistance) {
            const done = (c: Readonly<BalanceChange>) => getDistance(c.balance) > -this.config.minFeeIncreaseDistance;
            const forwards = [...Actions.filterHistory(channel.history, OutgoingForward, done)];

            if (forwards.length > 0) {
                yield* this.getMaxIncreaseFeeAction(channel, currentDistance, forwards);
            } else {
                // TODO: The below bounds balance is not due to outgoing forwards, still raise the fees to help
                // rebalancing?
            }

            return;
        // Potentially raising the fee due to forwards coming in through channels that are above bounds only makes
        // sense if this channel itself is within bounds.
        } else if (currentDistance < this.config.minFeeIncreaseDistance) {
            // For any channel with outgoing forwards, it is possible that the majority of the outgoing flow is
            // coming from channels with a balance above bounds. Apparently, ongoing efforts at rebalancing
            // (see assumptions) are unable to rebalance this excess balance back into this channel, which means
            // that the fee for this channel is too low.
            const outgoingForwards = [...Actions.filterHistory(channel.history, OutgoingForward, () => false)];

            if (!outgoingForwards[0]) {
                // TODO: Drop the fee to zero if the channel has been open for more than 30 days.
                return;
            }

            // eslint-disable-next-line unicorn/prefer-native-coercion-functions
            const filter = <T extends NonNullable<unknown>>(c: T | undefined): c is T => Boolean(c);

            const incomingChannels = [...new Set(outgoingForwards.map((f) => f.incomingChannel))].
                map((c) => this.getChannel(c)).
                // eslint-disable-next-line unicorn/no-array-callback-reference
                filter(filter);

            // We consider all above bounds inflow and compare that to the outflow that happened in the same
            // time window.
            const { earliestTime, amount: aboveBoundsInflow } =
                this.getAllWeightedAboveBoundsInflow(channel, incomingChannels);

            const earliestIsoTime = new Date(earliestTime).toISOString();

            const totalOutflow =
                outgoingForwards.filter((f) => f.time >= earliestIsoTime).reduce((p, c) => p + c.amount, 0);

            // When all above bounds inflow of a single channel went out through this channel, the following ratio
            // can be as low as config.minFeeIncreaseDistance (because the inflow is weighted with the current
            // target balance distance of the incoming channel). When the balance of the incoming channel is as
            // close to the capacity as possible, the ratio will approach 1.
            const ratio = Math.abs(aboveBoundsInflow / totalOutflow);

            if (ratio > this.config.minFeeIncreaseDistance) {
                const feeRate = Actions.getFeeRate(outgoingForwards[0], channel);

                const newFeeRate = Math.min(
                    Math.round(feeRate * (1 + (ratio - this.config.minFeeIncreaseDistance))),
                    this.config.maxFeeRate,
                );

                if (newFeeRate > channel.properties.fee_rate) {
                    const channelNames =
                        incomingChannels.map(([{ properties: { id, partnerAlias } }]) => `${id} (${partnerAlias})`);

                    const reason = `Outflow coming in through the channel(s) ${channelNames.join(", ")} since ` +
                        `${earliestTime} moved the balance in those channels above bounds.`;

                    yield this.createFeeAction(channel, newFeeRate, reason);
                }

                return;
            }
        }

        // We get here only if we're either above bounds *or* within bounds *and* no forwards routed out
        // through this channel contributed substantially to the incoming channel being above bounds.
        yield* this.getFeeDecreaseAction(channel, currentDistance);
    }

    private *getMaxIncreaseFeeAction(channel: IChannelStats, currentDistance: number, forwards: OutgoingForward[]) {
        // For all changes that pushed the target balance distance below bounds, we calculate the resulting fee
        // increase. In the end we choose the highest fee increase. This approach guarantees that we do the "right
        // thing", even when there are conflicting increases from "emergency" measures and long term measures. For
        // example, a channel could have had a balance slightly below the minimum for two weeks when another
        // outgoing forward reduces the balance slightly more. When this code is run immediately afterwards, it will
        // produce two fee increases. An "emergency" one (designed to curb further outflow) and a long term one,
        // which is designed to slowly raise the fee to the point where rebalances are able to increase outgoing
        // liquidity. In this case it is likely that the long term fee increase is higher than the immediate one. On
        // the other hand, when the time span between the two outgoing forwards is much shorter, it is likely that
        // the immediate fee increase is higher.
        const getIncreaseFeeAction = (change: OutgoingForward) => {
            const feeRate = Actions.getFeeRate(change, channel);
            const elapsedMilliseconds = Date.now() - new Date(change.time).valueOf();
            const addFraction = this.getIncreaseFraction(elapsedMilliseconds, currentDistance);
            // If the fee rate has been really low then the formula wouldn't increase it meaningfully. An
            // increase to at least 30 seems like a good idea.
            const newFeeRate = Math.max(Math.round(feeRate * (1 + addFraction)), 30);

            const reason =
                `The current distance from the target balance is ${currentDistance}, the outgoing forward at ` +
                `${change.time} contributed to that situation and paid ${feeRate}ppm.`;

            return this.createFeeAction(channel, newFeeRate, reason);
        };

        const actions = forwards.map((forward) => getIncreaseFeeAction(forward));
        const action = actions.reduce((p, c) => (p.target > c.target ? p : c));

        if (action.target > channel.properties.fee_rate) {
            yield action;
        }
    }

    private getChannel(channel: IChannelStats | undefined) {
        if (channel) {
            const action = this.channels.get(channel);

            if (!action) {
                throw new Error("Channel not found!");
            }

            return [channel, action] as const;
        }

        return undefined;
    }

    private getAllWeightedAboveBoundsInflow(
        outgoingChannel: IChannelStats,
        incomingChannels: ReadonlyArray<readonly [IChannelStats, Action]>,
    ) {
        let earliestTime = Date.now();
        let amount = 0;

        for (const incomingChannel of incomingChannels) {
            const channelData = this.getWeightedAboveBoundsInflow(outgoingChannel, incomingChannel);
            earliestTime = Math.min(earliestTime, channelData.earliestTime);
            amount += channelData.amount;
        }

        return { earliestTime, amount };
    }

    private createFeeAction(
        // eslint-disable-next-line @typescript-eslint/naming-convention
        { properties: { id, partnerAlias, fee_rate } }: IChannelStats,
        target: number,
        reason: string,
    ): Action {
        return {
            entity: "channel",
            id,
            alias: partnerAlias,
            priority: 1,
            variable: "feeRate",
            actual: fee_rate,
            target,
            max: this.config.maxFeeRate,
            reason,
        };
    }

    private *getFeeDecreaseAction(channel: IChannelStats, currentDistance: number) {
        // If target balance distance is either within bounds or above, we simply look for the latest outgoing
        // forward and drop the fee depending on how long ago it happened. There is no immediate component here,
        // because lower fees are very unlikely to attract outgoing forwards for several hours.
        const forward = Actions.filterHistory(channel.history, OutgoingForward, () => false).next().value;

        if (forward) {
            const elapsedMilliseconds = Date.now() - new Date(forward.time).valueOf();
            const elapsedDays = (elapsedMilliseconds / 24 / 60 / 60 / 1000) - this.config.feeDecreaseWaitDays;

            if (elapsedDays > 0) {
                const feeRate = Actions.getFeeRate(forward, channel);
                // TODO: take 30 days from settings
                const newFeeRate = Math.max(Math.round(feeRate * (1 - (elapsedDays / 30))), 0);

                if (newFeeRate < channel.properties.fee_rate) {
                    const reason =
                        `The current distance from the target balance is ${currentDistance} and the most recent ` +
                        `outgoing forward took place on ${forward.time} and paid ${feeRate}ppm.`;

                    yield this.createFeeAction(channel, newFeeRate, reason);
                }
            }
        }
    }

    private getIncreaseFraction(elapsedMilliseconds: number, currentDistance: number) {
        const isRecent = elapsedMilliseconds < 5 * 60 * 1000;
        const rawFraction = Math.abs(currentDistance) - this.config.minFeeIncreaseDistance;
        // TODO: get days from config
        return isRecent ? rawFraction : rawFraction * (elapsedMilliseconds / 7 / 24 / 60 / 60 / 1000);
    }

    private getWeightedAboveBoundsInflow(
        outgoingChannel: IChannelStats,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        [{ properties: { local_balance, capacity }, history }, { target }]: readonly [IChannelStats, Action],
    ) {
        let earliestTime = Date.now();
        let amount = 0;
        const getDistance = (balance: number) => Actions.getTargetBalanceDistance(balance, target, capacity);
        const currentDistance = getDistance(local_balance);

        if (currentDistance >= this.config.minFeeIncreaseDistance) {
            const done = (c: Readonly<BalanceChange>) => getDistance(c.balance) < this.config.minFeeIncreaseDistance;

            for (const forward of Actions.filterHistory(history, IncomingForward, done)) {
                if (forward.outgoingChannel === outgoingChannel) {
                    earliestTime = Math.min(earliestTime, new Date(forward.time).valueOf());
                    amount += forward.amount;
                }
            }
        }

        return { earliestTime, amount: amount * currentDistance };
    }
}

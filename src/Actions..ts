import type { ChannelStats } from "./ChannelStats.js";
import type { NodeStats } from "./NodeStats.js";

export interface ActionsConfig {
    /**
     * The minimal balance a channel should have as a fraction of its capacity.
     * @description For example, 0.25 means that suggested actions will not let the local balance fall below 1/4 of the
     * channel capacity and not let it go above 3/4 (such that the remote balance will not fall below 1/4).
     */
    readonly minChannelBalanceFraction: number;

    /**
     * The maximum deviation from the target a variable can have as a fraction of its maximum value before corrective\
     * actions are suggested.
     */
    readonly maxDeviationFraction: number;

    /** The minimum number of past forwards routed through a channel to consider it as indicative for future flow. */
    readonly minChannelForwards: number;

    /** The fraction to be added to the largest past forward to allow for even larger forwards in the future. */
    readonly largestForwardMarginFraction: number;
}

export interface Action {
    readonly entity: "channel" | "node";
    readonly id?: string;
    readonly variable: string;
    readonly actual: number;
    readonly target: number;
    readonly max: number;
    readonly reason: string;
}

/**
 * Suggests actions for a routing lightning node to get closer to profitability and avoid situations of low liquidity.
 * @description The actions are calculated as outlined below:
 * <ul>
 * <li>Observe incoming and outgoing flow of each channel and set the local balance target to optimize liquidity.
 * For example, very few channels have a good balance between incoming and outgoing forwards. It's much more likely for
 * a channel to have &gt;95% of its routing flow going out or coming in. For these channels it makes little sense to set
 * the balance target to half their capacity. On the other hand, it neither makes sense to target a local balance of
 * &gt;95% or &lt;5% (depending on flow direction), as doing so would preclude most routing in the other direction. Such
 * bidirectional routing is highly desirable (because it reduces rebalancing) and should therefore not be made
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
    public static get({ channels }: NodeStats, config: ActionsConfig) {
        const actions =
            Object.entries(channels).map(([id, stats]) => Actions.getChannelAction(id, stats, config));

        actions.push({
            entity: "node",
            variable: "balance",
            actual: actions.reduce((p, { actual }) => p + actual, 0),
            target: actions.reduce((p, { target }) => p + target, 0),
            max: actions.reduce((p, { max }) => p + max, 0),
            reason: "This is the sum of the target balances of all channels.",
        });

        const fraction = config.maxDeviationFraction;

        return actions.filter(
            ({ actual, target, max }) => actual < target - (max * fraction) || actual > target + (max * fraction),
        );
    }

    private static getChannelAction(
        id: string,
        {
            partnerAlias,
            capacity,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            local_balance,
            incomingForwards: incoming,
            outgoingForwards: outgoing,
        }: ChannelStats,
        { minChannelBalanceFraction, minChannelForwards, largestForwardMarginFraction }: ActionsConfig,
    ): Action {
        const createAction = (target: number, reason: string) => {
            const roundedTarget = Math.round(target);
            return {
                entity: "channel",
                id: `${id} (${partnerAlias})`,
                variable: "balance",
                actual: local_balance,
                target: roundedTarget,
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

    private constructor() { /* Intentionally empty */ }
}

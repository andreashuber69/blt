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
     * The maximum deviation a variable can have as a fraction of its maximum value before corrective actions are
     * suggested.
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
            forwards: {
                incomingMaxTokens,
                incomingTotalTokens,
                incomingCount,
                outgoingMaxTokens,
                outgoingTotalTokens,
                outgoingCount,
            },
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

        const optimalBalance = Math.round(outgoingTotalTokens / (incomingTotalTokens + outgoingTotalTokens) * capacity);

        if (Number.isNaN(optimalBalance) || incomingCount + outgoingCount < minChannelForwards) {
            return createAction(
                0.5 * capacity,
                `There are fewer forwards (${incomingCount + outgoingCount}) than required (${minChannelForwards}) ` +
                "to predict future flow.",
            );
        }

        const largestForwardMarginMultiplier = (1 + largestForwardMarginFraction);

        // What minimum balance do we need to have in the channel to accommodate the largest outgoing forward?
        // To accommodate still larger future forwards, we apply the multiplier.
        const minLargestForwardBalance = Math.round(outgoingMaxTokens * largestForwardMarginMultiplier);

        // What maximum balance can we have in the channel to accommodate the largest incoming forward? To
        // accommodate still larger future forwards, we apply the multiplier.
        const maxLargestForwardBalance = Math.round(capacity - (incomingMaxTokens * largestForwardMarginMultiplier));

        const marginPercent = Math.round(largestForwardMarginFraction * 100);

        if (minLargestForwardBalance > maxLargestForwardBalance) {
            // eslint-disable-next-line no-warning-comments
            // TODO: "Increase" the channel capacity?
            return createAction(
                (minLargestForwardBalance + maxLargestForwardBalance) / 2,
                `The sum of the largest incoming (${incomingMaxTokens}) and outgoing (${outgoingMaxTokens}) forwards ` +
                `+ ${marginPercent}% exceeds the capacity of ${capacity}.`,
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
                `the largest past outgoing forward of ${outgoingMaxTokens} + ${marginPercent}%.`,
            );
        }

        if (optimalBalance > maxLargestForwardBalance) {
            // eslint-disable-next-line no-warning-comments
            // TODO: "Increase" the channel capacity?
            return createAction(
                maxLargestForwardBalance,
                `The optimal balance according to flow (${optimalBalance}) is above the maximum balance to route ` +
                `the largest past incoming forward of ${incomingMaxTokens} + ${marginPercent}%.`,
            );
        }

        return createAction(optimalBalance, "This is the optimal balance according to flow.");
    }
}

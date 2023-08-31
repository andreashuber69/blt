import type { ChannelStats } from "./ChannelStats.js";
import type { NodeStats } from "./NodeStats.js";

interface ActionsConfig {
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

    /** The minimum number of past forwards rounded through a channel to consider it as indicative for future flow. */
    readonly minChannelForwards: number;
}

interface Action {
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

        const totalTarget = actions.reduce((p, { target }) => p + target, 0);

        actions.push({
            entity: "node",
            variable: "balance",
            actual: actions.reduce((p, { actual }) => p + actual, 0),
            target: totalTarget,
            max: actions.reduce((p, { max }) => p + max, 0),
            reason: `To reach optimal balance for all channels, the total balance should be ${totalTarget}.`,
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
        { minChannelBalanceFraction, minChannelForwards }: ActionsConfig,
    ): Action {
        const createAction = (target: number, reasonPrefix: string) => {
            const roundedTarget = Math.round(target);
            return {
                entity: "channel",
                id: `${id} (${partnerAlias})`,
                variable: "balance",
                actual: local_balance,
                target: roundedTarget,
                max: capacity,
                reason: `${reasonPrefix}, set target to ${roundedTarget}.`,
            } as const;
        };

        const optimalBalance = outgoingTotalTokens / (incomingTotalTokens + outgoingTotalTokens) * capacity;

        if (Number.isNaN(optimalBalance) || incomingCount + outgoingCount < minChannelForwards) {
            return createAction(0.5 * capacity, "Not enough forwards");
        }

        // What minimum balance do we need to have in the channel to accommodate the largest single outgoing forward?
        // To accommodate still larger future forwards, we add 10%.
        const minForwardBalance = outgoingMaxTokens * 1.1;

        // What maximum balance can we have in the channel to accommodate the largest single incoming forward? To
        // accommodate still larger future forwards, we add 10%.
        const maxForwardBalance = (capacity - (incomingMaxTokens * 1.1));

        if (minForwardBalance > maxForwardBalance) {
            // eslint-disable-next-line no-warning-comments
            // TODO: "Increase" the channel capacity?
            return createAction(
                (minForwardBalance + maxForwardBalance) / 2,
                "The sum of the largest incoming and outgoing forwards + 10% exceeds the capacity",
            );
        }

        const minBalance = minChannelBalanceFraction * capacity;

        if (optimalBalance < minBalance) {
            return createAction(
                minBalance,
                "The optimal balance according to flow is below the minimum balance",
            );
        }

        const maxBalance = capacity - minBalance;

        if (optimalBalance > maxBalance) {
            return createAction(
                maxBalance,
                "The optimal balance according to flow is above the maximum balance",
            );
        }

        if (optimalBalance < minForwardBalance) {
            // eslint-disable-next-line no-warning-comments
            // TODO: "Increase" the channel capacity?
            return createAction(
                minForwardBalance,
                "The optimal balance according to flow is below the minimum balance to accommodate " +
                "the largest past outgoing forward + 10%",
            );
        }

        if (optimalBalance > maxForwardBalance) {
            // eslint-disable-next-line no-warning-comments
            // TODO: "Increase" the channel capacity?
            return createAction(
                maxForwardBalance,
                "The optimal balance according to flow is above the maximum balance to accommodate " +
                "the largest past incoming forward + 10%",
            );
        }

        return createAction(optimalBalance, "Optimal balance according to flow");
    }
}

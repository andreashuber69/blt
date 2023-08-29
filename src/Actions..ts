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
            reason: `To reach optimal balance for all channels, the total balance should be ${totalTarget}`,
        });

        const fraction = config.maxDeviationFraction;

        return actions.filter(
            ({ actual, target, max }) => actual < target - (max * fraction) || actual > target + (max * fraction),
        );
    }

    private static getChannelAction(
        id: string,
        {
            forwards: { incomingTotalTokens, incomingCount, outgoingTotalTokens, outgoingCount },
            capacity,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            local_balance,
        }: ChannelStats,
        { minChannelBalanceFraction, minChannelForwards }: ActionsConfig,
    ): Action {
        const createAction = (targetFraction: number, reasonPrefix: string) => ({
            entity: "channel",
            id,
            variable: "balance",
            actual: local_balance,
            target: Math.round(targetFraction * capacity),
            max: capacity,
            reason: `${reasonPrefix}, set target to ${Math.round(targetFraction * 100)}%.`,
        } as const);

        const outgoingFraction = outgoingTotalTokens / (incomingTotalTokens + outgoingTotalTokens);

        if (Number.isNaN(outgoingFraction) || incomingCount + outgoingCount < minChannelForwards) {
            return createAction(0.5, "Not enough forwards");
        }

        if (outgoingFraction < minChannelBalanceFraction) {
            return createAction(
                minChannelBalanceFraction,
                "The outgoing percentage of the total flow is below the minimum",
            );
        }

        const maxChannelBalanceFraction = 1 - minChannelBalanceFraction;

        if (outgoingFraction > maxChannelBalanceFraction) {
            return createAction(
                maxChannelBalanceFraction,
                "The outgoing percentage of the total flow is above the maximum",
            );
        }

        return createAction(outgoingFraction, "Outgoing percentage");
    }
}

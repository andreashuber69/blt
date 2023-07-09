import type { AuthenticatedLightningArgs, GetIdentityResult } from "lightning";
import { getIdentity } from "lightning";
import { getChannels } from "./getChannels.js";
import { getForwards } from "./getForwards.js";
import { getPayments } from "./getPayments.js";
import type { YieldType } from "./YieldType.js";

// eslint-disable-next-line @typescript-eslint/naming-convention
const toSortedArray = async <T extends { readonly created_at: string }>(generator: AsyncGenerator<T>) => {
    const result = new Array<T>();

    for await (const element of generator) {
        result.push(element);
    }

    result.sort((a, b) => new Date(a.created_at).valueOf() - new Date(b.created_at).valueOf());
    return result;
};

class NodeInfoImpl implements NodeInfo {
    public constructor(
        public readonly identity: GetIdentityResult,
        public readonly channels: Channel[],
        public readonly forwards: Forward[],
        public readonly payments: Payment[],
    ) {}
}

export type Identity = Readonly<GetIdentityResult>;

export type Channel = Readonly<Awaited<ReturnType<typeof getChannels>>[number]>;

export type Forward = Readonly<YieldType<ReturnType<typeof getForwards>>>;

export type Payment = Readonly<YieldType<ReturnType<typeof getPayments>>>;

/**
 * Provides various information about a node.
 * @description All time-bound data (like {@link NodeInfo.forwards}) will be sorted earliest to latest. Apart from
 * being sorted, the data is provided as it came from LND. Further sanitation will be necessary, for example, a forward
 * may refer to a channel that is no longer open and will thus not appear in {@link NodeInfo.channels}.
 */
export interface NodeInfo {
    readonly identity: Identity;

    /** The currently open channels. */
    readonly channels: readonly Channel[];

    /** The forwards routed through the node. */
    readonly forwards: readonly Forward[];

    /** The payments made from the node. */
    readonly payments: readonly Payment[];
}

export interface NodeInfoArgs {
    /** Retrieve time-bound data up to this number of days in the past. */
    readonly days?: number;
}

/**
 * Gets information about the Node.
 * @param args The authenticated LND API object, optionally combined with a number how far back historical data should
 * be retrieved. The default is 14 days.
 */
export const getNodeInfo = async (args: AuthenticatedLightningArgs<NodeInfoArgs>): Promise<NodeInfo> => {
    const { days, ...lnd } = { days: 14, ...args };
    const before = new Date(Date.now()).toISOString();
    const after = new Date(new Date(before).valueOf() - (days * 24 * 60 * 60 * 1000)).toISOString();

    return new NodeInfoImpl(
        await getIdentity(lnd),
        await getChannels(lnd),
        await toSortedArray(getForwards({ after, before, ...lnd })),
        // eslint-disable-next-line @typescript-eslint/naming-convention
        await toSortedArray(getPayments({ created_after: after, created_before: before, ...lnd })),
    );
};

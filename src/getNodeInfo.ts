import type { AuthenticatedLightningArgs, GetIdentityResult, SubscribeToForwardsForwardEvent } from "lightning";
import { getIdentity, subscribeToChannels, subscribeToForwards, subscribeToPayments } from "lightning";
import { createRefresher } from "./createRefresher.js";
import type { Refresher } from "./createRefresher.js";
import { getChannels } from "./getChannels.js";
import { getForwards } from "./getForwards.js";
import { getPayments } from "./getPayments.js";
import { getRangeDays } from "./getRange.js";
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

const getSortedForwards = async (lnd: AuthenticatedLightningArgs, after: string, before: string) =>
    await toSortedArray(getForwards({ ...lnd, after, before }));

const getSortedPayments = async (lnd: AuthenticatedLightningArgs, after: string, before: string) =>
    // eslint-disable-next-line @typescript-eslint/naming-convention
    await toSortedArray(getPayments({ ...lnd, created_after: after, created_before: before }));

const createChannels = async (args: AuthenticatedLightningArgs) => {
    const refresh = async (c?: Channel[]) => (c ?? []).splice(0, Number.POSITIVE_INFINITY, ...await getChannels(args));
    const emitter = subscribeToChannels(args);

    const subscribe = (listener: (scheduleRefresh: boolean) => void) => {
        emitter.on("channel_opened", () => listener(true));
        emitter.on("channel_closed", () => listener(true));
    };

    const unsubscribe = () => emitter.removeAllListeners();
    return await createRefresher("channels", refresh, 10_000, subscribe, unsubscribe);
};

// eslint-disable-next-line @typescript-eslint/naming-convention
const getEarliest = <Element extends { created_at: string }>(existing: Element[], earliestDefault: string) =>
    new Date(new Date(existing.at(-1)?.created_at ?? earliestDefault).valueOf() + 1).toISOString();

const createForwards = async (args: AuthenticatedLightningArgs, after: string, before: string) => {
    const refresh = async (f?: Forward[]) => {
        const result = f ?? [];
        result.push(...await getSortedForwards(args, getEarliest(result, after), before));
        result.splice(0, result.findIndex((v) => v.created_at >= after));
        return result;
    };

    const emitter = subscribeToForwards(args);

    const subscribe = (listener: (scheduleRefresh: boolean) => void) =>
        emitter.on("forward", (e: SubscribeToForwardsForwardEvent) => listener(e.is_confirmed));

    const unsubscribe = () => emitter.removeAllListeners();
    return await createRefresher("forwards", refresh, 10_000, subscribe, unsubscribe);
};

const createPayments = async (args: AuthenticatedLightningArgs, after: string, before: string) => {
    const refresh = async (p?: Payment[]) => {
        const result = p ?? [];
        result.push(...await getSortedPayments(args, getEarliest(result, after), before));
        result.splice(0, result.findIndex((v) => v.created_at >= after));
        return result;
    };

    const emitter = subscribeToPayments(args);
    const subscribe = (listener: (scheduleRefresh: boolean) => void) => emitter.on("payment", () => listener(true));
    const unsubscribe = () => emitter.removeAllListeners();
    return await createRefresher("payments", refresh, 10_000, subscribe, unsubscribe);
};

class NodeInfoImpl implements NodeInfo {
    public constructor(
        public readonly identity: GetIdentityResult,
        public readonly channels: Refresher<"channels", Channel[]>,
        public readonly forwards: Refresher<"forwards", Forward[]>,
        public readonly payments: Refresher<"payments", Payment[]>,
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
    readonly channels: Refresher<"channels", Channel[]>;

    /** The forwards routed through the node. */
    readonly forwards: Refresher<"forwards", Forward[]>;

    /** The payments made from the node. */
    readonly payments: Refresher<"payments", Payment[]>;
}

export interface NodeInfoArgs {
    /** Retrieve time-bound data up to this number of days in the past. */
    readonly days?: number;
}

/**
 * Gets information about the node.
 * @param args The authenticated LND API object, optionally combined with a number how far back historical data should
 * be retrieved. The default is 14 days.
 */
export const getNodeInfo = async (args: AuthenticatedLightningArgs<NodeInfoArgs>): Promise<NodeInfo> => {
    const { days = 14, ...lnd } = { ...args };
    const { after, before } = getRangeDays(days);

    return new NodeInfoImpl(
        await getIdentity(lnd),
        await createChannels(lnd),
        await createForwards(lnd, after, before),
        await createPayments(lnd, after, before),
    );
};

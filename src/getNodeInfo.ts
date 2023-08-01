// eslint-disable-next-line max-classes-per-file
import type { AuthenticatedLightningArgs, GetIdentityResult, SubscribeToForwardsForwardEvent } from "lightning";
import { getIdentity, subscribeToChannels, subscribeToForwards, subscribeToPayments } from "lightning";
import { createRefresher } from "./createRefresher.js";
import type { Refresher, RefresherArgs } from "./createRefresher.js";
import { getChannels } from "./getChannels.js";
import { getForwards } from "./getForwards.js";
import { getPayments } from "./getPayments.js";
import { getRangeDays } from "./getRange.js";
import type { TimeBoundElement } from "./TimeBoundElement.js";
import type { YieldType } from "./YieldType.js";

const toSortedArray = async <Element extends TimeBoundElement>(generator: AsyncGenerator<Element>) => {
    const result = new Array<Element>();

    for await (const element of generator) {
        result.push(element);
    }

    result.sort((a, b) => a.created_at.localeCompare(b.created_at));
    return result;
};

const getSortedForwards = async (lnd: AuthenticatedLightningArgs, after: string, before: string) =>
    await toSortedArray(getForwards({ ...lnd, after, before }));

const getSortedPayments = async (lnd: AuthenticatedLightningArgs, after: string, before: string) =>
    // eslint-disable-next-line @typescript-eslint/naming-convention
    await toSortedArray(getPayments({ ...lnd, created_after: after, created_before: before }));


abstract class ArrayRefresherArgs<Name extends string, Element> implements RefresherArgs<Name, Element[]> {
    public abstract readonly name: Name;

    public abstract readonly refresh: (current?: Element[]) => Promise<Element[]>;

    public readonly delayMilliseconds = 10_000;

    public abstract readonly subscribe: (listener: (scheduleRefresh: boolean) => void) => void;

    public abstract readonly unsubscribe: () => void;

    public constructor(protected readonly args: AuthenticatedLightningArgs) {}
}

abstract class FullRefresherArgs<Name extends string, Element> extends ArrayRefresherArgs<Name, Element> {
    public readonly refresh = async (current?: Element[]) => {
        const result = current ?? [];
        result.splice(0, Number.POSITIVE_INFINITY, ...await this.getAllData());
        return result;
    };

    protected abstract readonly getAllData: () => Promise<Element[]>;
}

// eslint-disable-next-line max-len
abstract class PartialRefresherArgs<Name extends string, Element extends TimeBoundElement> extends ArrayRefresherArgs<Name, Element> {
    public constructor(args: AuthenticatedLightningArgs, private readonly days: number) {
        super(args);
    }

    public readonly refresh = async (current?: Element[]) => {
        const result = current ?? [];
        const { after, before } = getRangeDays(this.days);
        result.splice(0, result.findIndex((v) => v.created_at >= after)); // Delete old data
        const getDataAfter = new Date(new Date(result.at(-1)?.created_at ?? after).valueOf() + 1).toISOString();
        result.push(...await this.getDataRange(getDataAfter, before));
        return result;
    };

    protected abstract readonly getDataRange: (after: string, before: string) => Promise<Element[]>;
}

class ChannelsRefresherArgs extends FullRefresherArgs<"channels", Channel> {
    public override readonly name = "channels";

    public override readonly subscribe = (listener: (scheduleRefresh: boolean) => void) => {
        this.emitter.on("channel_opened", () => listener(true));
        this.emitter.on("channel_closed", () => listener(true));
    };

    public override readonly unsubscribe = () => this.emitter.removeAllListeners();

    protected override readonly getAllData = async () => await getChannels(this.args);

    private readonly emitter = subscribeToChannels(this.args);
}

class ForwardsRefresherArgs extends PartialRefresherArgs<"forwards", Forward> {
    public override readonly name = "forwards";

    public override readonly subscribe = (listener: (scheduleRefresh: boolean) => void) =>
        this.emitter.on("forward", (e: SubscribeToForwardsForwardEvent) => listener(e.is_confirmed));

    public override unsubscribe = () => this.emitter.removeAllListeners();

    protected override getDataRange = async (after: string, before: string) =>
        await getSortedForwards(this.args, after, before);

    private readonly emitter = subscribeToForwards(this.args);
}

class PaymentsRefresherArgs extends PartialRefresherArgs<"payments", Payment> {
    public override readonly name = "payments";

    public override readonly subscribe = (listener: (scheduleRefresh: boolean) => void) =>
        this.emitter.on("payment", () => listener(true));

    public override unsubscribe = () => this.emitter.removeAllListeners();

    protected override getDataRange = async (after: string, before: string) =>
        await getSortedPayments(this.args, after, before);

    private readonly emitter = subscribeToPayments(this.args);
}

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

    return new NodeInfoImpl(
        await getIdentity(lnd),
        await createRefresher(new ChannelsRefresherArgs(lnd)),
        await createRefresher(new ForwardsRefresherArgs(lnd, days)),
        await createRefresher(new PaymentsRefresherArgs(lnd, days)),
    );
};

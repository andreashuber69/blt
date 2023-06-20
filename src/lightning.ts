import { getForwards as lndGetForwards } from "lightning";
import type { AuthenticatedLightningArgs, AuthenticatedLightningMethod, GetForwardsArgs } from "lightning";

const toIsoString = (date: number) => new Date(date).toISOString();

const getDateRange = <const After extends string, const Before extends string>(
    days: number,
    after: After,
    before: Before,
) => {
    const now = Date.now();

    // The suggested fix does not seem to work
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    return {
        [after]: toIsoString(now - (days * 24 * 60 * 60 * 1000)),
        [before]: toIsoString(now),
    } as Record<After | Before, string>;
};

const limit = 50;

interface Days {
    readonly days: number;
}

const getAfterBeforeData = async <
    Args extends AuthenticatedLightningArgs,
    Return extends Record<Prop, unknown[]> & { next?: string },
    Prop extends keyof Return,
    const After extends string,
    const Before extends string,
>(
    func: AuthenticatedLightningMethod<Args, Return>,
    args: Args & Days,
    after: After,
    before: Before,
    prop: Prop,
) => {
    const baseArgs = { ...args, ...getDateRange(args.days, after, before) };
    let pageArgs: Args = { ...baseArgs, limit };
    let result = new Array<Return[Prop][number]>();

    for (
        let batch = await func(pageArgs);
        batch[prop].length === limit;
        pageArgs = { ...baseArgs, token: batch.next }
    ) {
        result = [...result, ...batch[prop]];
    }

    return result;
};

export const getForwards = async (args: Days & GetForwardsArgs) =>
    await getAfterBeforeData(lndGetForwards, args, "after", "before", "forwards");

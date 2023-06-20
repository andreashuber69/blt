import type { AuthenticatedLightningArgs, AuthenticatedLightningMethod } from "lightning";

const toIsoString = (date: number) => new Date(date).toISOString();

const getDateRange = <const After extends string, const Before extends string>(
    days: number,
    after: After,
    before: Before,
): Record<After | Before, string> => {
    const now = Date.now();

    // The suggested fix does not seem to work
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    return {
        [after]: toIsoString(now - (days * 24 * 60 * 60 * 1000)),
        [before]: toIsoString(now),
    } as Record<After | Before, string>;
};

export const getRecentData = async <Args extends AuthenticatedLightningArgs, Return>(
    func: AuthenticatedLightningMethod<Args, Return>,
    args: Args,
    days: number,
): Promise<Return> =>
    await func({ ...args, ...getDateRange(days, "after", "before"), limit: 10 });


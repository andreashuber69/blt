import type { AuthenticatedLightningArgs, AuthenticatedLightningMethod } from "lightning";

const toIsoString = (date: number) => new Date(date).toISOString();

export interface OptionalArgs {
    days?: number | undefined;
    limit?: number | undefined;
}

export const getLatestData = async <
    Args extends AuthenticatedLightningArgs,
    Return extends Record<Prop, unknown[]> & { next?: string },
    const After extends string,
    const Before extends string,
    Prop extends keyof Return,
>(
    func: AuthenticatedLightningMethod<Args, Return>,
    args: Args & OptionalArgs,
    after: After,
    before: Before,
    prop: Prop,
) => {
    const { limit, days } = args;
    let baseArgs = { ...args };
    delete baseArgs.limit;
    delete baseArgs.days;

    if (days) {
        const span = days * 24 * 60 * 60 * 1000;
        baseArgs = { ...baseArgs, [after]: toIsoString(Date.now() - span), [before]: toIsoString(Date.now()) };
    }

    let result = new Array<Return[Prop][number]>();

    let currentArgs: Args & OptionalArgs = { ...baseArgs, limit };
    let batch: Return;

    do {
        // eslint-disable-next-line no-await-in-loop
        batch = await func(currentArgs);
        result = [...result, ...batch[prop]];
        currentArgs = { ...baseArgs, token: batch.next };
    // We only want to retrieve multiple pages if days is set, otherwise one page is enough
    // eslint-disable-next-line no-unmodified-loop-condition
    } while (days && batch[prop].length > 0);

    return result;
};

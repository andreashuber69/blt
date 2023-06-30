import type { AuthenticatedLightningArgs, AuthenticatedLightningMethod, PaginationArgs } from "lightning";

const toIsoString = (date: number) => new Date(date).toISOString();

const getArgs = <const After extends string, const Before extends string>(
    args: AuthenticatedLightningArgs<PaginationArgs> & RangeArgs,
    after: After,
    before: Before,
    token?: string,
) => {
    const { days, limit, token: _, ...pureArgs } = args;

    if (token) {
        return { ...pureArgs, token };
    }

    const argsWithLimit = { ...pureArgs, ...(limit ? { limit } : {}) };

    if (days) {
        const span = days * 24 * 60 * 60 * 1000;
        return { ...argsWithLimit, [after]: toIsoString(Date.now() - span), [before]: toIsoString(Date.now()) };
    }

    return argsWithLimit;
};

export interface RangeArgs {
    // From now, how many days back should timestamped data be retrieved?
    days?: number;
}

export const getPaginatedArrayData = async <
    Return extends Record<Prop, unknown[]> & { next?: string },
    const After extends string,
    const Before extends string,
    Prop extends keyof Return,
>(
    func: AuthenticatedLightningMethod<AuthenticatedLightningArgs<PaginationArgs>, Return>,
    args: AuthenticatedLightningArgs<PaginationArgs> & RangeArgs,
    after: After,
    before: Before,
    prop: Prop,
) => {
    let page: Array<Return[Prop][number]>;
    let token: string | undefined;
    const result = new Array<Return[Prop][number]>();

    do {
        // eslint-disable-next-line no-await-in-loop
        ({ [prop]: page, next: token } = await func(getArgs(args, after, before, token)));
        result.push(...page);
    } while (Boolean(args.days) && page.length > 0);

    return result;
};
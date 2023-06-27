import type { AuthenticatedLightningArgs, AuthenticatedLightningMethod, PaginationArgs } from "lightning";

const toIsoString = (date: number) => new Date(date).toISOString();

const getArgs = <const After extends string, const Before extends string>(
    args: AuthenticatedLightningArgs<PaginationArgs> & OptionalArgs, after: After, before: Before, token?: string,
) => {
    // We need to remove token from args
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { days, limit, token: unused, ...pureArgs } = args;

    if (token) {
        return { ...pureArgs, token };
    } else if (days) {
        const span = days * 24 * 60 * 60 * 1000;

        return {
            ...pureArgs,
            ...(limit ? { limit } : {}),
            [after]: toIsoString(Date.now() - span),
            [before]: toIsoString(Date.now()),
        };
    }

    return { ...pureArgs, ...(limit ? { limit } : {}) };
};

export interface OptionalArgs {
    days?: number;
    limit?: number;
}

export const getPagedArrayData = async <
    Return extends Record<Prop, unknown[]> & { next?: string },
    const After extends string,
    const Before extends string,
    Prop extends keyof Return,
>(
    func: AuthenticatedLightningMethod<AuthenticatedLightningArgs<PaginationArgs>, Return>,
    args: AuthenticatedLightningArgs<PaginationArgs> & OptionalArgs,
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

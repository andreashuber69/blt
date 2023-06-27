import type { AuthenticatedLightningArgs, AuthenticatedLightningMethod, PaginationArgs } from "lightning";

const toIsoString = (date: number) => new Date(date).toISOString();

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
    // We need to remove token from args
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { days, limit, token, ...pureArgs } = args;
    let currentArgs: AuthenticatedLightningArgs<PaginationArgs>;

    if (days) {
        const span = days * 24 * 60 * 60 * 1000;

        currentArgs = {
            ...pureArgs,
            ...(limit ? { limit } : {}),
            [after]: toIsoString(Date.now() - span),
            [before]: toIsoString(Date.now()),
        };
    } else {
        currentArgs = { ...pureArgs };
    }

    const result = new Array<Return[Prop][number]>();
    let getNextPage: boolean;

    do {
        // eslint-disable-next-line no-await-in-loop
        const { [prop]: page, next } = await func(currentArgs);
        result.push(...page);
        currentArgs = { ...pureArgs, ...(next ? { token: next } : {}) };
        getNextPage = Boolean(days) && page.length > 0;
    } while (getNextPage);

    return result;
};

import type { AuthenticatedLightningArgs, AuthenticatedLightningMethod, PaginationArgs } from "lightning";

const getArgs = ({ limit, token: _, ...pureArgs }: AuthenticatedLightningArgs<PaginationArgs>, token?: string) => {
    if (token) {
        return { ...pureArgs, token };
    }

    return { ...pureArgs, ...(limit ? { limit } : {}) };
};

export const getPaginatedArrayData = async <
    Return extends Record<Prop, unknown[]> & { next?: string },
    Prop extends keyof Return,
>(
    func: AuthenticatedLightningMethod<AuthenticatedLightningArgs<PaginationArgs>, Return>,
    args: AuthenticatedLightningArgs<PaginationArgs>,
    prop: Prop,
) => {
    let page: Array<Return[Prop][number]>;
    let next: string | undefined;
    const result = new Array<Return[Prop][number]>();

    do {
        // eslint-disable-next-line no-await-in-loop
        ({ [prop]: page, next } = await func(getArgs(args, next)));
        result.push(...page);
    } while (!args.limit && next);

    return result;
};

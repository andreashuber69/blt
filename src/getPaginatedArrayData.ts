import type { AuthenticatedLightningArgs, AuthenticatedLightningMethod, PaginationArgs } from "lightning";

const getArgs = ({ limit, token: _, ...pureArgs }: AuthenticatedLightningArgs<PaginationArgs>, token?: string) => {
    if (token) {
        return { ...pureArgs, token };
    }

    return { ...pureArgs, ...(limit ? { limit } : {}) };
};

// eslint-disable-next-line func-style
export async function *getPaginatedArrayData<
    Return extends Record<Prop, unknown[]> & { next?: string },
    Prop extends keyof Return,
>(
    func: AuthenticatedLightningMethod<AuthenticatedLightningArgs<PaginationArgs>, Return>,
    args: AuthenticatedLightningArgs<PaginationArgs>,
    prop: Prop,
) {
    let page: Array<Return[Prop][number]>;
    let next: string | undefined;

    do {
        // eslint-disable-next-line no-await-in-loop
        ({ [prop]: page, next } = await func(getArgs(args, next)));

        for (const element of page) {
            yield element;
        }
    } while (!args.limit && next);
}

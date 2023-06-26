import type { AuthenticatedLightningArgs, AuthenticatedLightningMethod } from "lightning";

const toIsoString = (date: number) => new Date(date).toISOString();

export interface OptionalArgs {
    days?: number;
    limit?: number;
}

export const getPagedArrayData = async <
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
    let currentArgs: Args & OptionalArgs;

    if (args.days) {
        const span = args.days * 24 * 60 * 60 * 1000;
        currentArgs = { ...args, [after]: toIsoString(Date.now() - span), [before]: toIsoString(Date.now()) };
        delete currentArgs.days;
    } else {
        currentArgs = { ...args };
    }

    const result = new Array<Return[Prop][number]>();

    let getNextPage: boolean;

    do {
        // eslint-disable-next-line no-await-in-loop
        const { [prop]: page, next: token } = await func(currentArgs);
        result.push(...page);
        delete currentArgs.limit;
        currentArgs = { ...currentArgs, token };
        getNextPage = Boolean(args.days) && page.length > 0;
    } while (getNextPage);

    return result;
};

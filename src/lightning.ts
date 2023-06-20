import { getForwards as lndGetForwards } from "lightning";
import type { AuthenticatedLightningArgs, AuthenticatedLightningMethod, GetForwardsArgs } from "lightning";

const limit = 50;

interface Days {
    readonly days: number;
}

const toIsoString = (date: number) => new Date(date).toISOString();

const getAfterBeforeData = async <
    Args extends AuthenticatedLightningArgs,
    Return extends Record<Prop, unknown[]> & { next?: string },
    const After extends string,
    const Before extends string,
    Prop extends keyof Return,
>(
    func: AuthenticatedLightningMethod<Args, Return>,
    args: Args & Days,
    after: After,
    before: Before,
    prop: Prop,
) => {
    const span = args.days * 24 * 60 * 60 * 1000;
    const baseArgs = { ...args, [after]: toIsoString(Date.now() - span), [before]: toIsoString(Date.now()) };
    let result = new Array<Return[Prop][number]>();

    for (
        // eslint-disable-next-line sort-vars
        let pageArgs: Args = { ...baseArgs, limit }, batch = await func(pageArgs);
        batch[prop].length === limit;
        pageArgs = { ...baseArgs, token: batch.next }
    ) {
        result = [...result, ...batch[prop]];
    }

    return result;
};

export const getForwards = async (args: Days & GetForwardsArgs) =>
    await getAfterBeforeData(lndGetForwards, args, "after", "before", "forwards");

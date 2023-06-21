import type { AuthenticatedLightningArgs, AuthenticatedLightningMethod } from "lightning";

const limit = 10;
const toIsoString = (date: number) => new Date(date).toISOString();

export interface Days {
    readonly days: number;
}

export const getLatestData = async <
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

    for (let batch = await func({ ...baseArgs, limit }); batch[prop].length > 0;) {
        result = [...result, ...batch[prop]];
        // eslint-disable-next-line no-await-in-loop
        batch = await func({ ...baseArgs, token: batch.next });
    }

    return result;
};

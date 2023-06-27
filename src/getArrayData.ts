import type { AuthenticatedLightningArgs, AuthenticatedLightningMethod } from "lightning";

export const getArrayData = async <Return extends Record<Prop, unknown[]>, Prop extends keyof Return>(
    func: AuthenticatedLightningMethod<AuthenticatedLightningArgs, Return>,
    args: AuthenticatedLightningArgs,
    prop: Prop,
) =>
    (await func(args))[prop];

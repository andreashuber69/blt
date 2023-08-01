// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import type { AuthenticatedLightningArgs } from "lightning";
import { ArrayRefresherArgs } from "./ArrayRefresherArgs.js";
import { getRangeDays } from "./getRange.js";
import type { TimeBoundElement } from "./TimeBoundElement.js";

// eslint-disable-next-line max-len
export abstract class PartialRefresherArgs<Name extends string, Element extends TimeBoundElement> extends ArrayRefresherArgs<Name, Element> {
    public constructor(args: AuthenticatedLightningArgs, private readonly days: number) {
        super(args);
    }

    public override readonly refresh = async (current?: Element[]) => {
        const result = current ?? [];
        const { after, before } = getRangeDays(this.days);
        result.splice(0, result.findIndex((v) => v.created_at >= after)); // Delete old data
        const getDataAfter = new Date(new Date(result.at(-1)?.created_at ?? after).valueOf() + 1).toISOString();
        result.push(...await this.getDataRange(getDataAfter, before));
        return result;
    };

    protected abstract readonly getDataRange: (after: string, before: string) => Promise<Element[]>;
}

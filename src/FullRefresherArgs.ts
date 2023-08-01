// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import { ArrayRefresherArgs } from "./ArrayRefresherArgs.js";

export abstract class FullRefresherArgs<Name extends string, Element> extends ArrayRefresherArgs<Name, Element> {
    public override readonly refresh = async (current?: Element[]) => {
        const result = current ?? [];
        result.splice(0, Number.POSITIVE_INFINITY, ...await this.getAllData());
        return result;
    };

    protected abstract readonly getAllData: () => Promise<Element[]>;
}

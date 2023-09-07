// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import { pick } from "./pick.js";

export const generatorPick = async function *<Element extends object, K extends keyof Element>(
    generator: AsyncGenerator<Element, void>,
    keys: readonly K[],
) {
    for await (const element of generator) {
        yield pick(element, keys);
    }
};

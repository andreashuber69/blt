// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import { pick } from "./pick.js";

export const arrayPick = <T extends object, K extends keyof T>(array: readonly T[], keys: readonly K[]) =>
    array.map((element) => pick(element, keys));

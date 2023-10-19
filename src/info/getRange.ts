import { getMilliseconds } from "./getMilliseconds.js";

// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
const getRangeAfter = (after: Date) => ({ after: after.toISOString(), before: new Date().toISOString() });

export const getRangeDays = (days: number) => getRangeAfter(new Date(Date.now() - getMilliseconds(days)));

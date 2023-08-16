// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
const getRangeAfter = (after: Date) => ({ after: after.toISOString(), before: new Date(Date.now()).toISOString() });

export const getRangeDays = (days: number) => getRangeAfter(new Date(Date.now() - (days * 24 * 60 * 60 * 1000)));

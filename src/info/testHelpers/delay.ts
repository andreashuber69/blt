// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
export const delay = async (delayMilliseconds: number) =>
    await new Promise((resolve) => setTimeout(resolve, delayMilliseconds));

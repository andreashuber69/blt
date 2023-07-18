export const delay = async (delayMilliseconds: number) =>
    await new Promise((resolve) => setTimeout(resolve, delayMilliseconds));


// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
export const getNewForwardStats = () => ({
    incomingCount: 0,
    incomingTokens: 0,
    outgoingCount: 0,
    outgoingTokens: 0,
});

export type ForwardStats = Readonly<ReturnType<typeof getNewForwardStats>>;

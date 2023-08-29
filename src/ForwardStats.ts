
// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
export const getNewForwardStats = () => ({
    incomingMaxTokens: 0,
    incomingCount: 0,
    incomingTotalTokens: 0,
    outgoingMaxTokens: 0,
    outgoingCount: 0,
    outgoingTotalTokens: 0,
});

export type ForwardStats = Readonly<ReturnType<typeof getNewForwardStats>>;

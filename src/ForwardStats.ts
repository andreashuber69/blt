
// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
export const getNewForwardStats = () => new class {
    public incomingCount = 0;
    public incomingTokens = 0;
    public outgoingCount = 0;
    public outgoingTokens = 0;
}();

export type ForwardStats = Readonly<ReturnType<typeof getNewForwardStats>>;


// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
export interface ForwardStats {
    incomingCount: number;
    incomingTokens: number;
    outgoingCount: number;
    outgoingTokens: number;
}

export const getNewForwardStats = () => new class implements ForwardStats {
    public incomingCount = 0;
    public incomingTokens = 0;
    public outgoingCount = 0;
    public outgoingTokens = 0;
}();

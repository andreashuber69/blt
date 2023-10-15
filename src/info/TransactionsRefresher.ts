// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import type { AuthenticatedLightningArgs } from "lightning";
import { subscribeToTransactions } from "lightning";

import type { ChainTransaction } from "../lightning/getChainTransactions.js";
import { getChainTransactions } from "../lightning/getChainTransactions.js";
import { FullRefresher } from "./FullRefresher.js";
import type { Emitters, IRefresher } from "./Refresher.js";

type TransactionsEmitters = Emitters<"transactions">;

export interface ITransactionsRefresherArgs {
    /** The {@linkcode AuthenticatedLightningArgs} of the node the data should be retrieved from. */
    readonly lndArgs: AuthenticatedLightningArgs;

    /** The length of time each refresh and notify operation will be delayed after a change has been detected. */
    readonly delayMilliseconds?: number;
}

export type TransactionsElement = ChainTransaction;

/** Implements {@linkcode IRefresher} for closed channels. */
export class TransactionsRefresher extends FullRefresher<"transactions", TransactionsElement, TransactionsEmitters> {
    /**
     * Creates a new object implementing {@linkcode IRefresher} for closed channels.
     * @param args See {@linkcode ITransactionsRefresherArgs}.
     */
    public static async create(args: ITransactionsRefresherArgs) {
        return await this.init(new TransactionsRefresher(args));
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    protected override async getAllData(lndArgs: AuthenticatedLightningArgs) {
        return (await getChainTransactions({ ...lndArgs })).filter((t) => t.is_confirmed);
    }

    protected override onServerChanged({ transactions }: TransactionsEmitters, listener: () => void) {
        transactions.on("chain_transaction", listener);
    }

    protected override createServerEmitters(lndArgs: AuthenticatedLightningArgs) {
        return { transactions: subscribeToTransactions(lndArgs) } as const;
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    private constructor(args: ITransactionsRefresherArgs) {
        super({ ...args, name: "transactions" });
    }
}

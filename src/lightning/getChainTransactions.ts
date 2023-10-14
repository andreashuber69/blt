// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import type { GetChainTransactionsArgs } from "lightning";
import { getChainTransactions as lndGetChainTransactions } from "lightning";

import { arrayPick } from "./arrayPick.js";
import { getArrayData } from "./getArrayData.js";

const properties = ["created_at", "id", "is_confirmed"] as const;

export const getChainTransactions = async (args: GetChainTransactionsArgs) =>
    arrayPick(await getArrayData(lndGetChainTransactions, args, "transactions"), properties);

export type ChainTransaction = Awaited<ReturnType<typeof getChainTransactions>>[number];

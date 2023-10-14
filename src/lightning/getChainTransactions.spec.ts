// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import { getChainTransactions } from "./getChainTransactions.js";
import { testArrayResultFunction } from "./testHelpers/testArrayResultFunction.js";

testArrayResultFunction(getChainTransactions);

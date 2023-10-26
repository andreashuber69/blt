// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import { getPayments } from "./getPayments.js";
import { testPaginatedArrayResultFunction } from "./testHelpers/testPaginatedArrayResultFunction.js";

await testPaginatedArrayResultFunction(getPayments, "created_after", "created_before");

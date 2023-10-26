// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import { getFailedPayments } from "./getFailedPayments.js";
import { testPaginatedArrayResultFunction } from "./testHelpers/testPaginatedArrayResultFunction.js";

await testPaginatedArrayResultFunction(getFailedPayments, "created_after", "created_before");

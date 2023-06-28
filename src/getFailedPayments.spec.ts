import { getFailedPayments } from "./getFailedPayments.js";
import { testPaginatedArrayResultFunction } from "./test/testPaginatedArrayResultFunction.js";

testPaginatedArrayResultFunction(getFailedPayments);

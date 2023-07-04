import { getFailedPayments } from "./getFailedPayments.js";
import { testPaginatedArrayResultFunction } from "./test/testPaginatedArrayResultFunction.js";

testPaginatedArrayResultFunction(getFailedPayments, "created_after", "created_before");

import { getPayments } from "./getPayments.js";
import { testPaginatedArrayResultFunction } from "./test/testPaginatedArrayResultFunction.js";

testPaginatedArrayResultFunction(getPayments, "created_after", "created_before");

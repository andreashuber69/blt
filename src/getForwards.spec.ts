// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import { getForwards } from "./getForwards.js";
import { testPaginatedArrayResultFunction } from "./test/testPaginatedArrayResultFunction.js";

testPaginatedArrayResultFunction(getForwards, "after", "before");

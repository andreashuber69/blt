// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import { getForwards } from "./getForwards.js";
import { testPaginatedArrayResultFunction } from "./testHelpers/testPaginatedArrayResultFunction.js";

await testPaginatedArrayResultFunction(getForwards, "after", "before");

// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import { getClosedChannels } from "./getClosedChannels.js";
import { testArrayResultFunction } from "./testHelpers/testArrayResultFunction.js";

await testArrayResultFunction(getClosedChannels);

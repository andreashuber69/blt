// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import { getChannels } from "./getChannels.js";
import { testArrayResultFunction } from "./testHelpers/testArrayResultFunction.js";

await testArrayResultFunction(getChannels);

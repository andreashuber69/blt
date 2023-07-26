#!/usr/bin/env node
// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import { createRequire } from "node:module";
import { connectLnd } from "./connectLnd.js";
import { getNodeInfo } from "./getNodeInfo.js";

interface PackageJson {
    readonly name: string;
    readonly version: string;
}

try {
    // Simple typescript alternatives to calling require below lead to the outDir containing the file package.json and
    // the directory src with all the code. This is due to how the ts compiler automatically determines the rootDir from
    // imports. There are alternatives to calling require, but these seem overly complicated:
    // https://stackoverflow.com/questions/58172911/typescript-compiler-options-trying-to-get-flat-output-to-outdir
    const { name, version } = createRequire(import.meta.url)("../package.json") as PackageJson;
    console.log(`${name} v${version}`);
    const start = Date.now();

    const nodeInfo = await getNodeInfo(await connectLnd());
    const properties = ["channels", "forwards", "payments"] as const;

    const handler = (changedProperty: string) => {
        for (const property of properties) {
            if (changedProperty === property) {
                console.log(`${property}: ${nodeInfo[property].data.length}`);
            }
        }
    };

    nodeInfo.channels.on("channels", handler);
    nodeInfo.forwards.on("forwards", handler);
    nodeInfo.payments.on("payments", handler);

    console.log(`Entering event loop: ${(Date.now() - start) / 1000}`);

    // eslint-disable-next-line no-constant-condition
    while (true) {
        // eslint-disable-next-line no-await-in-loop
        await new Promise((resolve) => setTimeout(resolve, 10_000));
    }
} catch (error: unknown) {
    console.error(error);
    process.exit(1);
} finally {
    console.log("\r\n");
}

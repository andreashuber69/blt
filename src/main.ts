#!/usr/bin/env node
// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import { createRequire } from "node:module";
import type { AuthenticatedLightningArgs } from "lightning";
import { deletePayment } from "lightning";

import { connectLnd } from "./connectLnd.js";
import { getFailedPayments } from "./getFailedPayments.js";
import { getNodeInfo } from "./getNodeInfo.js";

interface PackageJson {
    readonly name: string;
    readonly version: string;
}

const deleteOldFailedPayments = async (authenticatedLnd: AuthenticatedLightningArgs) => {
    console.log("Deleting old failed payments...");

    const getFailedPaymentArgs = {
        ...authenticatedLnd,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        created_after: new Date(2018, 0).toISOString(),
        // eslint-disable-next-line @typescript-eslint/naming-convention
        created_before: new Date(Date.now() - (14 * 24 * 60 * 60 * 1000)).toISOString(),
    };

    let count = 0;

    for await (const { id } of getFailedPayments(getFailedPaymentArgs)) {
        await deletePayment({ ...authenticatedLnd, id });
        ++count;
    }

    console.log(`Deleted ${count} old failed payments.`);
};

const getInfo = async (authenticatedLnd: AuthenticatedLightningArgs) => {
    console.log("Getting node info...");
    const nodeInfo = await getNodeInfo(authenticatedLnd);

    const handler = (property: "channels") => console.log(`${property}: ${nodeInfo[property].data.length}`);

    const timeBoundHandler = (property: "forwards" | "payments") => {
        const { [property]: { data } } = nodeInfo;
        const aux = data.at(-1)?.tokens;
        console.log(`${property}: ${data.length} ${data.at(0)?.created_at} - ${data.at(-1)?.created_at} ${aux}`);
    };

    handler("channels");
    nodeInfo.channels.onChanged(handler);
    timeBoundHandler("forwards");
    nodeInfo.forwards.onChanged(timeBoundHandler);
    timeBoundHandler("payments");
    nodeInfo.payments.onChanged(timeBoundHandler);
    return nodeInfo;
};

try {
    // Simple typescript alternatives to calling require below lead to the outDir containing the file package.json and
    // the directory src with all the code. This is due to how the ts compiler automatically determines the rootDir from
    // imports. There are alternatives to calling require, but these seem overly complicated:
    // https://stackoverflow.com/questions/58172911/typescript-compiler-options-trying-to-get-flat-output-to-outdir
    const { name, version } = createRequire(import.meta.url)("../package.json") as PackageJson;
    console.log(`${name} v${version}`);
} catch (error: unknown) {
    console.error(error);
    process.exit(1);
} finally {
    console.log("\r\n");
}

console.log("Connecting...");

// eslint-disable-next-line no-constant-condition
while (true) {
    try {
        const start = Date.now();
        /* eslint-disable no-await-in-loop */
        const lnd = await connectLnd();
        await deleteOldFailedPayments(lnd);
        const info = await getInfo(lnd);
        console.log(`Connected successfully: ${(Date.now() - start) / 1000}`);
        await new Promise<void>((resolve) => info.on("connectionLost", resolve));
        console.log("\r\nConnection lost!");
    } catch (error: unknown) {
        console.log("\r\n\r\nEncountered error:");
        console.error(error);
    }

    console.log("\r\n\r\nAttempting to reconnect...");
    await new Promise((resolve) => setTimeout(resolve, 10_000));
    /* eslint-enable no-await-in-loop */
}

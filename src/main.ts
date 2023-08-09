#!/usr/bin/env node
// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import { createRequire } from "node:module";
import { deletePayment } from "lightning";

import { connectLnd } from "./connectLnd.js";
import type { Forward } from "./Forward.js";
import { getFailedPayments } from "./getFailedPayments.js";
import { getNodeInfo } from "./getNodeInfo.js";
import type { Payment } from "./Payment.js";

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
    console.log("Connecting...");
    const authenticatedLnd = await connectLnd();

    console.log("Deleting old failed payments...");

    const getFailedPaymentArgs = {
        ...authenticatedLnd,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        created_after: new Date(2018, 0).toISOString(),
        // eslint-disable-next-line @typescript-eslint/naming-convention
        created_before: new Date(Date.now() - (14 * 24 * 60 * 60 * 1000)).toISOString(),
    };

    for await (const { id } of getFailedPayments(getFailedPaymentArgs)) {
        await deletePayment({ ...authenticatedLnd, id });
    }

    console.log("Getting node info...");
    const nodeInfo = await getNodeInfo(authenticatedLnd);

    const handler = (property: "channels") => console.log(`${property}: ${nodeInfo[property].data.length}`);

    const timeBoundHandler = (property: "forwards" | "payments") => {
        const { [property]: { data } } = nodeInfo;
        const aux = data.at(-1)?.tokens;
        console.log(`${property}: ${data.length} ${data.at(0)?.created_at} - ${data.at(-1)?.created_at} ${aux}`);
    };

    const channels = "channels";
    handler(channels);
    nodeInfo.channels.on(channels, handler);
    const forwards = "forwards";
    timeBoundHandler(forwards);
    nodeInfo.forwards.on(forwards, timeBoundHandler);
    const payments = "payments";
    timeBoundHandler(payments);
    nodeInfo.payments.on(payments, timeBoundHandler);

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

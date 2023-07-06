#!/usr/bin/env node
// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import { createRequire } from "node:module";
import { deletePayment } from "lightning";
import { getFailedPayments } from "./getFailedPayments.js";
import { connectLnd } from "./test/connectLnd.js";

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

    const oneDay = 24 * 60 * 60 * 1000;
    const start = Date.now();
    const after = new Date(start - (365 * oneDay)).toISOString();
    const before = new Date(start - (30 * oneDay)).toISOString();

    const authenticatedLnd = await connectLnd();
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const failedPayments = getFailedPayments({ created_after: after, created_before: before, ...authenticatedLnd });
    let deleteCount = 0;

    // eslint-disable-next-line @typescript-eslint/naming-convention
    for await (const { id, created_at } of failedPayments) {
        console.log(created_at);
        await deletePayment({ ...authenticatedLnd, id });

        if (++deleteCount >= 1000) {
            break;
        }
    }

    console.log(`${(Date.now() - start) / 1000} ${deleteCount}`);
} catch (error: unknown) {
    console.error(error);
    process.exitCode = 1;
} finally {
    console.log("\r\n");
}

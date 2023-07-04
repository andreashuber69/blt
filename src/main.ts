#!/usr/bin/env node
// https://github.com/andreashuber69/blt/develop/README.md
import { createRequire } from "node:module";
import { deletePayment, getFailedPayments } from "lightning";
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

    const authenticatedLnd = await connectLnd();
    const start = Date.now();

    const { payments: failedPayments, next } =
        await getFailedPayments({ ...authenticatedLnd, token: "{\"limit\":250,\"offset\":4057}" });

    console.log(next);
    console.log(`${(Date.now() - start) / 1000} ${failedPayments.length}`);

    const oneMonth = 30 * 24 * 60 * 60 * 1000;

    // eslint-disable-next-line @typescript-eslint/naming-convention
    for (const { id, created_at } of failedPayments) {
        if (Date.now() - new Date(created_at).valueOf() > oneMonth) {
            // eslint-disable-next-line no-await-in-loop
            await deletePayment({ ...authenticatedLnd, id });
        }
    }

    console.log(`${(Date.now() - start) / 1000} ${failedPayments.length}`);
} catch (error: unknown) {
    console.error(error);
    process.exitCode = 1;
} finally {
    console.log("\r\n");
}



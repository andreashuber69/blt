#!/usr/bin/env node
// https://github.com/andreashuber69/blt/develop/README.md
import { createRequire } from "node:module";
import { authenticatedLndGrpc } from "lightning";
import { getAuthData } from "./getAuthData.js";
import { getFailedPayments } from "./getFailedPayments.js";
import { getForwards } from "./getForwards.js";

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

    const authenticatedLnd = {
        ...authenticatedLndGrpc({ ...await getAuthData(), socket: "b-pi.local:10009" }),
        days: 3,
    };

    const failedPayments = await getFailedPayments(authenticatedLnd);
    console.log(failedPayments);
    const forwards = await getForwards(authenticatedLnd);
    console.log(forwards);
} catch (error: unknown) {
    console.error(error);
    process.exitCode = 1;
} finally {
    console.log("\r\n");
}

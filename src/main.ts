#!/usr/bin/env node
// https://github.com/andreashuber69/blt/develop/README.md
import { createRequire } from "node:module";
import { createInterface } from "node:readline/promises";
import { authenticatedLndGrpc, getUtxos } from "lightning";

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

    const { stdin: input, stdout: output } = process;
    const readlineInterface = createInterface({ input, output });
    const cert = await readlineInterface.question("cert: ");
    const macaroon = await readlineInterface.question("macaroon: ");
    readlineInterface.close();
    const authenticatedLnd = authenticatedLndGrpc({ cert, macaroon, socket: "b-pi.local:10009" });
    const { utxos } = await getUtxos(authenticatedLnd);
    console.log(utxos);
} catch (error: unknown) {
    console.error(error);
    process.exitCode = 1;
} finally {
    console.log("\r\n");
}

#!/usr/bin/env node
// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import { createRequire } from "node:module";
import type { AuthenticatedLightningArgs } from "lightning";
import { deletePayment } from "lightning";

import { Actions } from "./Actions..js";
import { NodeInfo } from "./info/NodeInfo.js";
import { connectLnd } from "./lightning/connectLnd.js";
import { getFailedPayments } from "./lightning/getFailedPayments.js";
import { error, log } from "./Logger.js";
import { NodeStats } from "./NodeStats.js";

interface PackageJson {
    readonly name: string;
    readonly version: string;
}

const deleteOldFailedPayments = async (authenticatedLnd: AuthenticatedLightningArgs, days: number) => {
    log("Deleting old failed payments...");

    const getFailedPaymentArgs = {
        ...authenticatedLnd,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        created_after: new Date(2018, 0).toISOString(),
        // eslint-disable-next-line @typescript-eslint/naming-convention
        created_before: new Date(Date.now() - (days * 24 * 60 * 60 * 1000)).toISOString(),
    };

    let count = 0;

    for await (const { id } of getFailedPayments(getFailedPaymentArgs)) {
        await deletePayment({ ...authenticatedLnd, id });
        ++count;
    }

    log(`Deleted ${count} old failed payments.`);
};

const getInfo = async (authenticatedLnd: AuthenticatedLightningArgs) => {
    log("Getting node info...");
    return await NodeInfo.get({ lndArgs: authenticatedLnd });
};

try {
    // Simple typescript alternatives to calling require below lead to the outDir containing the file package.json and
    // the directory src with all the code. This is due to how the ts compiler automatically determines the rootDir from
    // imports. There are alternatives to calling require, but these seem overly complicated:
    // https://stackoverflow.com/questions/58172911/typescript-compiler-options-trying-to-get-flat-output-to-outdir
    const { name, version } = createRequire(import.meta.url)("../package.json") as PackageJson;
    log(`${name} v${version}`);
} catch (error_: unknown) {
    error(error_);
    process.exit(1);
}

log("Connecting...");

// eslint-disable-next-line no-constant-condition
while (true) {
    try {
        /* eslint-disable no-await-in-loop */
        const lnd = await connectLnd();
        const info = await getInfo(lnd);
        await deleteOldFailedPayments(lnd, info.forwards.days);

        // eslint-disable-next-line no-constant-condition
        while (true) {
            const stats = new NodeStats(info);
            log(JSON.stringify(stats.channels, undefined, 2));
            const config = { minChannelBalanceFraction: 0.25, maxDeviationFraction: 0.05, minChannelForwards: 10 };
            const actions = Actions.get(stats, config);
            log(JSON.stringify(actions, undefined, 2));

            try {
                const changed = await new Promise<string>((resolve, reject) => {
                    info.onChanged(resolve);
                    info.onError(reject);
                });

                log(`${changed} has changed.`);
            } finally {
                info.removeAllListeners();
            }
        }
    } catch (error_: unknown) {
        error(error_);
    }

    log("Attempting to reconnect in a few seconds...");
    await new Promise((resolve) => setTimeout(resolve, 10_000));
    /* eslint-enable no-await-in-loop */
}

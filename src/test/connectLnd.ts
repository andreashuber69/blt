import { readFile, writeFile } from "node:fs/promises";
import type { Interface } from "node:readline/promises";
import { createInterface } from "node:readline/promises";
import { authenticatedLndGrpc } from "lightning";

const getContents = async (name: string, readLineInterface: Interface) => {
    try {
        return await readFile(name, { encoding: "utf8" });
    } catch (error: unknown) {
        if (!(error instanceof Error)) {
            throw error;
        }

        const contents = await readLineInterface.question(`${name}: `);
        await writeFile(name, contents, { encoding: "utf8" });
        return contents;
    }
};

const getAuthData = async () => {
    const { stdin: input, stdout: output } = process;
    const readlineInterface = createInterface({ input, output });

    try {
        return {
            socket: `${await getContents("host", readlineInterface)}:10009`,
            cert: await getContents("tls.cert", readlineInterface),
            macaroon: await getContents("admin.macaroon", readlineInterface),
        };
    } finally {
        readlineInterface.close();
    }
};

export const connectLnd = async (days?: number, limit?: number) => ({
    ...authenticatedLndGrpc(await getAuthData()),
    ...(days ? { days } : {}),
    ...(limit ? { limit } : {}),
});

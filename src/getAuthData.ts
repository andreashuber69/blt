import { createInterface } from "node:readline/promises";

export const getAuthData = async () => {
    const { stdin: input, stdout: output } = process;
    const readlineInterface = createInterface({ input, output });
    const cert = await readlineInterface.question("cert: ");
    const macaroon = await readlineInterface.question("macaroon: ");
    readlineInterface.close();
    return { cert, macaroon };
};

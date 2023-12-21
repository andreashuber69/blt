// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
const getCurrentTime = () => new Date().toLocaleTimeString(undefined, { hour12: false });

export const log = (message?: unknown) => {
    const separator = `${message}`.includes("\n") ? "\n" : " ";
    console.log([getCurrentTime(), ...(message ? [message] : [])].join(separator));
};

export const error = (message?: unknown) => {
    log();
    console.error(message);
};

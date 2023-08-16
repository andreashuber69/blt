const getCurrentTime = () => `${new Date(Date.now()).toLocaleTimeString(undefined, { hour12: false })}`;

export const log = (message?: unknown) => {
    const separator = `${message}`.includes("\n") ? "\n" : " ";
    console.log([getCurrentTime(), ...(message ? [message] : [])].join(separator));
};

export const error = (message?: unknown) => {
    log();
    console.error(message);
};

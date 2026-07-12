export const logger = {
    info: (...values: unknown[]) => console.info(...values),
    warn: (...values: unknown[]) => console.warn(...values),
    error: (...values: unknown[]) => console.error(...values),
};

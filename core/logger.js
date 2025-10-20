// A simple, robust logger to avoid any potential issues with complex console styling.
export class Logger {
    static log(message) {
        console.log(`[GS StatusBar] INFO: ${message}`);
    }

    static success(message) {
        console.info(`[GS StatusBar] SUCCESS: ${message}`);
    }

    static warn(message) {
        console.warn(`[GS StatusBar] WARN: ${message}`);
    }

    static error(message, error) {
        console.error(`[GS StatusBar] ERROR: ${message}`, error);
    }
}
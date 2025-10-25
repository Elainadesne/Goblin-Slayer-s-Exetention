import { Logger } from './logger.js';
export class EventManager {
    constructor() {
        this.listeners = [];
    }

    on(event, callback) {
        const context = window.parent.SillyTavern.getContext();
        if (context && context.eventSource && context.eventTypes && context.eventTypes[event]) {
            Logger.log(`Registering listener for event: ${event}`);
            context.eventSource.on(context.eventTypes[event], callback);
            this.listeners.push({ event: context.eventTypes[event], callback });
        } else {
            Logger.warn(`Event source or event type "${event}" not found in SillyTavern context.`);
        }
    }

    teardown() {
        const context = window.parent.SillyTavern.getContext();
        if (context && context.eventSource) {
            this.listeners.forEach(({ event, callback }) => {
                try {
                    context.eventSource.removeListener(event, callback);
                } catch (e) {
                    console.error(`[GS StatusBar] Failed to remove listener for event: ${event}`, e);
                }
            });
        }
        this.listeners = [];
        console.log('[GS StatusBar] All event listeners removed.');
    }
}
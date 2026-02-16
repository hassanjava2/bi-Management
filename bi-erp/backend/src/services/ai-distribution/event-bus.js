/**
 * BI Management - AI Task Distribution
 * Event Bus - ناقل الأحداث: يلتقط كل حدث بالنظام ويحوّله لمهمة محتملة
 */

const logger = require('../../utils/logger');

const EVENT_TYPES = Object.freeze({
    PURCHASE_CONFIRMED: 'purchase_confirmed',
    INSPECTION_COMPLETE: 'inspection_complete',
    INVOICE_COMPLETED: 'invoice_completed',
    DEVICE_SOLD: 'device_sold',
    WARRANTY_CLAIM: 'warranty_claim',
    STOCK_LOW: 'stock_low',
    DAILY_TASKS: 'daily_tasks',
});

const listeners = new Map(); // eventType -> [handler, ...]
const globalListeners = [];

/**
 * Subscribe to a specific event type
 * @param {string} eventType - One of EVENT_TYPES
 * @param {function(object): Promise<void>} handler - async (payload) => {}
 */
function subscribe(eventType, handler) {
    if (!listeners.has(eventType)) {
        listeners.set(eventType, []);
    }
    listeners.get(eventType).push(handler);
}

/**
 * Subscribe to all events (for logging or central processor)
 */
function subscribeToAll(handler) {
    globalListeners.push(handler);
}

/**
 * Emit an event to all subscribers (non-blocking)
 * @param {string} eventType - One of EVENT_TYPES
 * @param {object} payload - Event data (e.g. { invoice_id, items, ... })
 */
function emit(eventType, payload = {}) {
    const fullPayload = {
        eventType,
        payload: { ...payload },
        timestamp: new Date().toISOString(),
    };

    // Notify global listeners first
    for (const handler of globalListeners) {
        setImmediate(() => {
            Promise.resolve(handler(fullPayload)).catch((err) => {
                logger.error('[EventBus] Global handler error:', err.message);
            });
        });
    }

    const handlers = listeners.get(eventType) || [];
    for (const handler of handlers) {
        setImmediate(() => {
            Promise.resolve(handler(fullPayload)).catch((err) => {
                logger.error('[EventBus] Handler error for', eventType, err.message);
            });
        });
    }
}

/**
 * Emit synchronously and wait for all handlers (for tests or when order matters)
 */
async function emitSync(eventType, payload = {}) {
    const fullPayload = {
        eventType,
        payload: { ...payload },
        timestamp: new Date().toISOString(),
    };

    await Promise.all(globalListeners.map((h) => h(fullPayload).catch((e) => { logger.error('[EventBus]', e.message); })));
    const handlers = listeners.get(eventType) || [];
    await Promise.all(handlers.map((h) => h(fullPayload).catch((e) => { logger.error('[EventBus]', e.message); })));
}

module.exports = {
    EVENT_TYPES,
    subscribe,
    subscribeToAll,
    emit,
    emitSync,
};

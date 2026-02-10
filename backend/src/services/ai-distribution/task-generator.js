/**
 * BI Management - AI Task Distribution
 * Task Generator - مولد المهام: يحول الحدث لمهمة/مهام فرعية
 * كل مهمة: نوع، أولوية، مهارات مطلوبة، وقت متوقع
 */

const { EVENT_TYPES } = require('./event-bus');

const TASK_KINDS = Object.freeze({
    INSPECTION: 'inspection',
    PREPARATION: 'preparation',
    PACKAGING: 'packaging',
    DELIVERY: 'delivery',
    CLEANING: 'cleaning',
    MAINTENANCE: 'maintenance',
    ACCOUNTING: 'accounting',
    SALES: 'sales',
    STICKER: 'sticker',
    STOCK_ORDER: 'stock_order',
    WARRANTY_INSPECT: 'warranty_inspect',
    WARRANTY_SEND: 'warranty_send',
});

const SKILL_KEYS = ['inspection', 'preparation', 'sales', 'delivery', 'cleaning', 'maintenance', 'accounting'];

function defaultTaskShape(overrides = {}) {
    return {
        taskKind: null,
        title: '',
        title_ar: '',
        priority: 'normal',
        required_skills: [],
        estimated_minutes: 60,
        source_reference: {},
        requires_approval: false,
        ...overrides,
    };
}

/**
 * Generate sub-tasks from an event payload
 * @param {object} event - { eventType, payload, timestamp }
 * @returns {Array<object>} Array of task definitions for assignment engine
 */
function generateFromEvent(event) {
    const { eventType, payload } = event;
    switch (eventType) {
        case EVENT_TYPES.PURCHASE_CONFIRMED:
            return generatePurchaseConfirmed(payload);
        case EVENT_TYPES.INSPECTION_COMPLETE:
            return generateInspectionComplete(payload);
        case EVENT_TYPES.INVOICE_COMPLETED:
            return generateInvoiceCompleted(payload);
        case EVENT_TYPES.DEVICE_SOLD:
            return generateDeviceSold(payload);
        case EVENT_TYPES.WARRANTY_CLAIM:
            return generateWarrantyClaim(payload);
        case EVENT_TYPES.STOCK_LOW:
            return generateStockLow(payload);
        case EVENT_TYPES.DAILY_TASKS:
            return generateDailyTasks(payload);
        default:
            return [];
    }
}

function generatePurchaseConfirmed(payload) {
    const tasks = [];
    const invoiceId = payload.invoice_id || payload.invoiceId;
    const items = payload.items || [];
    const totalDevices = items.reduce((sum, i) => sum + (Number(i.quantity) || 1), 0);

    for (let i = 0; i < totalDevices; i++) {
        const deviceRef = items[i] || items[0];
        const deviceId = deviceRef?.device_id || deviceRef?.serial_number || `item-${i}`;
        tasks.push(defaultTaskShape({
            taskKind: TASK_KINDS.INSPECTION,
            title: `Inspect device (batch)`,
            title_ar: `فحص جهاز - دفعة شراء`,
            priority: 'normal',
            required_skills: ['inspection'],
            estimated_minutes: 15,
            source_reference: { eventType: 'purchase_confirmed', invoice_id: invoiceId, device_index: i, device_id: deviceId },
            requires_approval: false,
        }));
    }
    for (let i = 0; i < totalDevices; i++) {
        const deviceRef = items[i] || items[0];
        tasks.push(defaultTaskShape({
            taskKind: TASK_KINDS.PREPARATION,
            title: `Prepare device after inspection`,
            title_ar: `تجهيز جهاز بعد الفحص`,
            priority: 'normal',
            required_skills: ['preparation'],
            estimated_minutes: 20,
            source_reference: { eventType: 'purchase_confirmed', invoice_id: invoiceId, device_index: i, after_inspection: true },
            requires_approval: false,
        }));
    }
    if (totalDevices > 0) {
        tasks.push(defaultTaskShape({
            taskKind: TASK_KINDS.STICKER,
            title: `Print and apply serial stickers (batch of ${totalDevices})`,
            title_ar: `طباعة ولصق ستيكرات السيريال - ${totalDevices} جهاز`,
            priority: 'low',
            required_skills: ['preparation'],
            estimated_minutes: Math.min(60, 3 * totalDevices),
            source_reference: { eventType: 'purchase_confirmed', invoice_id: invoiceId, count: totalDevices },
            requires_approval: false,
        }));
    }
    return tasks;
}

function generateInspectionComplete(payload) {
    const deviceId = payload.device_id || payload.deviceId;
    const result = payload.result || payload.inspection_result;
    if (result === 'fail' || result === 'return') return [];

    return [
        defaultTaskShape({
            taskKind: TASK_KINDS.PREPARATION,
            title: 'Prepare device for sale',
            title_ar: 'تجهيز الجهاز للبيع',
            priority: 'normal',
            required_skills: ['preparation'],
            estimated_minutes: 20,
            source_reference: { eventType: 'inspection_complete', device_id: deviceId },
            requires_approval: false,
        }),
    ];
}

function generateInvoiceCompleted(payload) {
    const tasks = [];
    const invoiceId = payload.invoice_id || payload.invoiceId;
    const hasCod = payload.cod_amount > 0 || payload.payment_type === 'cod';

    tasks.push(defaultTaskShape({
        taskKind: TASK_KINDS.PACKAGING,
        title: 'Package order for delivery',
        title_ar: 'تغليف الطلب للتوصيل',
        priority: 'normal',
        required_skills: ['preparation'],
        estimated_minutes: 15,
        source_reference: { eventType: 'invoice_completed', invoice_id: invoiceId },
        requires_approval: false,
    }));

    tasks.push(defaultTaskShape({
        taskKind: TASK_KINDS.DELIVERY,
        title: 'Hand over to delivery company',
        title_ar: 'تسليم لشركة التوصيل',
        priority: hasCod ? 'high' : 'normal',
        required_skills: ['delivery'],
        estimated_minutes: 30,
        source_reference: { eventType: 'invoice_completed', invoice_id: invoiceId, cod: hasCod },
        requires_approval: hasCod,
    }));

    return tasks;
}

function generateDeviceSold(payload) {
    const invoiceId = payload.invoice_id || payload.invoiceId;
    return [
        defaultTaskShape({
            taskKind: TASK_KINDS.PACKAGING,
            title: 'Photo and package device',
            title_ar: 'تصوير وتغليف الجهاز',
            priority: 'normal',
            required_skills: ['preparation'],
            estimated_minutes: 15,
            source_reference: { eventType: 'device_sold', invoice_id: invoiceId },
            requires_approval: false,
        }),
        defaultTaskShape({
            taskKind: TASK_KINDS.DELIVERY,
            title: 'Hand over to delivery company',
            title_ar: 'تسليم لشركة التوصيل',
            priority: 'normal',
            required_skills: ['delivery'],
            estimated_minutes: 20,
            source_reference: { eventType: 'device_sold', invoice_id: invoiceId },
            requires_approval: false,
        }),
    ];
}

function generateWarrantyClaim(payload) {
    const claimId = payload.claim_id || payload.warranty_claim_id;
    return [
        defaultTaskShape({
            taskKind: TASK_KINDS.WARRANTY_INSPECT,
            title: 'Inspect warranty claim device',
            title_ar: 'فحص جهاز مطالبة الضمان',
            priority: 'high',
            required_skills: ['inspection', 'maintenance'],
            estimated_minutes: 25,
            source_reference: { eventType: 'warranty_claim', claim_id: claimId },
            requires_approval: false,
        }),
        defaultTaskShape({
            taskKind: TASK_KINDS.WARRANTY_SEND,
            title: 'Send device (warranty)',
            title_ar: 'إرسال الجهاز - ضمان',
            priority: 'normal',
            required_skills: ['delivery'],
            estimated_minutes: 30,
            source_reference: { eventType: 'warranty_claim', claim_id: claimId },
            requires_approval: false,
        }),
    ];
}

function generateStockLow(payload) {
    const productId = payload.product_id || payload.productId;
    return [
        defaultTaskShape({
            taskKind: TASK_KINDS.STOCK_ORDER,
            title: 'Create purchase order (low stock)',
            title_ar: 'إنشاء أمر شراء - مخزون منخفض',
            priority: 'high',
            required_skills: ['accounting'],
            estimated_minutes: 45,
            source_reference: { eventType: 'stock_low', product_id: productId, ...payload },
            requires_approval: true,
        }),
    ];
}

function generateDailyTasks(payload) {
    const kind = payload.kind || 'cleaning';
    const tasks = [];

    if (kind === 'cleaning' || kind === 'all') {
        tasks.push(defaultTaskShape({
            taskKind: TASK_KINDS.CLEANING,
            title: 'Daily cleaning task',
            title_ar: 'مهمة تنظيف يومية',
            priority: 'low',
            required_skills: ['cleaning'],
            estimated_minutes: 60,
            source_reference: { eventType: 'daily_tasks', kind: 'cleaning', date: payload.date },
            requires_approval: false,
        }));
    }
    if (kind === 'inventory' || kind === 'all') {
        tasks.push(defaultTaskShape({
            taskKind: TASK_KINDS.PREPARATION,
            title: 'Daily inventory check',
            title_ar: 'جرد يومي',
            priority: 'normal',
            required_skills: ['preparation'],
            estimated_minutes: 90,
            source_reference: { eventType: 'daily_tasks', kind: 'inventory', date: payload.date },
            requires_approval: false,
        }));
    }

    return tasks.length ? tasks : [defaultTaskShape({
        taskKind: TASK_KINDS.CLEANING,
        title: 'Daily task',
        title_ar: 'مهمة يومية',
        priority: 'low',
        required_skills: ['cleaning'],
        estimated_minutes: 60,
        source_reference: { eventType: 'daily_tasks', ...payload },
        requires_approval: false,
    })];
}

module.exports = {
    TASK_KINDS,
    SKILL_KEYS,
    generateFromEvent,
    defaultTaskShape,
};

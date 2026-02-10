/**
 * BI Management - تنفيذ أوامر من المحادثة
 * كشف نية الأمر (سند قبض، سند صرف) وتنفيذه مع التحقق من الصلاحية
 */

const voucherService = require('./voucher.service');

const RECEIPT_KEYWORDS = ['سند قبض', 'سند قبض', 'سوي سند قبض', 'انشئ سند قبض', 'اعمل سند قبض', 'سند قبض'];
const PAYMENT_KEYWORDS = ['سند صرف', 'سوي سند صرف', 'انشئ سند صرف', 'اعمل سند صرف', 'سند دفع'];

/**
 * استخراج مبلغ من النص (أرقام، أو رقم + ألف/مليون)
 */
function extractAmount(text) {
    const t = text.replace(/,/g, '').trim();
    const match = t.match(/(\d+(?:\.\d+)?)\s*(?:الف|ألف|الفا|مليون)?/);
    if (match) {
        let n = parseFloat(match[1]);
        if (/الف|ألف|الفا/i.test(t)) n *= 1000;
        if (/مليون/i.test(t)) n *= 1000000;
        return Math.round(n);
    }
    const numOnly = t.match(/(\d+(?:\.\d+)?)/);
    return numOnly ? parseFloat(numOnly[1]) : null;
}

/**
 * استخراج وصف من النص (بعد "من" أو "عن" أو "لـ" أو "وصف")
 */
function extractDescription(text) {
    const patterns = [/من\s+(.+?)(?:\s+\d|$)/, /عن\s+(.+?)(?:\s+\d|$)/, /لـ\s+(.+?)(?:\s+\d|$)/, /وصف[:\s]+(.+)/];
    for (const p of patterns) {
        const m = text.match(p);
        if (m && m[1]) return m[1].trim().slice(0, 500);
    }
    return null;
}

/**
 * كشف نية الأمر من رسالة المحادثة
 * @returns {{ intent: string, amount?: number, description?: string } | null}
 */
function parseChatCommand(message) {
    if (!message || typeof message !== 'string') return null;
    const text = message.trim();
    const lower = text.replace(/\s+/g, ' ').toLowerCase();

    const isReceipt = RECEIPT_KEYWORDS.some((k) => lower.includes(k.toLowerCase()));
    const isPayment = PAYMENT_KEYWORDS.some((k) => lower.includes(k.toLowerCase()));

    if (isReceipt) {
        const amount = extractAmount(text);
        const description = extractDescription(text);
        return {
            intent: 'create_receipt_voucher',
            amount: amount && amount > 0 ? amount : null,
            description: description || (amount ? null : 'سند قبض من المحادثة'),
        };
    }
    if (isPayment) {
        const amount = extractAmount(text);
        const description = extractDescription(text);
        return {
            intent: 'create_payment_voucher',
            amount: amount && amount > 0 ? amount : null,
            description: description || (amount ? null : 'سند صرف من المحادثة'),
        };
    }
    return null;
}

/**
 * التحقق من صلاحية تنفيذ الأمر
 */
function canExecuteAction(intent, user) {
    const role = user?.role || '';
    const allowed = ['owner', 'admin'];
    if (intent === 'create_receipt_voucher' || intent === 'create_payment_voucher') {
        return allowed.includes(role);
    }
    return false;
}

/**
 * تنفيذ الأمر وإرجاع النتيجة
 */
function executeAction(intent, params, userId) {
    if (intent === 'create_receipt_voucher') {
        if (!params.amount || params.amount <= 0) {
            return { success: false, error: 'يرجى ذكر المبلغ (مثال: سند قبض 500000)' };
        }
        try {
            const v = voucherService.create({
                type: 'receipt',
                amount: params.amount,
                currency: 'IQD',
                description: params.description || `سند قبض من المحادثة`,
                created_by: userId,
            });
            return {
                success: true,
                action: 'create_receipt_voucher',
                result: {
                    voucher_number: v.voucher_number,
                    id: v.id,
                    amount: v.amount,
                    message: `تم إنشاء سند قبض رقم ${v.voucher_number} بمبلغ ${Number(v.amount).toLocaleString('ar-IQ')} دينار.`,
                },
            };
        } catch (e) {
            return { success: false, error: e.message || 'فشل إنشاء السند' };
        }
    }
    if (intent === 'create_payment_voucher') {
        if (!params.amount || params.amount <= 0) {
            return { success: false, error: 'يرجى ذكر المبلغ (مثال: سند صرف 500000)' };
        }
        try {
            const v = voucherService.create({
                type: 'payment',
                amount: params.amount,
                currency: 'IQD',
                description: params.description || `سند صرف من المحادثة`,
                created_by: userId,
            });
            return {
                success: true,
                action: 'create_payment_voucher',
                result: {
                    voucher_number: v.voucher_number,
                    id: v.id,
                    amount: v.amount,
                    message: `تم إنشاء سند صرف رقم ${v.voucher_number} بمبلغ ${Number(v.amount).toLocaleString('ar-IQ')} دينار.`,
                },
            };
        } catch (e) {
            return { success: false, error: e.message || 'فشل إنشاء السند' };
        }
    }
    return { success: false, error: 'أمر غير معروف' };
}

/**
 * معالجة رسالة المحادثة: إن وُجد أمر قابل للتنفيذ وتسمح الصلاحية، نفّذه
 */
function processMessageForActions(message, user) {
    const parsed = parseChatCommand(message);
    if (!parsed) return null;
    if (!canExecuteAction(parsed.intent, user)) return null;
    return executeAction(parsed.intent, parsed, user.id);
}

module.exports = {
    parseChatCommand,
    canExecuteAction,
    executeAction,
    processMessageForActions,
};

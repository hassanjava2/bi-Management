/**
 * BI ERP — Cashbox Service (Phase 6)
 * إدارة الصناديق والقاصات — صندوق حسب الموظف
 * Supports: multiple cashboxes, transfers between boxes, box↔treasury, daily reconciliation
 */
const { run, get, all } = require('../config/database');
const { generateId } = require('../utils/helpers');
const { logAudit } = require('../middleware/audit.middleware');

// ─── LIST CASHBOXES ────────────────────
async function list() {
    return all(`
    SELECT cb.*, u.full_name as responsible_name
    FROM cashboxes cb
    LEFT JOIN users u ON cb.responsible_user_id = u.id
    WHERE cb.is_active = TRUE
    ORDER BY cb.name
  `).catch(() => []);
}

// ─── GET CASHBOX ──────────────────────
async function getById(id) {
    const cb = await get('SELECT cb.*, u.full_name as responsible_name FROM cashboxes cb LEFT JOIN users u ON cb.responsible_user_id = u.id WHERE cb.id = $1', [id]);
    if (!cb) return null;

    const movements = await all(`
    SELECT cm.*, u.full_name as created_by_name
    FROM cashbox_movements cm
    LEFT JOIN users u ON cm.created_by = u.id
    WHERE cm.cashbox_id = $1
    ORDER BY cm.created_at DESC LIMIT 50
  `, [id]).catch(() => []);

    return { ...cb, movements };
}

// ─── CREATE CASHBOX ───────────────────
async function create(data, userId) {
    const id = generateId();
    await run(`
    INSERT INTO cashboxes (id, name, currency, balance, responsible_user_id, notes, is_active, created_by, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, TRUE, $7, CURRENT_TIMESTAMP)
  `, [id, data.name, data.currency || 'IQD', parseFloat(data.initial_balance) || 0,
        data.responsible_user_id || null, data.notes || null, userId]);

    if (parseFloat(data.initial_balance) > 0) {
        await addMovement(id, 'deposit', parseFloat(data.initial_balance), data.currency || 'IQD', 'رصيد افتتاحي', null, userId);
    }

    await logAudit('cashbox', id, 'create', null, data, { user: { id: userId } });
    return get('SELECT * FROM cashboxes WHERE id = $1', [id]);
}

// ─── ADD MOVEMENT ─────────────────────
async function addMovement(cashboxId, type, amount, currency, description, referenceId, userId) {
    const id = generateId();
    const amountVal = parseFloat(amount) || 0;
    const delta = (type === 'deposit' || type === 'transfer_in') ? amountVal : -amountVal;

    await run(`
    INSERT INTO cashbox_movements (id, cashbox_id, type, amount, currency, description, reference_id, balance_after, created_by, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7,
      (SELECT COALESCE(balance, 0) FROM cashboxes WHERE id = $2) + $8,
      $9, CURRENT_TIMESTAMP)
  `, [id, cashboxId, type, amountVal, currency || 'IQD', description || null, referenceId || null, delta, userId]);

    await run('UPDATE cashboxes SET balance = COALESCE(balance, 0) + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [delta, cashboxId]);
    return id;
}

// ─── TRANSFER BETWEEN CASHBOXES ───────
async function transfer(data, userId) {
    const { from_cashbox_id, to_cashbox_id, amount, currency, notes } = data;
    const amountVal = parseFloat(amount) || 0;
    if (amountVal <= 0) return { error: 'INVALID_AMOUNT' };

    const fromBox = await get('SELECT * FROM cashboxes WHERE id = $1', [from_cashbox_id]);
    const toBox = await get('SELECT * FROM cashboxes WHERE id = $1', [to_cashbox_id]);
    if (!fromBox || !toBox) return { error: 'NOT_FOUND' };

    await addMovement(from_cashbox_id, 'transfer_out', amountVal, currency || 'IQD', `تحويل إلى ${toBox.name}${notes ? ' - ' + notes : ''}`, to_cashbox_id, userId);
    await addMovement(to_cashbox_id, 'transfer_in', amountVal, currency || 'IQD', `تحويل من ${fromBox.name}${notes ? ' - ' + notes : ''}`, from_cashbox_id, userId);

    await logAudit('cashbox', from_cashbox_id, 'transfer', null, { to: to_cashbox_id, amount: amountVal }, { user: { id: userId } });
    return { success: true, message: 'تم التحويل بنجاح' };
}

// ─── DAILY SUMMARY ────────────────────
async function dailySummary(cashboxId, date) {
    const d = date || new Date().toISOString().split('T')[0];
    const movements = await all(`
    SELECT type, SUM(amount) as total, COUNT(*)::int as count
    FROM cashbox_movements
    WHERE cashbox_id = $1 AND created_at::date = $2
    GROUP BY type
  `, [cashboxId, d]).catch(() => []);

    const balance = await get('SELECT balance FROM cashboxes WHERE id = $1', [cashboxId]);
    return { date: d, balance: balance?.balance || 0, movements };
}

// ─── RECONCILE ────────────────────────
async function reconcile(cashboxId, actualBalance, notes, userId) {
    const cb = await get('SELECT balance FROM cashboxes WHERE id = $1', [cashboxId]);
    if (!cb) return { error: 'NOT_FOUND' };

    const diff = parseFloat(actualBalance) - (cb.balance || 0);
    if (Math.abs(diff) > 0.01) {
        const type = diff > 0 ? 'adjustment_in' : 'adjustment_out';
        await addMovement(cashboxId, type, Math.abs(diff), 'IQD', `تسوية: ${notes || 'جرد يومي'}`, null, userId);
    }

    await logAudit('cashbox', cashboxId, 'reconcile', { balance: cb.balance }, { balance: actualBalance, diff }, { user: { id: userId } });
    return { success: true, previous: cb.balance, actual: parseFloat(actualBalance), diff };
}

module.exports = { list, getById, create, addMovement, transfer, dailySummary, reconcile };

/**
 * BI ERP — Enhanced Voucher Service (Phase 3)
 * سندات قبض/دفع/صرف/صيرفة/حوالة/قيد محاسبي
 * Multi-currency, invoice linking, customer/supplier balance updates
 */
const { run, get, all } = require('../config/database');
const { generateId } = require('../utils/helpers');
const { logAudit } = require('../middleware/audit.middleware');
const logger = require('../utils/logger');

const PREFIX = {
    receipt: 'RCV', payment: 'PAY', expense: 'EXP',
    journal: 'JRN', exchange: 'EXC', transfer: 'TRF', hawala: 'HWL'
};

// ─── AUTO NUMBER ───────────────────────
async function nextVoucherNumber(type) {
    const prefix = PREFIX[type] || 'VCH';
    const year = new Date().getFullYear();
    const r = await get(
        `SELECT voucher_number FROM vouchers WHERE type = $1 AND voucher_number LIKE $2 ORDER BY created_at DESC LIMIT 1`,
        [type, `${prefix}-${year}-%`]
    ).catch(() => null);
    let seq = 1;
    if (r?.voucher_number) {
        const m = r.voucher_number.match(/-(\d+)$/);
        if (m) seq = parseInt(m[1], 10) + 1;
    }
    return `${prefix}-${year}-${String(seq).padStart(4, '0')}`;
}

// ─── CREATE RECEIPT (سند قبض) ──────────
async function createReceipt(data, userId) {
    const id = generateId();
    const voucherNumber = await nextVoucherNumber('receipt');
    const amount = parseFloat(data.amount) || 0;
    if (amount <= 0) throw new Error('المبلغ يجب أن يكون أكبر من صفر');

    const exchangeRate = parseFloat(data.exchange_rate) || 1;
    const amountIQD = data.currency === 'USD' ? amount * exchangeRate : amount;

    await run(`
    INSERT INTO vouchers (
      id, voucher_number, type, amount, currency, exchange_rate, amount_in_default,
      customer_id, supplier_id, employee_id,
      invoice_id, invoice_number, reference_type, reference_id,
      cashbox_id, payment_method,
      discount_amount, discount_approved_by,
      previous_balance, balance_after,
      description, notes,
      secondary_amount, secondary_currency,
      created_by, created_at, updated_at
    ) VALUES (
      $1, $2, 'receipt', $3, $4, $5, $6,
      $7, $8, $9,
      $10, $11, $12, $13,
      $14, $15,
      $16, $17,
      $18, $19,
      $20, $21,
      $22, $23,
      $24, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    )
  `, [
        id, voucherNumber, amount, data.currency || 'IQD', exchangeRate, amountIQD,
        data.customer_id || null, data.supplier_id || null, data.employee_id || null,
        data.invoice_id || null, data.invoice_number || null, data.reference_type || null, data.reference_id || null,
        data.cashbox_id || null, data.payment_method || 'cash',
        parseFloat(data.discount_amount) || 0, data.discount_approved_by || null,
        parseFloat(data.previous_balance) || null, parseFloat(data.balance_after) || null,
        data.description || 'سند قبض', data.notes || null,
        parseFloat(data.secondary_amount) || null, data.secondary_currency || null,
        userId
    ]);

    // Update customer balance (reduce debt)
    if (data.customer_id) {
        await run(
            'UPDATE customers SET balance = COALESCE(balance, 0) - $1, last_payment_date = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [amountIQD, data.customer_id]
        ).catch(e => logger.warn('Update customer balance:', e.message));

        // If linked to invoice, update invoice paid amount
        if (data.invoice_id) {
            await run(
                'UPDATE invoices SET paid_amount = COALESCE(paid_amount, 0) + $1, remaining_amount = total - (COALESCE(paid_amount, 0) + $1), payment_status = CASE WHEN total <= (COALESCE(paid_amount, 0) + $1) THEN \'paid\' ELSE \'partial\' END, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
                [amount, data.invoice_id]
            ).catch(e => logger.warn('Update invoice paid:', e.message));
        }
    }

    // Update cashbox
    if (data.cashbox_id) {
        await run('UPDATE cashboxes SET balance = COALESCE(balance, 0) + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [amountIQD, data.cashbox_id]).catch(() => { });
    }

    await logAudit('voucher', id, 'create', null, { type: 'receipt', amount, currency: data.currency, customer_id: data.customer_id }, { user: { id: userId } });
    return getById(id);
}

// ─── CREATE PAYMENT (سند دفع) ──────────
async function createPayment(data, userId) {
    const id = generateId();
    const voucherNumber = await nextVoucherNumber('payment');
    const amount = parseFloat(data.amount) || 0;
    if (amount <= 0) throw new Error('المبلغ يجب أن يكون أكبر من صفر');

    const exchangeRate = parseFloat(data.exchange_rate) || 1;
    const amountIQD = data.currency === 'USD' ? amount * exchangeRate : amount;

    await run(`
    INSERT INTO vouchers (
      id, voucher_number, type, amount, currency, exchange_rate, amount_in_default,
      customer_id, supplier_id, employee_id,
      invoice_id, invoice_number, reference_type, reference_id,
      cashbox_id, payment_method,
      discount_amount, discount_approved_by,
      previous_balance, balance_after,
      description, notes,
      secondary_amount, secondary_currency,
      created_by, created_at, updated_at
    ) VALUES (
      $1, $2, 'payment', $3, $4, $5, $6,
      $7, $8, $9,
      $10, $11, $12, $13,
      $14, $15,
      $16, $17,
      $18, $19,
      $20, $21,
      $22, $23,
      $24, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    )
  `, [
        id, voucherNumber, amount, data.currency || 'IQD', exchangeRate, amountIQD,
        data.customer_id || null, data.supplier_id || null, data.employee_id || null,
        data.invoice_id || null, data.invoice_number || null, data.reference_type || null, data.reference_id || null,
        data.cashbox_id || null, data.payment_method || 'cash',
        parseFloat(data.discount_amount) || 0, data.discount_approved_by || null,
        parseFloat(data.previous_balance) || null, parseFloat(data.balance_after) || null,
        data.description || 'سند دفع', data.notes || null,
        parseFloat(data.secondary_amount) || null, data.secondary_currency || null,
        userId
    ]);

    // Update supplier balance (reduce payable)
    if (data.supplier_id) {
        await run(
            'UPDATE suppliers SET balance = COALESCE(balance, 0) - $1, last_payment_date = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [amountIQD, data.supplier_id]
        ).catch(e => logger.warn('Update supplier balance:', e.message));

        if (data.invoice_id) {
            await run(
                'UPDATE invoices SET paid_amount = COALESCE(paid_amount, 0) + $1, remaining_amount = total - (COALESCE(paid_amount, 0) + $1), payment_status = CASE WHEN total <= (COALESCE(paid_amount, 0) + $1) THEN \'paid\' ELSE \'partial\' END, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
                [amount, data.invoice_id]
            ).catch(e => logger.warn('Update invoice paid:', e.message));
        }
    }

    // Update cashbox (deduct)
    if (data.cashbox_id) {
        await run('UPDATE cashboxes SET balance = COALESCE(balance, 0) - $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [amountIQD, data.cashbox_id]).catch(() => { });
    }

    await logAudit('voucher', id, 'create', null, { type: 'payment', amount, currency: data.currency, supplier_id: data.supplier_id }, { user: { id: userId } });
    return getById(id);
}

// ─── CREATE EXPENSE (سند صرف) ──────────
async function createExpense(data, userId) {
    const id = generateId();
    const voucherNumber = await nextVoucherNumber('expense');
    const amount = parseFloat(data.amount) || 0;

    await run(`
    INSERT INTO vouchers (
      id, voucher_number, type, amount, currency, exchange_rate,
      employee_id, cashbox_id, payment_method,
      expense_category, expense_to,
      description, notes,
      created_by, created_at, updated_at
    ) VALUES ($1, $2, 'expense', $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `, [
        id, voucherNumber, amount, data.currency || 'IQD', parseFloat(data.exchange_rate) || 1,
        data.employee_id || null, data.cashbox_id || null, data.payment_method || 'cash',
        data.expense_category || null, data.expense_to || null,
        data.description || 'سند صرف', data.notes || null,
        userId
    ]);

    // Deduct from cashbox
    if (data.cashbox_id) {
        const amountIQD = data.currency === 'USD' ? amount * (parseFloat(data.exchange_rate) || 1) : amount;
        await run('UPDATE cashboxes SET balance = COALESCE(balance, 0) - $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [amountIQD, data.cashbox_id]).catch(() => { });
    }

    return getById(id);
}

// ─── CREATE EXCHANGE (صيرفة) ───────────
async function createExchange(data, userId) {
    const id = generateId();
    const voucherNumber = await nextVoucherNumber('exchange');

    await run(`
    INSERT INTO vouchers (
      id, voucher_number, type, amount, currency, exchange_rate,
      secondary_amount, secondary_currency,
      cashbox_id, description, notes,
      created_by, created_at, updated_at
    ) VALUES ($1, $2, 'exchange', $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `, [
        id, voucherNumber,
        parseFloat(data.amount) || 0, data.currency || 'USD', parseFloat(data.exchange_rate) || 1,
        parseFloat(data.secondary_amount) || 0, data.secondary_currency || 'IQD',
        data.cashbox_id || null, data.description || 'صيرفة', data.notes || null,
        userId
    ]);

    return getById(id);
}

// ─── CREATE HAWALA (حوالة) ─────────────
async function createHawala(data, userId) {
    const id = generateId();
    const voucherNumber = await nextVoucherNumber('hawala');

    await run(`
    INSERT INTO vouchers (
      id, voucher_number, type, amount, currency, exchange_rate,
      customer_id, supplier_id,
      hawala_company, hawala_fee, hawala_fee_on_us,
      description, notes,
      created_by, created_at, updated_at
    ) VALUES ($1, $2, 'hawala', $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `, [
        id, voucherNumber,
        parseFloat(data.amount) || 0, data.currency || 'USD', parseFloat(data.exchange_rate) || 1,
        data.customer_id || null, data.supplier_id || null,
        data.hawala_company || null, parseFloat(data.hawala_fee) || 0, data.hawala_fee_on_us || false,
        data.description || 'حوالة', data.notes || null,
        userId
    ]);

    return getById(id);
}

// ─── CREATE JOURNAL (قيد محاسبي) ───────
async function createJournal(data, userId) {
    const id = generateId();
    const voucherNumber = await nextVoucherNumber('journal');

    await run(`
    INSERT INTO vouchers (
      id, voucher_number, type, amount, currency,
      from_account_id, to_account_id,
      description, notes,
      created_by, created_at, updated_at
    ) VALUES ($1, $2, 'journal', $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `, [
        id, voucherNumber,
        parseFloat(data.amount) || 0, data.currency || 'IQD',
        data.from_account_id || null, data.to_account_id || null,
        data.description || 'قيد محاسبي', data.notes || null,
        userId
    ]);

    return getById(id);
}

// ─── GENERIC CREATE (router) ───────────
async function create(data, userId) {
    const type = data.type || 'receipt';
    switch (type) {
        case 'receipt': return createReceipt(data, userId);
        case 'payment': return createPayment(data, userId);
        case 'expense': return createExpense(data, userId);
        case 'exchange': return createExchange(data, userId);
        case 'hawala': return createHawala(data, userId);
        case 'journal': return createJournal(data, userId);
        default: return createReceipt(data, userId);
    }
}

// ─── LIST ──────────────────────────────
async function list(filters = {}) {
    let q = `
    SELECT v.*, u.full_name as created_by_name,
      c.name as customer_name, s.name as supplier_name
    FROM vouchers v
    LEFT JOIN users u ON v.created_by = u.id
    LEFT JOIN customers c ON v.customer_id = c.id
    LEFT JOIN suppliers s ON v.supplier_id = s.id
    WHERE (v.is_deleted = 0 OR v.is_deleted IS NULL OR v.is_deleted = false)
  `;
    const params = [];

    if (filters.type) { params.push(filters.type); q += ` AND v.type = $${params.length}`; }
    if (filters.customer_id) { params.push(filters.customer_id); q += ` AND v.customer_id = $${params.length}`; }
    if (filters.supplier_id) { params.push(filters.supplier_id); q += ` AND v.supplier_id = $${params.length}`; }
    if (filters.currency) { params.push(filters.currency); q += ` AND v.currency = $${params.length}`; }
    if (filters.payment_method) { params.push(filters.payment_method); q += ` AND v.payment_method = $${params.length}`; }
    if (filters.from) { params.push(filters.from); q += ` AND v.created_at::date >= $${params.length}`; }
    if (filters.to) { params.push(filters.to); q += ` AND v.created_at::date <= $${params.length}`; }
    if (filters.search) {
        params.push(`%${filters.search}%`);
        q += ` AND (v.voucher_number ILIKE $${params.length} OR v.description ILIKE $${params.length} OR c.name ILIKE $${params.length} OR s.name ILIKE $${params.length})`;
    }

    q += ' ORDER BY v.created_at DESC';
    const limit = parseInt(filters.limit) || 50;
    const offset = ((parseInt(filters.page) || 1) - 1) * limit;
    params.push(limit); q += ` LIMIT $${params.length}`;
    params.push(offset); q += ` OFFSET $${params.length}`;

    return all(q, params);
}

// ─── GET BY ID ─────────────────────────
async function getById(id) {
    const v = await get(`
    SELECT v.*, u.full_name as created_by_name,
      c.name as customer_name, c.phone as customer_phone,
      s.name as supplier_name, s.phone as supplier_phone
    FROM vouchers v
    LEFT JOIN users u ON v.created_by = u.id
    LEFT JOIN customers c ON v.customer_id = c.id
    LEFT JOIN suppliers s ON v.supplier_id = s.id
    WHERE v.id = $1
  `, [id]);

    if (v) {
        v.items = await all(`
      SELECT vi.*, c.name as customer_name, s.name as supplier_name
      FROM voucher_items vi
      LEFT JOIN customers c ON vi.customer_id = c.id
      LEFT JOIN suppliers s ON vi.supplier_id = s.id
      WHERE vi.voucher_id = $1
      ORDER BY vi.created_at
    `, [id]).catch(() => []);
    }
    return v;
}

// ─── CANCEL VOUCHER ────────────────────
async function cancelVoucher(id, reason, userId) {
    const v = await get('SELECT * FROM vouchers WHERE id = $1', [id]);
    if (!v) return { error: 'NOT_FOUND' };
    if (v.status === 'cancelled') return { error: 'ALREADY_CANCELLED' };

    await run('UPDATE vouchers SET status = \'cancelled\', cancel_reason = $1, cancelled_by = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3', [reason, userId, id]);

    // Reverse balance changes
    const amountIQD = v.currency === 'USD' ? parseFloat(v.amount) * (parseFloat(v.exchange_rate) || 1) : parseFloat(v.amount);
    if (v.type === 'receipt' && v.customer_id) {
        await run('UPDATE customers SET balance = COALESCE(balance, 0) + $1 WHERE id = $2', [amountIQD, v.customer_id]).catch(() => { });
    }
    if (v.type === 'payment' && v.supplier_id) {
        await run('UPDATE suppliers SET balance = COALESCE(balance, 0) + $1 WHERE id = $2', [amountIQD, v.supplier_id]).catch(() => { });
    }
    if (v.cashbox_id) {
        const delta = v.type === 'receipt' ? -amountIQD : amountIQD;
        await run('UPDATE cashboxes SET balance = COALESCE(balance, 0) + $1 WHERE id = $2', [delta, v.cashbox_id]).catch(() => { });
    }

    // Reverse multi-party items
    if (v.is_multi_party) {
        const items = await all('SELECT * FROM voucher_items WHERE voucher_id = $1', [id]).catch(() => []);
        for (const item of items) {
            if (item.customer_id) await run('UPDATE customers SET balance = COALESCE(balance, 0) + $1 WHERE id = $2', [parseFloat(item.amount), item.customer_id]).catch(() => { });
            if (item.supplier_id) await run('UPDATE suppliers SET balance = COALESCE(balance, 0) + $1 WHERE id = $2', [parseFloat(item.amount), item.supplier_id]).catch(() => { });
        }
    }

    await logAudit('voucher', id, 'cancel', { status: v.status }, { status: 'cancelled', reason }, { user: { id: userId } });
    return { data: await getById(id) };
}

// ─── STATS ─────────────────────────────
async function getStats() {
    const nd = "AND (is_deleted = 0 OR is_deleted IS NULL OR is_deleted = false)";
    const [receipts, payments, expenses, todayReceipts, todayPayments] = await Promise.all([
        get(`SELECT COUNT(*) as c, COALESCE(SUM(amount),0) as s FROM vouchers WHERE type = 'receipt' AND status != 'cancelled' ${nd}`).catch(() => ({ c: 0, s: 0 })),
        get(`SELECT COUNT(*) as c, COALESCE(SUM(amount),0) as s FROM vouchers WHERE type = 'payment' AND status != 'cancelled' ${nd}`).catch(() => ({ c: 0, s: 0 })),
        get(`SELECT COUNT(*) as c, COALESCE(SUM(amount),0) as s FROM vouchers WHERE type = 'expense' AND status != 'cancelled' ${nd}`).catch(() => ({ c: 0, s: 0 })),
        get(`SELECT COUNT(*) as c, COALESCE(SUM(amount),0) as s FROM vouchers WHERE type = 'receipt' AND status != 'cancelled' AND created_at::date = CURRENT_DATE ${nd}`).catch(() => ({ c: 0, s: 0 })),
        get(`SELECT COUNT(*) as c, COALESCE(SUM(amount),0) as s FROM vouchers WHERE type = 'payment' AND status != 'cancelled' AND created_at::date = CURRENT_DATE ${nd}`).catch(() => ({ c: 0, s: 0 })),
    ]);

    return {
        receipts_count: receipts?.c || 0, receipts_amount: receipts?.s || 0,
        payments_count: payments?.c || 0, payments_amount: payments?.s || 0,
        expenses_count: expenses?.c || 0, expenses_amount: expenses?.s || 0,
        today_receipts: todayReceipts?.s || 0, today_payments: todayPayments?.s || 0,
        net_today: (todayReceipts?.s || 0) - (todayPayments?.s || 0),
    };
}

// ─── MULTI-PARTY RECEIPT (سند قبض متعدد) ──
async function createMultiReceipt(data, userId) {
    const id = generateId();
    const voucherNumber = await nextVoucherNumber('receipt');
    const items = data.items || [];
    const totalAmount = items.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);

    await run(`
    INSERT INTO vouchers (
      id, voucher_number, type, amount, currency, exchange_rate,
      cashbox_id, payment_method, is_multi_party,
      description, notes, created_by, created_at, updated_at
    ) VALUES ($1, $2, 'receipt', $3, $4, $5, $6, $7, TRUE, $8, $9, $10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `, [id, voucherNumber, totalAmount, data.currency || 'IQD', parseFloat(data.exchange_rate) || 1,
        data.cashbox_id || null, data.payment_method || 'cash',
        data.description || 'سند قبض متعدد', data.notes || null, userId]);

    for (const item of items) {
        const itemId = generateId();
        const amt = parseFloat(item.amount) || 0;
        await run(`INSERT INTO voucher_items (id, voucher_id, customer_id, amount, currency, invoice_id, notes) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
            [itemId, id, item.customer_id, amt, data.currency || 'IQD', item.invoice_id || null, item.notes || null]);

        if (item.customer_id) {
            await run('UPDATE customers SET balance = COALESCE(balance, 0) - $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [amt, item.customer_id]).catch(() => { });
        }
        if (item.invoice_id) {
            await run('UPDATE invoices SET paid_amount = COALESCE(paid_amount,0) + $1, remaining_amount = total - (COALESCE(paid_amount,0) + $1), payment_status = CASE WHEN total <= (COALESCE(paid_amount,0) + $1) THEN \'paid\' ELSE \'partial\' END, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [amt, item.invoice_id]).catch(() => { });
        }
    }

    if (data.cashbox_id) {
        const amtIQD = data.currency === 'USD' ? totalAmount * (parseFloat(data.exchange_rate) || 1) : totalAmount;
        await run('UPDATE cashboxes SET balance = COALESCE(balance, 0) + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [amtIQD, data.cashbox_id]).catch(() => { });
    }

    await logAudit('voucher', id, 'create', null, { type: 'multi_receipt', amount: totalAmount, items: items.length }, { user: { id: userId } });
    return getById(id);
}

// ─── MULTI-PARTY PAYMENT (سند دفع متعدد) ──
async function createMultiPayment(data, userId) {
    const id = generateId();
    const voucherNumber = await nextVoucherNumber('payment');
    const items = data.items || [];
    const totalAmount = items.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);

    await run(`
    INSERT INTO vouchers (
      id, voucher_number, type, amount, currency, exchange_rate,
      cashbox_id, payment_method, is_multi_party,
      description, notes, created_by, created_at, updated_at
    ) VALUES ($1, $2, 'payment', $3, $4, $5, $6, $7, TRUE, $8, $9, $10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `, [id, voucherNumber, totalAmount, data.currency || 'IQD', parseFloat(data.exchange_rate) || 1,
        data.cashbox_id || null, data.payment_method || 'cash',
        data.description || 'سند دفع متعدد', data.notes || null, userId]);

    for (const item of items) {
        const itemId = generateId();
        const amt = parseFloat(item.amount) || 0;
        await run(`INSERT INTO voucher_items (id, voucher_id, supplier_id, amount, currency, invoice_id, notes) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
            [itemId, id, item.supplier_id, amt, data.currency || 'IQD', item.invoice_id || null, item.notes || null]);

        if (item.supplier_id) {
            await run('UPDATE suppliers SET balance = COALESCE(balance, 0) - $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [amt, item.supplier_id]).catch(() => { });
        }
        if (item.invoice_id) {
            await run('UPDATE invoices SET paid_amount = COALESCE(paid_amount,0) + $1, remaining_amount = total - (COALESCE(paid_amount,0) + $1), payment_status = CASE WHEN total <= (COALESCE(paid_amount,0) + $1) THEN \'paid\' ELSE \'partial\' END, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [amt, item.invoice_id]).catch(() => { });
        }
    }

    if (data.cashbox_id) {
        const amtIQD = data.currency === 'USD' ? totalAmount * (parseFloat(data.exchange_rate) || 1) : totalAmount;
        await run('UPDATE cashboxes SET balance = COALESCE(balance, 0) - $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [amtIQD, data.cashbox_id]).catch(() => { });
    }

    await logAudit('voucher', id, 'create', null, { type: 'multi_payment', amount: totalAmount, items: items.length }, { user: { id: userId } });
    return getById(id);
}

// ─── PROFIT DISTRIBUTION (توزيع أرباح) ──
async function createProfitDistribution(data, userId) {
    const id = generateId();
    const voucherNumber = await nextVoucherNumber('journal');

    await run(`
    INSERT INTO vouchers (
      id, voucher_number, type, amount, currency,
      description, notes, created_by, created_at, updated_at
    ) VALUES ($1, $2, 'profit_distribution', $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `, [id, voucherNumber, parseFloat(data.amount) || 0, data.currency || 'IQD',
        data.description || 'توزيع أرباح', data.notes || null, userId]);

    // Distribute to shareholders
    const items = data.distributions || [];
    for (const dist of items) {
        const itemId = generateId();
        await run(`INSERT INTO voucher_items (id, voucher_id, amount, currency, notes) VALUES ($1,$2,$3,$4,$5)`,
            [itemId, id, parseFloat(dist.amount) || 0, data.currency || 'IQD', dist.shareholder_name || null]);

        if (dist.share_id) {
            await run('UPDATE shares SET total_distributed = COALESCE(total_distributed, 0) + $1, last_distribution_at = CURRENT_TIMESTAMP WHERE id = $2', [parseFloat(dist.amount) || 0, dist.share_id]).catch(() => { });
            await run('INSERT INTO share_distributions (id, share_id, amount, period, distribution_date, notes, created_by) VALUES ($1,$2,$3,$4,CURRENT_DATE,$5,$6)',
                [generateId(), dist.share_id, parseFloat(dist.amount) || 0, data.period || null, dist.notes || null, userId]).catch(() => { });
        }
    }

    return getById(id);
}

module.exports = {
    create, list, getById, nextVoucherNumber, getStats,
    createReceipt, createPayment, createExpense, createExchange, createHawala, createJournal,
    createMultiReceipt, createMultiPayment, createProfitDistribution,
    cancelVoucher,
};

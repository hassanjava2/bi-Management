/**
 * BI Management - Invoice Routes
 * مسارات الفواتير
 * 
 * Updated for SQLite compatibility
 * Audit logging and permissions per AUDIT-COMMITTEE-REPORT
 */

const express = require('express');
const router = express.Router();
const { run, get, all } = require('../config/database');
const { generateId, now } = require('../utils/helpers');
const { auth } = require('../middleware/auth');
const { getAuditService, EVENT_CATEGORIES, SEVERITY } = require('../services/audit.service');
const { requirePermission, checkPermission } = require('../middleware/protection');
const { requestInvoiceVoid, requestDeletion } = require('../services/approval.service');
const invoiceWorkflow = require('../services/invoiceWorkflow.service');
let notificationService;
try { notificationService = require('../services/notification.service'); } catch (e) { /* optional */ }

router.use(auth);

function hasBypassApproval(user) {
    return user?.role === 'owner' || checkPermission(user, 'system.approvals.bypass');
}

// صلاحية العرض: إما مبيعات أو مشتريات
function requireInvoiceView(req, res, next) {
    if (!req.user) {
        return res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'يجب تسجيل الدخول أولاً' });
    }
    if (req.user.role === 'owner') return next();
    if (checkPermission(req.user, 'sales.invoice.view') || checkPermission(req.user, 'purchases.invoice.view')) return next();
    return res.status(403).json({
        success: false,
        error: 'PERMISSION_DENIED',
        message: 'ليس لديك صلاحية لعرض الفواتير',
        required_permission: 'sales.invoice.view or purchases.invoice.view'
    });
}

function getInvoicePermission(type, action) {
    const prefix = (type === 'purchase' || type === 'purchase_return') ? 'purchases.invoice' : 'sales.invoice';
    return `${prefix}.${action}`;
}

function logInvoiceAudit(req, eventType, entityId, entityName, oldValue, newValue, metadata) {
    const auditService = getAuditService();
    auditService.log({
        eventType,
        eventCategory: EVENT_CATEGORIES.INVOICE,
        severity: SEVERITY.INFO,
        userId: req.user?.id,
        userName: req.user?.name || req.user?.full_name,
        userRole: req.user?.role,
        ipAddress: req.ip,
        entityType: 'invoice',
        entityId: entityId || null,
        entityName: entityName || null,
        oldValue: oldValue || null,
        newValue: newValue || null,
        metadata: metadata || null,
        action: eventType
    });
}

// أنواع الفواتير
const INVOICE_TYPES = {
    PURCHASE: 'purchase',
    PURCHASE_RETURN: 'purchase_return',
    SALE: 'sale',
    SALE_RETURN: 'sale_return',
    EXCHANGE: 'exchange',
    INSTALLMENT: 'installment',
    REPAIR: 'repair'
};

/**
 * GET /api/invoices
 * جلب الفواتير
 */
router.get('/', requireInvoiceView, async (req, res) => {
    try {
        const {
            type,
            status,
            customer_id,
            supplier_id,
            start_date,
            end_date,
            search,
            my_only,
            page = 1,
            limit = 50
        } = req.query;

        let query = `
            SELECT i.*,
                   c.name as customer_name,
                   s.name as supplier_name,
                   u.full_name as created_by_name
            FROM invoices i
            LEFT JOIN customers c ON i.customer_id = c.id
            LEFT JOIN suppliers s ON i.supplier_id = s.id
            LEFT JOIN users u ON i.created_by = u.id
            WHERE 1=1
        `;
        const params = [];

        if (my_only === '1' || my_only === 'true') {
            query += ` AND i.created_by = ?`;
            params.push(req.user?.id || null);
        }

        if (type) {
            query += ` AND i.type = ?`;
            params.push(type);
        }

        if (status) {
            query += ` AND i.status = ?`;
            params.push(status);
        }

        if (customer_id) {
            query += ` AND i.customer_id = ?`;
            params.push(customer_id);
        }

        if (supplier_id) {
            query += ` AND i.supplier_id = ?`;
            params.push(supplier_id);
        }

        if (start_date) {
            query += ` AND i.created_at >= ?`;
            params.push(start_date);
        }

        if (end_date) {
            query += ` AND i.created_at <= ?`;
            params.push(end_date);
        }

        if (search) {
            query += ` AND i.invoice_number LIKE ?`;
            params.push(`%${search}%`);
        }

        query += ' ORDER BY i.created_at DESC';
        
        const offset = (parseInt(page) - 1) * parseInt(limit);
        query += ` LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), offset);

        const invoices = all(query, params);

        // Get total count for pagination
        let countQuery = `SELECT COUNT(*) as total FROM invoices WHERE 1=1`;
        const countParams = params.slice(0, -2); // Remove LIMIT and OFFSET params
        if (my_only === '1' || my_only === 'true') countQuery += ` AND created_by = ?`;
        if (type) countQuery += ` AND type = ?`;
        if (status) countQuery += ` AND status = ?`;
        if (customer_id) countQuery += ` AND customer_id = ?`;
        if (supplier_id) countQuery += ` AND supplier_id = ?`;
        if (start_date) countQuery += ` AND created_at >= ?`;
        if (end_date) countQuery += ` AND created_at <= ?`;
        if (search) countQuery += ` AND invoice_number LIKE ?`;
        
        const countResult = get(countQuery, countParams);

        res.json({
            success: true,
            data: {
                invoices,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: countResult?.total || 0
                }
            }
        });
    } catch (error) {
        console.error('[Invoices] List error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/invoices/stats
 * إحصائيات الفواتير
 */
router.get('/waiting', requireInvoiceView, async (req, res) => {
    try {
        const { type } = req.query;
        let query = `
            SELECT i.*, c.name as customer_name, s.name as supplier_name, u.full_name as created_by_name
            FROM invoices i
            LEFT JOIN customers c ON i.customer_id = c.id
            LEFT JOIN suppliers s ON i.supplier_id = s.id
            LEFT JOIN users u ON i.created_by = u.id
            WHERE (i.status = 'draft' OR i.status = 'waiting' OR i.sub_type = 'waiting')
            AND (i.is_deleted = 0 OR i.is_deleted IS NULL)
        `;
        const params = [];
        if (type) {
            query += ` AND i.type = ?`;
            params.push(type);
        }
        query += ` ORDER BY i.created_at DESC LIMIT 100`;
        const list = all(query, params);
        res.json({ success: true, data: list });
    } catch (error) {
        console.error('[Invoices] Waiting list error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/stats', requireInvoiceView, async (req, res) => {
    try {
        // Total invoices by type
        const typeStats = all(`
            SELECT type, COUNT(*) as count, SUM(total) as total_amount
            FROM invoices
            GROUP BY type
        `);
        
        // Today's sales
        const todaySales = get(`
            SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as total
            FROM invoices
            WHERE type = 'sale' AND date(created_at) = date('now')
        `);
        
        // This month sales
        const monthSales = get(`
            SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as total
            FROM invoices
            WHERE type = 'sale' 
            AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')
        `);
        
        // Payment status
        const paymentStats = all(`
            SELECT payment_status, COUNT(*) as count
            FROM invoices
            GROUP BY payment_status
        `);
        
        res.json({
            success: true,
            data: {
                by_type: typeStats,
                today: todaySales,
                this_month: monthSales,
                by_payment_status: paymentStats
            }
        });
    } catch (error) {
        console.error('[Invoices] Stats error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/invoices/:id
 * جلب فاتورة محددة
 */
router.get('/:id', async (req, res) => {
    try {
        const invoice = get(`
            SELECT i.*,
                   c.name as customer_name, c.phone as customer_phone,
                   s.name as supplier_name
            FROM invoices i
            LEFT JOIN customers c ON i.customer_id = c.id
            LEFT JOIN suppliers s ON i.supplier_id = s.id
            WHERE i.id = ? OR i.invoice_number = ?
        `, [req.params.id, req.params.id]);

        if (!invoice) {
            return res.status(404).json({
                success: false,
                error: 'NOT_FOUND'
            });
        }

        const viewPerm = getInvoicePermission(invoice.type, 'view');
        if (req.user?.role !== 'owner' && !checkPermission(req.user, viewPerm)) {
            return res.status(403).json({
                success: false,
                error: 'PERMISSION_DENIED',
                message: 'ليس لديك صلاحية لعرض هذه الفاتورة',
                required_permission: viewPerm
            });
        }

        // Get items
        const items = all(`
            SELECT ii.*,
                   p.name as product_name
            FROM invoice_items ii
            LEFT JOIN products p ON ii.product_id = p.id
            WHERE ii.invoice_id = ?
        `, [invoice.id]);

        res.json({
            success: true,
            data: {
                invoice,
                items
            }
        });
    } catch (error) {
        console.error('[Invoices] Get error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/invoices
 * إنشاء فاتورة جديدة
 */
router.post('/', (req, res, next) => {
    const type = (req.body && req.body.type) || 'sale';
    const perm = getInvoicePermission(type, 'create');
    return requirePermission(perm)(req, res, next);
}, async (req, res) => {
    try {
        const {
            type = 'sale',
            customer_id,
            supplier_id,
            items = [],
            subtotal = 0,
            discount_amount = 0,
            discount_percent = 0,
            tax_amount = 0,
            shipping_cost = 0,
            total = 0,
            payment_method = 'cash',
            payment_status = 'paid',
            paid_amount = 0,
            notes,
            payment_type = 'cash'
        } = req.body;

        const id = generateId();
        const invoiceNumber = `INV-${Date.now().toString().slice(-8)}`;

        // Insert invoice
        run(`
            INSERT INTO invoices (
                id, invoice_number, type, payment_type, customer_id, supplier_id,
                subtotal, discount_percent, discount_amount, tax_amount, shipping_cost,
                total, payment_method, payment_status, paid_amount, remaining_amount,
                notes, status, created_by, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `, [
            id,
            invoiceNumber,
            type,
            payment_type,
            customer_id || null,
            supplier_id || null,
            subtotal,
            discount_percent,
            discount_amount,
            tax_amount,
            shipping_cost,
            total,
            payment_method,
            payment_status,
            paid_amount,
            total - paid_amount,
            notes || null,
            'completed',
            req.user?.id || null
        ]);

        // Insert items + auto-generate serials for purchase invoices
        for (const item of items) {
            const itemId = generateId();
            run(`
                INSERT INTO invoice_items (
                    id, invoice_id, product_id, quantity, unit_price, total, serial_number
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
                itemId,
                id,
                item.product_id,
                item.quantity || 1,
                item.price || item.unit_price || 0,
                item.total || (item.quantity * (item.price || item.unit_price || 0)),
                item.serial_number || null
            ]);

            // Auto-generate serials for purchase invoices
            if (type === 'purchase') {
                const qty = item.quantity || 1;
                for (let s = 0; s < qty; s++) {
                    try {
                        const serialId = generateId();
                        const year = new Date().getFullYear();
                        const lastSerial = get(`SELECT serial_number FROM serial_numbers WHERE serial_number LIKE ? ORDER BY serial_number DESC LIMIT 1`, [`BI-${year}-%`]);
                        let nextNum = 1;
                        if (lastSerial && lastSerial.serial_number) {
                            const parts = lastSerial.serial_number.split('-');
                            const lastNum = parseInt(parts[parts.length - 1]);
                            if (!isNaN(lastNum)) nextNum = lastNum + 1;
                        }
                        const serial = `BI-${year}-${String(nextNum).padStart(6, '0')}`;
                        run(`INSERT INTO serial_numbers (id, serial_number, product_id, purchase_cost, supplier_id, status, warehouse_id, created_at, created_by)
                             VALUES (?, ?, ?, ?, ?, 'new', 'inspection', datetime('now'), ?)`,
                            [serialId, serial, item.product_id, item.price || item.unit_price || 0, supplier_id || null, req.user?.id]);
                    } catch (serialErr) {
                        console.error('[Invoices] Auto-serial error:', serialErr.message);
                    }
                }
            }

            // Mark device as sold if device_id provided (sale invoices)
            if (item.device_id && (type === 'sale' || type === 'sale_credit' || type === 'sale_installment')) {
                try {
                    run(`UPDATE serial_numbers SET status = 'sold', sale_invoice_id = ?, sale_date = date('now') WHERE id = ?`, [id, item.device_id]);
                } catch (e) { /* device might not exist */ }
            }
        }

        // Get created invoice
        const createdInvoice = get(`SELECT * FROM invoices WHERE id = ?`, [id]);

        logInvoiceAudit(req, 'invoice_created', id, createdInvoice.invoice_number, null, {
            invoice_number: createdInvoice.invoice_number,
            type: createdInvoice.type,
            total: createdInvoice.total,
            status: createdInvoice.status
        });

        // إرسال تنبيهات
        try {
            if (notificationService && notificationService.notifyEvent) {
                const NT = notificationService.NOTIFICATION_TYPES;
                notificationService.notifyEvent(NT.INVOICE_CREATED, {
                    invoice_number: createdInvoice.invoice_number,
                    total: createdInvoice.total,
                    send_to_admins: true,
                    entity_type: 'invoice',
                    entity_id: id,
                    action_url: `/sales?invoice=${id}`,
                });

                if (req.body.sub_type === 'waiting') {
                    notificationService.notifyEvent(NT.INVOICE_WAITING_PRICES, {
                        invoice_number: createdInvoice.invoice_number,
                        supplier_name: createdInvoice.supplier_name || '',
                        send_to_admins: true,
                        entity_type: 'invoice',
                        entity_id: id,
                    });
                }
            }
        } catch (notifErr) {
            console.error('[Invoices] Notification error:', notifErr.message);
        }

        if (req.body.sub_type && createdInvoice) {
            try {
                run(`UPDATE invoices SET sub_type = ? WHERE id = ?`, [req.body.sub_type, id]);
                if (req.body.sub_type === 'waiting' || req.body.sub_type === 'quotation') {
                    run(`UPDATE invoices SET status = ? WHERE id = ?`, ['draft', id]);
                }
                invoiceWorkflow.logWorkflow(id, invoiceWorkflow.WORKFLOW_EVENTS.CREATED, req.user?.id, req.user?.role, req.body.sub_type || null);
            } catch (e) { /* columns may not exist yet */ }
        }

        res.status(201).json({
            success: true,
            data: get('SELECT * FROM invoices WHERE id = ?', [id]) || createdInvoice
        });
    } catch (error) {
        console.error('[Invoices] Create error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/invoices/:id/workflow-log
 * سجل سير عمل القائمة
 */
router.get('/:id/workflow-log', requireInvoiceView, async (req, res) => {
    try {
        const inv = get('SELECT id FROM invoices WHERE id = ?', [req.params.id]);
        if (!inv) return res.status(404).json({ success: false, error: 'NOT_FOUND' });
        const log = invoiceWorkflow.getWorkflowLog(req.params.id, 50);
        res.json({ success: true, data: log });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/invoices/:id/transition
 * تحويل حالة القائمة (دraft -> waiting -> pending_audit -> completed)
 */
router.post('/:id/transition', requireInvoiceView, async (req, res) => {
    try {
        const { new_status, notes } = req.body || {};
        if (!new_status) return res.status(400).json({ success: false, error: 'new_status required' });
        const result = invoiceWorkflow.transitionTo(
            req.params.id,
            new_status,
            req.user?.id,
            req.user?.role,
            notes
        );
        res.json({ success: true, data: result });
    } catch (error) {
        if (error.message === 'INVOICE_NOT_FOUND') return res.status(404).json({ success: false, error: 'NOT_FOUND' });
        if (error.message === 'INVALID_TRANSITION') return res.status(400).json({ success: false, error: 'INVALID_TRANSITION' });
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/invoices/:id/audit
 * تأشير التدقيق على القائمة
 */
router.post('/:id/audit', requireInvoiceView, async (req, res) => {
    try {
        const inv = get('SELECT id FROM invoices WHERE id = ?', [req.params.id]);
        if (!inv) return res.status(404).json({ success: false, error: 'NOT_FOUND' });
        const result = invoiceWorkflow.setAudited(req.params.id, req.user?.id);
        res.json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/invoices/:id/prepare
 * تأشير التجهيز
 */
router.post('/:id/prepare', requireInvoiceView, async (req, res) => {
    try {
        const inv = get('SELECT id FROM invoices WHERE id = ?', [req.params.id]);
        if (!inv) return res.status(404).json({ success: false, error: 'NOT_FOUND' });
        const result = invoiceWorkflow.setPrepared(req.params.id, req.user?.id);
        res.json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/invoices/:id/convert-to-active
 * تحويل قائمة انتظار إلى قائمة فعالة (وضع الحركة في المخزون)
 */
router.post('/:id/convert-to-active', requireInvoiceView, async (req, res) => {
    try {
        const inv = get('SELECT * FROM invoices WHERE id = ?', [req.params.id]);
        if (!inv) return res.status(404).json({ success: false, error: 'NOT_FOUND' });
        if (inv.status !== 'draft' && inv.status !== 'waiting') {
            return res.status(400).json({ success: false, error: 'Only draft/waiting invoices can be converted' });
        }
        invoiceWorkflow.transitionTo(req.params.id, invoiceWorkflow.INVOICE_STATUS.COMPLETED, req.user?.id, req.user?.role, 'convert_to_active');
        invoiceWorkflow.deleteRemindersForInvoice(req.params.id);
        res.json({ success: true, data: { invoice_id: req.params.id, status: 'completed' } });
    } catch (error) {
        if (error.message === 'INVALID_TRANSITION') return res.status(400).json({ success: false, error: 'INVALID_TRANSITION' });
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/invoices/:id/expenses
 * مصاريف القائمة (نقل، تحميل، جمرك)
 */
router.get('/:id/expenses', requireInvoiceView, async (req, res) => {
    try {
        const inv = get('SELECT id FROM invoices WHERE id = ?', [req.params.id]);
        if (!inv) return res.status(404).json({ success: false, error: 'NOT_FOUND' });
        const rows = all('SELECT * FROM invoice_expenses WHERE invoice_id = ? ORDER BY created_at', [req.params.id]);
        res.json({ success: true, data: rows });
    } catch (e) {
        if (e.message && e.message.includes('no such table')) return res.json({ success: true, data: [] });
        res.status(500).json({ success: false, error: e.message });
    }
});

/**
 * POST /api/invoices/:id/expenses
 * إضافة مصروف للقائمة
 */
router.post('/:id/expenses', requireInvoiceView, async (req, res) => {
    try {
        const { expense_type, amount, currency, notes } = req.body || {};
        if (!expense_type || amount == null) return res.status(400).json({ success: false, error: 'expense_type and amount required' });
        const inv = get('SELECT id FROM invoices WHERE id = ?', [req.params.id]);
        if (!inv) return res.status(404).json({ success: false, error: 'NOT_FOUND' });
        const id = generateId();
        run(`INSERT INTO invoice_expenses (id, invoice_id, expense_type, amount, currency, notes) VALUES (?, ?, ?, ?, ?, ?)`,
            [id, req.params.id, expense_type, parseFloat(amount), currency || 'IQD', notes || null]);
        res.status(201).json({ success: true, data: get('SELECT * FROM invoice_expenses WHERE id = ?', [id]) });
    } catch (e) {
        if (e.message && e.message.includes('no such table')) return res.status(501).json({ success: false, error: 'invoice_expenses table not found' });
        res.status(500).json({ success: false, error: e.message });
    }
});

/**
 * POST /api/invoices/copy-items
 * نسخ بنود من قائمة إلى قائمة جديدة (Phase 2)
 * body: source_invoice_id, item_ids (optional, default all), type, customer_id or supplier_id
 */
router.post('/copy-items', requireInvoiceView, async (req, res) => {
    try {
        const { source_invoice_id, item_ids, type, customer_id, supplier_id } = req.body || {};
        if (!source_invoice_id || !type) return res.status(400).json({ success: false, error: 'source_invoice_id and type required' });
        const src = get('SELECT * FROM invoices WHERE id = ?', [source_invoice_id]);
        if (!src) return res.status(404).json({ success: false, error: 'SOURCE_NOT_FOUND' });
        let items = all('SELECT * FROM invoice_items WHERE invoice_id = ?', [source_invoice_id]);
        if (Array.isArray(item_ids) && item_ids.length) {
            items = items.filter((i) => item_ids.includes(i.id));
        }
        if (!items.length) return res.status(400).json({ success: false, error: 'No items to copy' });
        const newId = generateId();
        const newNumber = `INV-${Date.now().toString().slice(-8)}`;
        let subtotal = 0;
        for (const it of items) subtotal += parseFloat(it.total) || 0;
        run(`
            INSERT INTO invoices (id, invoice_number, type, customer_id, supplier_id, subtotal, total, status, created_by, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'draft', ?, datetime('now'))
        `, [newId, newNumber, type, customer_id || null, supplier_id || null, subtotal, subtotal, req.user?.id]);
        for (const it of items) {
            const itemId = generateId();
            run(`INSERT INTO invoice_items (id, invoice_id, product_id, quantity, unit_price, total) VALUES (?, ?, ?, ?, ?, ?)`,
                [itemId, newId, it.product_id, it.quantity, it.unit_price, it.total]);
        }
        logInvoiceAudit(req, 'invoice_created', newId, newNumber, null, { source_invoice_id, copied_items: items.length });
        res.status(201).json({ success: true, data: get('SELECT * FROM invoices WHERE id = ?', [newId]) });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

/**
 * POST /api/invoices/:id/remind
 * إنشاء تذكير لقائمة بالانتظار
 */
router.post('/:id/remind', requireInvoiceView, async (req, res) => {
    try {
        const { remind_at, notify_creator, notify_supervisor } = req.body || {};
        const remindAt = remind_at || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
        const result = invoiceWorkflow.createReminder(
            req.params.id,
            remindAt,
            notify_supervisor !== false ? 1 : 0,
            notify_supervisor !== false ? 1 : 0
        );
        res.json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * PUT /api/invoices/:id
 * تحديث فاتورة
 */
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const existing = get(`SELECT * FROM invoices WHERE id = ?`, [id]);
        if (!existing) {
            return res.status(404).json({ success: false, error: 'NOT_FOUND' });
        }

        const editPerm = getInvoicePermission(existing.type, 'edit');
        if (req.user?.role !== 'owner' && !checkPermission(req.user, editPerm)) {
            return res.status(403).json({
                success: false,
                error: 'PERMISSION_DENIED',
                message: 'ليس لديك صلاحية لتعديل هذه الفاتورة',
                required_permission: editPerm
            });
        }

        // Build update query dynamically
        const allowedFields = [
            'status', 'payment_status', 'paid_amount', 'notes',
            'discount_amount', 'discount_percent', 'total'
        ];
        
        const setClauses = [];
        const params = [];
        
        for (const field of allowedFields) {
            if (updates[field] !== undefined) {
                setClauses.push(`${field} = ?`);
                params.push(updates[field]);
            }
        }
        
        if (setClauses.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No valid fields to update'
            });
        }
        
        setClauses.push(`updated_at = datetime('now')`);
        params.push(id);
        
        const oldValue = {};
        allowedFields.forEach(f => { if (existing[f] !== undefined) oldValue[f] = existing[f]; });
        const newValue = {};
        allowedFields.forEach(f => { if (updates[f] !== undefined) newValue[f] = updates[f]; });
        
        run(`UPDATE invoices SET ${setClauses.join(', ')} WHERE id = ?`, params);
        
        const updated = get(`SELECT * FROM invoices WHERE id = ?`, [id]);

        logInvoiceAudit(req, 'invoice_modified', id, existing.invoice_number, oldValue, newValue, updates.paid_amount !== undefined ? { payment_updated: true } : null);

        res.json({
            success: true,
            data: updated
        });
    } catch (error) {
        console.error('[Invoices] Update error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/invoices/:id/cancel
 * طلب إلغاء فاتورة (يُنشئ طلب موافقة إلا لمن لديه صلاحية تجاوز الموافقات)
 */
router.post('/:id/cancel', async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        const existing = get(`SELECT * FROM invoices WHERE id = ?`, [id]);
        if (!existing) {
            return res.status(404).json({ success: false, error: 'NOT_FOUND' });
        }
        if (existing.status === 'cancelled' || existing.status === 'voided') {
            return res.status(400).json({ success: false, error: 'ALREADY_CANCELLED', message: 'الفاتورة ملغاة مسبقاً' });
        }

        const voidPerm = getInvoicePermission(existing.type, 'void');
        if (req.user?.role !== 'owner' && !checkPermission(req.user, voidPerm)) {
            return res.status(403).json({
                success: false,
                error: 'PERMISSION_DENIED',
                message: 'ليس لديك صلاحية إلغاء هذه الفاتورة',
                required_permission: voidPerm
            });
        }

        if (hasBypassApproval(req.user)) {
            run(`
                UPDATE invoices 
                SET status = 'cancelled', 
                    cancelled_at = datetime('now'),
                    cancelled_reason = ?,
                    updated_at = datetime('now')
                WHERE id = ?
            `, [reason || null, id]);
            const cancelled = get(`SELECT * FROM invoices WHERE id = ?`, [id]);
            logInvoiceAudit(req, 'invoice_cancelled', id, existing.invoice_number, { status: existing.status }, { status: 'cancelled', reason: reason || null }, { reason: reason || null, bypass: true });
            // تنبيه إلغاء
            try {
                if (notificationService?.notifyEvent) {
                    notificationService.notifyEvent(notificationService.NOTIFICATION_TYPES.INVOICE_CANCELLED, {
                        invoice_number: existing.invoice_number, send_to_admins: true, entity_type: 'invoice', entity_id: id,
                    });
                }
            } catch (_) {}
            return res.json({ success: true, data: cancelled });
        }

        const approval = requestInvoiceVoid(id, reason, req.user);
        logInvoiceAudit(req, 'approval_requested', approval.id, existing.invoice_number, null, { approval_type: 'invoice_void', approval_id: approval.id }, { reason: reason || null });
        res.status(202).json({
            success: true,
            message: 'تم إرسال طلب إلغاء للموافقة',
            data: { approval_id: approval.id, approval_number: approval.approval_number, status: 'pending' }
        });
    } catch (error) {
        console.error('[Invoices] Cancel error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/invoices/:id/cancel-now
 * إلغاء فوري (للمستخدمين ذوي صلاحية تجاوز الموافقات فقط)
 */
router.post('/:id/cancel-now', async (req, res) => {
    try {
        if (!hasBypassApproval(req.user)) {
            return res.status(403).json({ success: false, error: 'PERMISSION_DENIED', message: 'صلاحية تجاوز الموافقات مطلوبة' });
        }
        const { id } = req.params;
        const { reason } = req.body;
        const existing = get(`SELECT * FROM invoices WHERE id = ?`, [id]);
        if (!existing) return res.status(404).json({ success: false, error: 'NOT_FOUND' });
        if (existing.status === 'cancelled' || existing.status === 'voided') {
            return res.status(400).json({ success: false, error: 'ALREADY_CANCELLED' });
        }
        run(`
            UPDATE invoices 
            SET status = 'cancelled', cancelled_at = datetime('now'), cancelled_reason = ?, updated_at = datetime('now')
            WHERE id = ?
        `, [reason || null, id]);
        const cancelled = get(`SELECT * FROM invoices WHERE id = ?`, [id]);
        logInvoiceAudit(req, 'invoice_cancelled', id, existing.invoice_number, { status: existing.status }, { status: 'cancelled' }, { reason: reason || null, bypass: true });
        res.json({ success: true, data: cancelled });
    } catch (error) {
        console.error('[Invoices] Cancel-now error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/invoices/:id/request-deletion
 * طلب حذف فاتورة (يُنشئ طلب موافقة)
 */
router.post('/:id/request-deletion', async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const existing = get(`SELECT * FROM invoices WHERE id = ?`, [id]);
        if (!existing) return res.status(404).json({ success: false, error: 'NOT_FOUND' });
        const deletePerm = getInvoicePermission(existing.type, 'delete');
        if (req.user?.role !== 'owner' && !checkPermission(req.user, deletePerm)) {
            return res.status(403).json({ success: false, error: 'PERMISSION_DENIED', required_permission: deletePerm });
        }
        const approval = requestDeletion('invoice', id, existing.invoice_number, reason || 'طلب حذف فاتورة', req.user);
        logInvoiceAudit(req, 'approval_requested', approval.id, existing.invoice_number, null, { approval_type: 'deletion', approval_id: approval.id }, { reason: reason || null });
        res.status(202).json({
            success: true,
            message: 'تم إرسال طلب الحذف للموافقة',
            data: { approval_id: approval.id, approval_number: approval.approval_number, status: 'pending' }
        });
    } catch (error) {
        console.error('[Invoices] Request-deletion error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * DELETE /api/invoices/:id
 * الحذف المباشر غير مسموح؛ استخدم POST /api/invoices/:id/request-deletion أو POST /api/approvals/deletion
 */
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    const existing = get(`SELECT * FROM invoices WHERE id = ?`, [id]);
    if (!existing) {
        return res.status(404).json({ success: false, error: 'NOT_FOUND' });
    }
    if (hasBypassApproval(req.user)) {
        const deletePerm = getInvoicePermission(existing.type, 'delete');
        if (req.user?.role !== 'owner' && !checkPermission(req.user, deletePerm)) {
            return res.status(403).json({ success: false, error: 'PERMISSION_DENIED', required_permission: deletePerm });
        }
        run(`UPDATE invoices SET status = 'deleted', updated_at = datetime('now') WHERE id = ?`, [id]);
        logInvoiceAudit(req, 'invoice_deleted', id, existing.invoice_number, { status: existing.status }, { status: 'deleted' }, { bypass: true });
        return res.json({ success: true, message: 'Invoice deleted successfully' });
    }
    res.status(400).json({
        success: false,
        error: 'DELETION_REQUIRES_APPROVAL',
        message: 'حذف الفاتورة يتطلب موافقة. استخدم POST /api/invoices/:id/request-deletion مع body { reason } أو POST /api/approvals/deletion مع entity_type: "invoice", entity_id, reason.',
        action_required: 'POST /api/invoices/:id/request-deletion',
        body_example: { reason: 'سبب الحذف' }
    });
});

/**
 * DELETE /api/invoices/:id/force
 * حذف فوري (للمستخدمين ذوي صلاحية تجاوز الموافقات فقط)
 */
router.delete('/:id/force', async (req, res) => {
    try {
        if (!hasBypassApproval(req.user)) {
            return res.status(403).json({ success: false, error: 'PERMISSION_DENIED', message: 'صلاحية تجاوز الموافقات مطلوبة' });
        }
        const { id } = req.params;
        const existing = get(`SELECT * FROM invoices WHERE id = ?`, [id]);
        if (!existing) return res.status(404).json({ success: false, error: 'NOT_FOUND' });
        run(`UPDATE invoices SET status = 'deleted', updated_at = datetime('now') WHERE id = ?`, [id]);
        logInvoiceAudit(req, 'invoice_deleted', id, existing.invoice_number, { status: existing.status }, { status: 'deleted' }, { bypass: true });
        res.json({ success: true, message: 'Invoice deleted successfully' });
    } catch (error) {
        console.error('[Invoices] Force-delete error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/invoices/:id/print
 * طباعة فاتورة
 */
router.get('/:id/print', async (req, res) => {
    try {
        const invoice = get(`
            SELECT i.*,
                   c.name as customer_name, c.phone as customer_phone, c.addresses as customer_address,
                   s.name as supplier_name
            FROM invoices i
            LEFT JOIN customers c ON i.customer_id = c.id
            LEFT JOIN suppliers s ON i.supplier_id = s.id
            WHERE i.id = ?
        `, [req.params.id]);

        if (!invoice) {
            return res.status(404).json({
                success: false,
                error: 'NOT_FOUND'
            });
        }

        const printPerm = getInvoicePermission(invoice.type, 'print');
        if (req.user?.role !== 'owner' && !checkPermission(req.user, printPerm)) {
            return res.status(403).json({
                success: false,
                error: 'PERMISSION_DENIED',
                message: 'ليس لديك صلاحية طباعة هذه الفاتورة',
                required_permission: printPerm
            });
        }

        const items = all(`
            SELECT ii.*, p.name as product_name
            FROM invoice_items ii
            LEFT JOIN products p ON ii.product_id = p.id
            WHERE ii.invoice_id = ?
        `, [invoice.id]);

        res.json({
            success: true,
            data: {
                invoice,
                items,
                company: {
                    name: 'BI Company',
                    address: 'Baghdad, Iraq',
                    phone: '+964 XXX XXX XXXX'
                }
            }
        });
    } catch (error) {
        console.error('[Invoices] Print error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;

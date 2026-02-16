/**
 * Phase 7-12 Migration — Templates, analytics indexes
 */
exports.up = async function (db) {
    // ═══ INVOICE TEMPLATES ═══
    try {
        await db.query(`
      CREATE TABLE IF NOT EXISTS invoice_templates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        type VARCHAR(30) NOT NULL,
        header_html TEXT DEFAULT '',
        body_html TEXT DEFAULT '',
        footer_html TEXT DEFAULT '',
        css TEXT DEFAULT '',
        paper_size VARCHAR(10) DEFAULT 'A4',
        orientation VARCHAR(20) DEFAULT 'portrait',
        is_default BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP
      )
    `);
    } catch (e) { if (!e.message.includes('already exists')) console.warn('invoice_templates:', e.message); }

    // ═══ CUSTOMER AREA COLUMN ═══
    try { await db.query(`ALTER TABLE customers ADD COLUMN area VARCHAR(100)`); } catch (e) { if (!e.message.includes('already exists')) console.warn('customers.area:', e.message); }

    // ═══ INDEXES FOR PERFORMANCE ═══
    const indexes = [
        'CREATE INDEX IF NOT EXISTS idx_invoices_customer_type ON invoices(customer_id, type)',
        'CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at)',
        'CREATE INDEX IF NOT EXISTS idx_invoices_salesperson ON invoices(salesperson_id)',
        'CREATE INDEX IF NOT EXISTS idx_vouchers_customer ON vouchers(customer_id)',
        'CREATE INDEX IF NOT EXISTS idx_vouchers_supplier ON vouchers(supplier_id)',
        'CREATE INDEX IF NOT EXISTS idx_vouchers_type ON vouchers(type)',
        'CREATE INDEX IF NOT EXISTS idx_products_quantity ON products(quantity)',
        'CREATE INDEX IF NOT EXISTS idx_cashbox_movements_cashbox ON cashbox_movements(cashbox_id)',
    ];
    for (const idx of indexes) {
        try { await db.query(idx); } catch (e) { console.warn('Index:', e.message); }
    }

    console.log('✅ Phase 7-12 migration complete');
};

exports.down = async function (db) {
    console.log('Phase 7-12 migration down — no-op');
};

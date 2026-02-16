/**
 * Phase 6 Migration — Cashbox, multi-currency balances, alerts, shares
 */
exports.up = async function (db) {
    // ═══ CASHBOXES ═══
    try {
        await db.query(`
      CREATE TABLE IF NOT EXISTS cashboxes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        currency VARCHAR(10) DEFAULT 'IQD',
        balance DECIMAL(15,2) DEFAULT 0,
        responsible_user_id UUID,
        notes TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_by UUID,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP
      )
    `);
    } catch (e) { if (!e.message.includes('already exists')) console.warn('cashboxes:', e.message); }

    try {
        await db.query(`
      CREATE TABLE IF NOT EXISTS cashbox_movements (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        cashbox_id UUID NOT NULL REFERENCES cashboxes(id),
        type VARCHAR(30) NOT NULL,
        amount DECIMAL(15,2) NOT NULL,
        currency VARCHAR(10) DEFAULT 'IQD',
        description TEXT,
        reference_id UUID,
        balance_after DECIMAL(15,2),
        created_by UUID,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    } catch (e) { if (!e.message.includes('already exists')) console.warn('cashbox_movements:', e.message); }

    // ═══ MULTI-CURRENCY BALANCES ═══
    try {
        await db.query(`
      CREATE TABLE IF NOT EXISTS customer_balances (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
        currency VARCHAR(10) NOT NULL DEFAULT 'IQD',
        balance DECIMAL(15,2) DEFAULT 0,
        last_payment_at TIMESTAMP,
        UNIQUE(customer_id, currency)
      )
    `);
    } catch (e) { if (!e.message.includes('already exists')) console.warn('customer_balances:', e.message); }

    try {
        await db.query(`
      CREATE TABLE IF NOT EXISTS supplier_balances (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
        currency VARCHAR(10) NOT NULL DEFAULT 'IQD',
        balance DECIMAL(15,2) DEFAULT 0,
        last_payment_at TIMESTAMP,
        UNIQUE(supplier_id, currency)
      )
    `);
    } catch (e) { if (!e.message.includes('already exists')) console.warn('supplier_balances:', e.message); }

    // ═══ CUSTOMER ENHANCEMENTS ═══
    const custCols = [
        { name: 'phone2', type: 'VARCHAR(20)' },
        { name: 'phone3', type: 'VARCHAR(20)' },
        { name: 'debt_limit', type: 'DECIMAL(15,2) DEFAULT 0' },
        { name: 'protection_level', type: "VARCHAR(20) DEFAULT 'medium'" },
        { name: 'salesperson_id', type: 'UUID' },
        { name: 'customer_type_id', type: 'UUID' },
        { name: 'last_payment_at', type: 'TIMESTAMP' },
        { name: 'last_invoice_at', type: 'TIMESTAMP' },
        { name: 'total_purchases', type: 'DECIMAL(15,2) DEFAULT 0' },
        { name: 'total_paid', type: 'DECIMAL(15,2) DEFAULT 0' },
    ];
    for (const col of custCols) {
        try { await db.query(`ALTER TABLE customers ADD COLUMN ${col.name} ${col.type}`); } catch (e) { if (!e.message.includes('already exists')) console.warn(`customers.${col.name}:`, e.message); }
    }

    // ═══ SUPPLIER ENHANCEMENTS ═══
    const suppCols = [
        { name: 'phone2', type: 'VARCHAR(20)' },
        { name: 'phone3', type: 'VARCHAR(20)' },
        { name: 'debt_limit', type: 'DECIMAL(15,2) DEFAULT 0' },
        { name: 'last_payment_at', type: 'TIMESTAMP' },
        { name: 'last_invoice_at', type: 'TIMESTAMP' },
        { name: 'total_purchases', type: 'DECIMAL(15,2) DEFAULT 0' },
        { name: 'total_paid', type: 'DECIMAL(15,2) DEFAULT 0' },
    ];
    for (const col of suppCols) {
        try { await db.query(`ALTER TABLE suppliers ADD COLUMN ${col.name} ${col.type}`); } catch (e) { if (!e.message.includes('already exists')) console.warn(`suppliers.${col.name}:`, e.message); }
    }

    // ═══ MULTI-PARTY VOUCHER ITEMS ═══
    try {
        await db.query(`
      CREATE TABLE IF NOT EXISTS voucher_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        voucher_id UUID NOT NULL REFERENCES vouchers(id) ON DELETE CASCADE,
        customer_id UUID,
        supplier_id UUID,
        amount DECIMAL(15,2) NOT NULL,
        currency VARCHAR(10) DEFAULT 'IQD',
        invoice_id UUID,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    } catch (e) { if (!e.message.includes('already exists')) console.warn('voucher_items:', e.message); }

    // ═══ VOUCHER ENHANCEMENTS ═══
    const vCols = [
        { name: 'discount_granted', type: 'DECIMAL(15,2) DEFAULT 0' },
        { name: 'discount_approved_by', type: 'UUID' },
        { name: 'balance_after', type: 'DECIMAL(15,2)' },
        { name: 'previous_payment_amount', type: 'DECIMAL(15,2)' },
        { name: 'previous_payment_date', type: 'TIMESTAMP' },
        { name: 'is_multi_party', type: 'BOOLEAN DEFAULT FALSE' },
        { name: 'transfer_company', type: 'VARCHAR(255)' },
        { name: 'transfer_fee', type: 'DECIMAL(15,2) DEFAULT 0' },
        { name: 'fee_payer', type: "VARCHAR(20) DEFAULT 'us'" },
    ];
    for (const col of vCols) {
        try { await db.query(`ALTER TABLE vouchers ADD COLUMN ${col.name} ${col.type}`); } catch (e) { if (!e.message.includes('already exists')) console.warn(`vouchers.${col.name}:`, e.message); }
    }

    // ═══ SHARES SYSTEM ═══
    try {
        await db.query(`
      CREATE TABLE IF NOT EXISTS shares (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        shareholder_name VARCHAR(255) NOT NULL,
        phone VARCHAR(20),
        share_count INT DEFAULT 0,
        share_value DECIMAL(15,2) DEFAULT 0,
        total_value DECIMAL(15,2) DEFAULT 0,
        total_distributed DECIMAL(15,2) DEFAULT 0,
        last_distribution_at TIMESTAMP,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    } catch (e) { if (!e.message.includes('already exists')) console.warn('shares:', e.message); }

    try {
        await db.query(`
      CREATE TABLE IF NOT EXISTS share_distributions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        share_id UUID NOT NULL REFERENCES shares(id),
        amount DECIMAL(15,2) NOT NULL,
        period VARCHAR(20),
        distribution_date DATE,
        notes TEXT,
        created_by UUID,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    } catch (e) { if (!e.message.includes('already exists')) console.warn('share_distributions:', e.message); }

    console.log('✅ Phase 6 migration complete');
};

exports.down = async function (db) {
    console.log('Phase 6 migration down — no-op');
};

/**
 * Phase 3 Migration — Enhanced vouchers, return invoices, customer type pricing
 */
exports.up = async function (db) {
    // ═══ VOUCHER TABLE ENHANCEMENTS ═══
    const voucherColumns = [
        { name: 'exchange_rate', type: 'DECIMAL(12,4) DEFAULT 1' },
        { name: 'amount_in_default', type: 'DECIMAL(15,2) DEFAULT 0' },
        { name: 'invoice_id', type: 'UUID' },
        { name: 'invoice_number', type: 'VARCHAR(100)' },
        { name: 'cashbox_id', type: 'UUID' },
        { name: 'discount_amount', type: 'DECIMAL(15,2) DEFAULT 0' },
        { name: 'discount_approved_by', type: 'UUID' },
        { name: 'previous_balance', type: 'DECIMAL(15,2)' },
        { name: 'balance_after', type: 'DECIMAL(15,2)' },
        { name: 'secondary_amount', type: 'DECIMAL(15,2)' },
        { name: 'secondary_currency', type: 'VARCHAR(10)' },
        { name: 'expense_category', type: 'VARCHAR(100)' },
        { name: 'expense_to', type: 'VARCHAR(255)' },
        { name: 'hawala_company', type: 'VARCHAR(255)' },
        { name: 'hawala_fee', type: 'DECIMAL(12,2) DEFAULT 0' },
        { name: 'hawala_fee_on_us', type: 'BOOLEAN DEFAULT FALSE' },
        { name: 'from_account_id', type: 'UUID' },
        { name: 'to_account_id', type: 'UUID' },
        { name: 'status', type: "VARCHAR(20) DEFAULT 'active'" },
        { name: 'cancel_reason', type: 'TEXT' },
        { name: 'cancelled_by', type: 'UUID' },
        { name: 'print_count', type: 'INT DEFAULT 0' },
        { name: 'updated_at', type: 'TIMESTAMP' },
    ];

    for (const col of voucherColumns) {
        try {
            await db.query(`ALTER TABLE vouchers ADD COLUMN ${col.name} ${col.type}`);
        } catch (e) {
            if (!e.message.includes('already exists')) console.warn(`vouchers.${col.name}: ${e.message}`);
        }
    }

    // ═══ RETURN INVOICES TABLE ═══
    try {
        await db.query(`
      CREATE TABLE IF NOT EXISTS return_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        return_id UUID NOT NULL REFERENCES returns(id) ON DELETE CASCADE,
        product_id UUID REFERENCES products(id),
        original_item_id UUID,
        quantity INT NOT NULL DEFAULT 0,
        returned_quantity INT NOT NULL DEFAULT 0,
        unit_price DECIMAL(15,2) DEFAULT 0,
        total_price DECIMAL(15,2) DEFAULT 0,
        reason TEXT,
        condition VARCHAR(50) DEFAULT 'good',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    } catch (e) {
        if (!e.message.includes('already exists')) console.warn('return_items:', e.message);
    }

    // Enhanced returns columns
    const returnColumns = [
        { name: 'return_number', type: 'VARCHAR(100)' },
        { name: 'return_type', type: "VARCHAR(30) DEFAULT 'purchase_return'" },
        { name: 'original_invoice_id', type: 'UUID' },
        { name: 'original_invoice_number', type: 'VARCHAR(100)' },
        { name: 'reason', type: 'TEXT' },
        { name: 'subtotal', type: 'DECIMAL(15,2) DEFAULT 0' },
        { name: 'discount_amount', type: 'DECIMAL(15,2) DEFAULT 0' },
        { name: 'total', type: 'DECIMAL(15,2) DEFAULT 0' },
        { name: 'currency', type: "VARCHAR(10) DEFAULT 'IQD'" },
        { name: 'exchange_rate', type: 'DECIMAL(12,4) DEFAULT 1' },
        { name: 'approved_by', type: 'UUID' },
        { name: 'approved_at', type: 'TIMESTAMP' },
        { name: 'notes', type: 'TEXT' },
        { name: 'updated_at', type: 'TIMESTAMP' },
    ];

    for (const col of returnColumns) {
        try {
            await db.query(`ALTER TABLE returns ADD COLUMN ${col.name} ${col.type}`);
        } catch (e) {
            if (!e.message.includes('already exists')) console.warn(`returns.${col.name}: ${e.message}`);
        }
    }

    // ═══ CUSTOMER ENHANCEMENTS ═══
    const customerColumns = [
        { name: 'customer_type_id', type: 'UUID' },
        { name: 'commission_rate', type: 'DECIMAL(5,2) DEFAULT 0' },
        { name: 'credit_limit', type: 'DECIMAL(15,2) DEFAULT 0' },
        { name: 'protection_level', type: "VARCHAR(20) DEFAULT 'medium'" },
        { name: 'last_payment_date', type: 'TIMESTAMP' },
        { name: 'last_invoice_date', type: 'TIMESTAMP' },
        { name: 'total_purchases', type: 'DECIMAL(15,2) DEFAULT 0' },
        { name: 'total_payments', type: 'DECIMAL(15,2) DEFAULT 0' },
        { name: 'balance_usd', type: 'DECIMAL(15,2) DEFAULT 0' },
    ];

    for (const col of customerColumns) {
        try {
            await db.query(`ALTER TABLE customers ADD COLUMN ${col.name} ${col.type}`);
        } catch (e) {
            if (!e.message.includes('already exists')) console.warn(`customers.${col.name}: ${e.message}`);
        }
    }

    // ═══ SUPPLIER ENHANCEMENTS ═══
    const supplierColumns = [
        { name: 'last_payment_date', type: 'TIMESTAMP' },
        { name: 'last_invoice_date', type: 'TIMESTAMP' },
        { name: 'total_purchases', type: 'DECIMAL(15,2) DEFAULT 0' },
        { name: 'total_payments', type: 'DECIMAL(15,2) DEFAULT 0' },
        { name: 'balance_usd', type: 'DECIMAL(15,2) DEFAULT 0' },
        { name: 'credit_limit', type: 'DECIMAL(15,2) DEFAULT 0' },
    ];

    for (const col of supplierColumns) {
        try {
            await db.query(`ALTER TABLE suppliers ADD COLUMN ${col.name} ${col.type}`);
        } catch (e) {
            if (!e.message.includes('already exists')) console.warn(`suppliers.${col.name}: ${e.message}`);
        }
    }

    console.log('✅ Phase 3 migration complete');
};

exports.down = async function (db) {
    // Not reversible — columns only
    console.log('Phase 3 migration down — no-op');
};

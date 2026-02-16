/**
 * Phase 1: Infrastructure — currencies, exchange_rates, units, product_units,
 * customer_types, product_prices, audit_log, + enhancements to invoices/products/customers/suppliers
 */

async function up(pool) {
    // ═══════════════════════════════════
    // 1. CURRENCIES
    // ═══════════════════════════════════
    await pool.query(`
    CREATE TABLE IF NOT EXISTS currencies (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      code VARCHAR(10) NOT NULL UNIQUE,
      name_ar VARCHAR(100) NOT NULL,
      name_en VARCHAR(100),
      symbol VARCHAR(10),
      exchange_rate NUMERIC(18,6) DEFAULT 1,
      is_default BOOLEAN DEFAULT FALSE,
      is_active BOOLEAN DEFAULT TRUE,
      decimal_places INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )
  `);

    // Seed default currencies
    await pool.query(`
    INSERT INTO currencies (id, code, name_ar, name_en, symbol, exchange_rate, is_default, decimal_places)
    VALUES
      (gen_random_uuid(), 'IQD', 'دينار عراقي', 'Iraqi Dinar', 'د.ع', 1, TRUE, 0),
      (gen_random_uuid(), 'USD', 'دولار أمريكي', 'US Dollar', '$', 1480, FALSE, 2)
    ON CONFLICT (code) DO NOTHING
  `);

    await pool.query(`
    CREATE TABLE IF NOT EXISTS exchange_rates (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      from_currency VARCHAR(10) NOT NULL,
      to_currency VARCHAR(10) NOT NULL,
      rate NUMERIC(18,6) NOT NULL,
      effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
      created_by UUID,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(from_currency, to_currency, effective_date)
    )
  `);

    // ═══════════════════════════════════
    // 2. UNITS
    // ═══════════════════════════════════
    await pool.query(`
    CREATE TABLE IF NOT EXISTS units (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(100) NOT NULL,
      name_en VARCHAR(100),
      abbreviation VARCHAR(20),
      type VARCHAR(50) DEFAULT 'quantity',
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )
  `);

    // Seed default units
    await pool.query(`
    INSERT INTO units (id, name, name_en, abbreviation, type) VALUES
      (gen_random_uuid(), 'قطعة', 'Piece', 'pcs', 'quantity'),
      (gen_random_uuid(), 'كارتون', 'Carton', 'ctn', 'quantity'),
      (gen_random_uuid(), 'بطل', 'Bottle', 'btl', 'quantity'),
      (gen_random_uuid(), 'دبة', 'Can', 'can', 'quantity'),
      (gen_random_uuid(), 'كيس', 'Bag', 'bag', 'quantity'),
      (gen_random_uuid(), 'سيت', 'Set', 'set', 'quantity'),
      (gen_random_uuid(), 'باكت', 'Pack', 'pk', 'quantity'),
      (gen_random_uuid(), 'كيلوغرام', 'Kilogram', 'kg', 'weight'),
      (gen_random_uuid(), 'غرام', 'Gram', 'g', 'weight'),
      (gen_random_uuid(), 'طن', 'Ton', 'ton', 'weight'),
      (gen_random_uuid(), 'لتر', 'Liter', 'L', 'volume'),
      (gen_random_uuid(), 'مللتر', 'Milliliter', 'mL', 'volume'),
      (gen_random_uuid(), 'متر', 'Meter', 'm', 'length')
    ON CONFLICT DO NOTHING
  `);

    await pool.query(`
    CREATE TABLE IF NOT EXISTS product_units (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      unit_id UUID NOT NULL REFERENCES units(id),
      conversion_factor NUMERIC(18,6) DEFAULT 1,
      is_primary BOOLEAN DEFAULT FALSE,
      barcode VARCHAR(100),
      price NUMERIC(18,2),
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(product_id, unit_id)
    )
  `);

    // ═══════════════════════════════════
    // 3. CUSTOMER TYPES + PRODUCT PRICES
    // ═══════════════════════════════════
    await pool.query(`
    CREATE TABLE IF NOT EXISTS customer_types (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(100) NOT NULL UNIQUE,
      name_en VARCHAR(100),
      discount_percent NUMERIC(5,2) DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )
  `);

    await pool.query(`
    INSERT INTO customer_types (id, name, name_en, sort_order) VALUES
      (gen_random_uuid(), 'جملة', 'Wholesale', 1),
      (gen_random_uuid(), 'مفرد', 'Retail', 2),
      (gen_random_uuid(), 'وكيل', 'Agent', 3),
      (gen_random_uuid(), 'خاص', 'Special', 4),
      (gen_random_uuid(), 'مطروح', 'Covered', 5)
    ON CONFLICT (name) DO NOTHING
  `);

    await pool.query(`
    CREATE TABLE IF NOT EXISTS product_prices (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      customer_type_id UUID NOT NULL REFERENCES customer_types(id),
      price NUMERIC(18,2) NOT NULL DEFAULT 0,
      offer_qty INTEGER DEFAULT 0,
      offer_bonus INTEGER DEFAULT 0,
      offer_percent NUMERIC(5,2) DEFAULT 0,
      min_qty INTEGER DEFAULT 1,
      currency VARCHAR(10) DEFAULT 'IQD',
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(product_id, customer_type_id, currency)
    )
  `);

    // ═══════════════════════════════════
    // 4. AUDIT LOG
    // ═══════════════════════════════════
    await pool.query(`
    CREATE TABLE IF NOT EXISTS audit_log (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      entity_type VARCHAR(100) NOT NULL,
      entity_id UUID,
      action VARCHAR(50) NOT NULL,
      old_values JSONB,
      new_values JSONB,
      changed_fields TEXT[],
      user_id UUID,
      user_name VARCHAR(200),
      ip_address VARCHAR(50),
      user_agent TEXT,
      description TEXT,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )
  `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity_type, entity_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_audit_log_date ON audit_log(created_at DESC)`);

    // ═══════════════════════════════════
    // 5. ENHANCE PRODUCTS TABLE
    // ═══════════════════════════════════
    const productCols = [
        { name: 'serial_number', def: "VARCHAR(100)" },
        { name: 'name_supplier', def: "VARCHAR(255)" },
        { name: 'name_scientific', def: "VARCHAR(255)" },
        { name: 'default_supplier_id', def: "UUID" },
        { name: 'default_warehouse_id', def: "UUID" },
        { name: 'opening_balance', def: "INTEGER DEFAULT 0" },
        { name: 'weight_unit', def: "NUMERIC(18,4)" },
        { name: 'weight_piece', def: "NUMERIC(18,4)" },
        { name: 'weight_uom', def: "VARCHAR(20) DEFAULT 'kg'" },
        { name: 'volume_unit', def: "NUMERIC(18,4)" },
        { name: 'volume_piece', def: "NUMERIC(18,4)" },
        { name: 'volume_uom', def: "VARCHAR(20) DEFAULT 'cm3'" },
        { name: 'pieces_per_unit', def: "INTEGER DEFAULT 1" },
        { name: 'piece_size', def: "VARCHAR(100)" },
        { name: 'auto_pricing', def: "BOOLEAN DEFAULT FALSE" },
        { name: 'profit_margin', def: "NUMERIC(5,2)" },
        { name: 'max_quantity', def: "INTEGER" },
        { name: 'colors', def: "TEXT" },
        { name: 'country_of_origin', def: "VARCHAR(100)" },
        { name: 'warning_text', def: "TEXT" },
        { name: 'is_frozen', def: "BOOLEAN DEFAULT FALSE" },
        { name: 'frozen_until', def: "TIMESTAMPTZ" },
        { name: 'freeze_at_zero', def: "BOOLEAN DEFAULT FALSE" },
        { name: 'tags', def: "TEXT[]" },
        { name: 'image_url', def: "VARCHAR(500)" },
        { name: 'group_name', def: "VARCHAR(100)" },
        { name: 'stagnation_days', def: "INTEGER" },
        { name: 'last_sold_at', def: "TIMESTAMPTZ" },
        { name: 'last_purchased_at', def: "TIMESTAMPTZ" },
    ];
    for (const col of productCols) {
        await pool.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS ${col.name} ${col.def}`).catch(() => { });
    }

    // ═══════════════════════════════════
    // 6. ENHANCE INVOICES TABLE
    // ═══════════════════════════════════
    const invoiceCols = [
        { name: 'currency', def: "VARCHAR(10) DEFAULT 'IQD'" },
        { name: 'exchange_rate', def: "NUMERIC(18,6) DEFAULT 1" },
        { name: 'supplier_invoice_no', def: "VARCHAR(100)" },
        { name: 'supplier_invoice_date', def: "DATE" },
        { name: 'driver_name', def: "VARCHAR(200)" },
        { name: 'driver_phone', def: "VARCHAR(50)" },
        { name: 'vehicle_no', def: "VARCHAR(50)" },
        { name: 'auditor_id', def: "UUID" },
        { name: 'audited_at', def: "TIMESTAMPTZ" },
        { name: 'is_audited', def: "BOOLEAN DEFAULT FALSE" },
        { name: 'preparer_id', def: "UUID" },
        { name: 'prepared_at', def: "TIMESTAMPTZ" },
        { name: 'receiver_name', def: "VARCHAR(200)" },
        { name: 'entry_date', def: "TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP" },
        { name: 'invoice_date', def: "DATE DEFAULT CURRENT_DATE" },
        { name: 'protection_level', def: "VARCHAR(20) DEFAULT 'medium'" },
        { name: 'due_days', def: "INTEGER" },
        { name: 'total_weight', def: "NUMERIC(18,4)" },
        { name: 'total_volume', def: "NUMERIC(18,4)" },
        { name: 'is_incomplete', def: "BOOLEAN DEFAULT FALSE" },
        { name: 'shipping_method', def: "VARCHAR(100)" },
        { name: 'attachment_url', def: "VARCHAR(500)" },
        { name: 'attachment_url_2', def: "VARCHAR(500)" },
        { name: 'supervisor_comment', def: "TEXT" },
        { name: 'supervisor_comment_visible', def: "BOOLEAN DEFAULT TRUE" },
        { name: 'cancel_reason', def: "TEXT" },
        { name: 'cancelled_by', def: "UUID" },
        { name: 'confirmed_at', def: "TIMESTAMPTZ" },
        { name: 'confirmed_by', def: "UUID" },
        { name: 'status_notes', def: "TEXT" },
        { name: 'salesperson_id', def: "UUID" },
        { name: 'commission_amount', def: "NUMERIC(18,2) DEFAULT 0" },
        { name: 'profit_total', def: "NUMERIC(18,2) DEFAULT 0" },
        { name: 'expenses_total', def: "NUMERIC(18,2) DEFAULT 0" },
        { name: 'print_count', def: "INTEGER DEFAULT 0" },
        { name: 'last_printed_at', def: "TIMESTAMPTZ" },
        { name: 'last_printed_by', def: "UUID" },
        { name: 'discount_type', def: "VARCHAR(20) DEFAULT 'fixed'" },
        { name: 'total_before_discount', def: "NUMERIC(18,2) DEFAULT 0" },
        { name: 'total_in_words', def: "TEXT" },
        { name: 'warehouse_id', def: "UUID" },
        { name: 'collect_previous_debt', def: "BOOLEAN DEFAULT FALSE" },
        { name: 'collect_debt_amount', def: "NUMERIC(18,2) DEFAULT 0" },
    ];
    for (const col of invoiceCols) {
        await pool.query(`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS ${col.name} ${col.def}`).catch(() => { });
    }

    // ═══════════════════════════════════
    // 7. ENHANCE INVOICE_ITEMS TABLE
    // ═══════════════════════════════════
    const itemCols = [
        { name: 'unit_id', def: "UUID" },
        { name: 'secondary_unit_id', def: "UUID" },
        { name: 'secondary_qty', def: "NUMERIC(18,4)" },
        { name: 'weight', def: "NUMERIC(18,4)" },
        { name: 'volume', def: "NUMERIC(18,4)" },
        { name: 'offer_qty', def: "INTEGER DEFAULT 0" },
        { name: 'offer_bonus', def: "INTEGER DEFAULT 0" },
        { name: 'expiry_date', def: "DATE" },
        { name: 'item_notes', def: "TEXT" },
        { name: 'currency', def: "VARCHAR(10) DEFAULT 'IQD'" },
        { name: 'exchange_rate', def: "NUMERIC(18,6) DEFAULT 1" },
        { name: 'purchase_price', def: "NUMERIC(18,2)" },
        { name: 'sell_price', def: "NUMERIC(18,2)" },
        { name: 'profit', def: "NUMERIC(18,2)" },
        { name: 'stagnation_days', def: "INTEGER" },
        { name: 'barcode', def: "VARCHAR(100)" },
        { name: 'sort_order', def: "INTEGER DEFAULT 0" },
    ];
    for (const col of itemCols) {
        await pool.query(`ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS ${col.name} ${col.def}`).catch(() => { });
    }

    // ═══════════════════════════════════
    // 8. INVOICE EXPENSES TABLE
    // ═══════════════════════════════════
    await pool.query(`
    CREATE TABLE IF NOT EXISTS invoice_expenses (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
      description VARCHAR(255) NOT NULL,
      amount NUMERIC(18,2) NOT NULL DEFAULT 0,
      currency VARCHAR(10) DEFAULT 'IQD',
      category VARCHAR(100),
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )
  `);

    // ═══════════════════════════════════
    // 9. ENHANCE CUSTOMERS TABLE
    // ═══════════════════════════════════
    const custCols = [
        { name: 'customer_type_id', def: "UUID" },
        { name: 'address', def: "TEXT" },
        { name: 'city', def: "VARCHAR(100)" },
        { name: 'region', def: "VARCHAR(100)" },
        { name: 'default_salesperson_id', def: "UUID" },
        { name: 'protection_level', def: "VARCHAR(20) DEFAULT 'medium'" },
        { name: 'max_debt', def: "NUMERIC(18,2)" },
        { name: 'payment_due_days', def: "INTEGER DEFAULT 30" },
        { name: 'balance_usd', def: "NUMERIC(18,2) DEFAULT 0" },
    ];
    for (const col of custCols) {
        await pool.query(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS ${col.name} ${col.def}`).catch(() => { });
    }

    // ═══════════════════════════════════
    // 10. ENHANCE SUPPLIERS TABLE
    // ═══════════════════════════════════
    const suppCols = [
        { name: 'protection_level', def: "VARCHAR(20) DEFAULT 'medium'" },
        { name: 'payment_due_days', def: "INTEGER DEFAULT 30" },
        { name: 'balance_usd', def: "NUMERIC(18,2) DEFAULT 0" },
        { name: 'factory_name', def: "VARCHAR(255)" },
    ];
    for (const col of suppCols) {
        await pool.query(`ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS ${col.name} ${col.def}`).catch(() => { });
    }

    // ═══════════════════════════════════
    // 11. ENHANCE VOUCHERS TABLE
    // ═══════════════════════════════════
    const voucherCols = [
        { name: 'exchange_rate', def: "NUMERIC(18,6) DEFAULT 1" },
        { name: 'equivalent_amount', def: "NUMERIC(18,2)" },
        { name: 'equivalent_currency', def: "VARCHAR(10)" },
        { name: 'linked_invoice_id', def: "UUID" },
        { name: 'cashbox_id', def: "UUID" },
        { name: 'balance_after', def: "NUMERIC(18,2)" },
        { name: 'balance_status', def: "VARCHAR(20)" },
        { name: 'prev_payment_amount', def: "NUMERIC(18,2)" },
        { name: 'prev_payment_date', def: "TIMESTAMPTZ" },
        { name: 'granted_discount', def: "NUMERIC(18,2) DEFAULT 0" },
        { name: 'discount_approved_by', def: "UUID" },
        { name: 'is_multi', def: "BOOLEAN DEFAULT FALSE" },
        { name: 'received_from_name', def: "VARCHAR(200)" },
        { name: 'voucher_date', def: "DATE DEFAULT CURRENT_DATE" },
    ];
    for (const col of voucherCols) {
        await pool.query(`ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS ${col.name} ${col.def}`).catch(() => { });
    }

    // ═══════════════════════════════════
    // 12. CASHBOXES TABLE
    // ═══════════════════════════════════
    await pool.query(`
    CREATE TABLE IF NOT EXISTS cashboxes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(200) NOT NULL,
      name_en VARCHAR(200),
      type VARCHAR(50) DEFAULT 'cashbox',
      currency VARCHAR(10) DEFAULT 'IQD',
      balance NUMERIC(18,2) DEFAULT 0,
      assigned_to UUID,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )
  `);

    // ═══════════════════════════════════
    // 13. ENHANCE RETURNS TABLE
    // ═══════════════════════════════════
    const returnCols = [
        { name: 'return_type', def: "VARCHAR(20) DEFAULT 'partial'" },
        { name: 'auditor_id', def: "UUID" },
        { name: 'audited_at', def: "TIMESTAMPTZ" },
        { name: 'preparer_id', def: "UUID" },
        { name: 'warehouse_id', def: "UUID" },
        { name: 'total_returned', def: "NUMERIC(18,2) DEFAULT 0" },
        { name: 'original_total', def: "NUMERIC(18,2) DEFAULT 0" },
        { name: 'actual_total', def: "NUMERIC(18,2) DEFAULT 0" },
        { name: 'items_returned_count', def: "INTEGER DEFAULT 0" },
        { name: 'original_items_count', def: "INTEGER DEFAULT 0" },
    ];
    for (const col of returnCols) {
        await pool.query(`ALTER TABLE returns ADD COLUMN IF NOT EXISTS ${col.name} ${col.def}`).catch(() => { });
    }

    console.log('✅ Phase 1 migration complete — currencies, units, customer_types, product_prices, audit_log, enhanced invoices/products/customers/suppliers/vouchers/returns');
}

async function down(pool) {
    await pool.query('DROP TABLE IF EXISTS invoice_expenses');
    await pool.query('DROP TABLE IF EXISTS product_prices');
    await pool.query('DROP TABLE IF EXISTS product_units');
    await pool.query('DROP TABLE IF EXISTS exchange_rates');
    await pool.query('DROP TABLE IF EXISTS audit_log');
    await pool.query('DROP TABLE IF EXISTS cashboxes');
    await pool.query('DROP TABLE IF EXISTS customer_types');
    await pool.query('DROP TABLE IF EXISTS units');
    await pool.query('DROP TABLE IF EXISTS currencies');
}

module.exports = { up, down };

/**
 * Phase 5 Migration — Advanced product fields + report tables
 */
exports.up = async function (db) {
    // ═══ PRODUCT ENHANCEMENTS ═══
    const productColumns = [
        { name: 'supplier_name', type: 'VARCHAR(255)' },
        { name: 'scientific_name', type: 'VARCHAR(255)' },
        { name: 'default_supplier_id', type: 'UUID' },
        { name: 'opening_balance', type: 'INT DEFAULT 0' },
        { name: 'weight_unit', type: 'DECIMAL(10,3)' },
        { name: 'weight_piece', type: 'DECIMAL(10,3)' },
        { name: 'volume_unit', type: 'DECIMAL(10,3)' },
        { name: 'volume_piece', type: 'DECIMAL(10,3)' },
        { name: 'colors', type: 'TEXT' },
        { name: 'country', type: 'VARCHAR(100)' },
        { name: 'tags', type: 'TEXT' },
        { name: 'warning_note', type: 'TEXT' },
        { name: 'is_frozen', type: 'BOOLEAN DEFAULT FALSE' },
        { name: 'frozen_type', type: "VARCHAR(20)" },
        { name: 'frozen_at', type: 'TIMESTAMP' },
        { name: 'auto_freeze_at_zero', type: 'BOOLEAN DEFAULT FALSE' },
        { name: 'is_disabled', type: 'BOOLEAN DEFAULT FALSE' },
        { name: 'disabled_reason', type: 'TEXT' },
        { name: 'last_purchase_price', type: 'DECIMAL(15,2)' },
        { name: 'last_sale_price', type: 'DECIMAL(15,2)' },
        { name: 'last_sold_at', type: 'TIMESTAMP' },
        { name: 'last_purchased_at', type: 'TIMESTAMP' },
        { name: 'total_sold', type: 'INT DEFAULT 0' },
        { name: 'total_purchased', type: 'INT DEFAULT 0' },
        { name: 'total_damaged', type: 'INT DEFAULT 0' },
        { name: 'total_consumed', type: 'INT DEFAULT 0' },
        { name: 'profit_margin', type: 'DECIMAL(5,2) DEFAULT 0' },
    ];

    for (const col of productColumns) {
        try {
            await db.query(`ALTER TABLE products ADD COLUMN ${col.name} ${col.type}`);
        } catch (e) {
            if (!e.message.includes('already exists')) console.warn(`products.${col.name}: ${e.message}`);
        }
    }

    // ═══ PRODUCT BATCH EXPIRY ═══
    try {
        await db.query(`
      CREATE TABLE IF NOT EXISTS product_batches (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        batch_number VARCHAR(100),
        quantity INT DEFAULT 0,
        expiry_date DATE,
        purchase_price DECIMAL(15,2),
        warehouse_id UUID,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    } catch (e) {
        if (!e.message.includes('already exists')) console.warn('product_batches:', e.message);
    }

    // ═══ FIXED ASSETS ═══
    try {
        await db.query(`
      CREATE TABLE IF NOT EXISTS fixed_assets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id UUID REFERENCES products(id),
        asset_name VARCHAR(255) NOT NULL,
        assigned_to UUID,
        assigned_at TIMESTAMP,
        condition VARCHAR(50) DEFAULT 'good',
        monthly_expense DECIMAL(15,2) DEFAULT 0,
        total_expenses DECIMAL(15,2) DEFAULT 0,
        status VARCHAR(30) DEFAULT 'active',
        notes TEXT,
        created_by UUID,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP
      )
    `);
    } catch (e) {
        if (!e.message.includes('already exists')) console.warn('fixed_assets:', e.message);
    }

    console.log('✅ Phase 5 migration complete');
};

exports.down = async function (db) {
    console.log('Phase 5 migration down — no-op');
};

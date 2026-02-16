/**
 * Phase 4 Migration — Invoice type columns + pricing enhancements
 */
exports.up = async function (db) {
    // Invoice columns for consumed/damaged/quote types
    const invoiceColumns = [
        { name: 'deduct_from_capital', type: 'BOOLEAN DEFAULT TRUE' },
        { name: 'consumed_by', type: 'UUID' },
        { name: 'consumed_reason', type: 'TEXT' },
        { name: 'damage_reason', type: 'TEXT' },
        { name: 'damage_type', type: "VARCHAR(30) DEFAULT 'full'" },
        { name: 'responsible_employee_id', type: 'UUID' },
        { name: 'charge_employee', type: 'BOOLEAN DEFAULT FALSE' },
        { name: 'valid_until', type: 'DATE' },
        { name: 'converted_from_quote', type: 'UUID' },
    ];

    for (const col of invoiceColumns) {
        try {
            await db.query(`ALTER TABLE invoices ADD COLUMN ${col.name} ${col.type}`);
        } catch (e) {
            if (!e.message.includes('already exists')) console.warn(`invoices.${col.name}: ${e.message}`);
        }
    }

    // Product prices enhancements
    const priceColumns = [
        { name: 'min_qty', type: 'INT DEFAULT 0' },
        { name: 'max_discount', type: 'DECIMAL(5,2) DEFAULT 0' },
        { name: 'updated_at', type: 'TIMESTAMP' },
    ];

    for (const col of priceColumns) {
        try {
            await db.query(`ALTER TABLE product_prices ADD COLUMN ${col.name} ${col.type}`);
        } catch (e) {
            if (!e.message.includes('already exists')) console.warn(`product_prices.${col.name}: ${e.message}`);
        }
    }

    // User balance for employee charging
    try {
        await db.query('ALTER TABLE users ADD COLUMN balance DECIMAL(15,2) DEFAULT 0');
    } catch (e) {
        if (!e.message.includes('already exists')) console.warn('users.balance:', e.message);
    }

    console.log('✅ Phase 4 migration complete');
};

exports.down = async function (db) {
    console.log('Phase 4 migration down — no-op');
};

/**
 * Fix missing database columns (PostgreSQL)
 * Run: node backend/src/scripts/fix-missing-tables.js
 */
const { initDatabase, getDatabase, run, get } = require('../config/database');

async function tableExists(tableName) {
    const row = await get(
        `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1`,
        [tableName]
    );
    return !!row;
}

async function columnExists(tableName, columnName) {
    const row = await get(
        `SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2`,
        [tableName, columnName]
    );
    return !!row;
}

async function fixDatabase() {
    console.log('=== Fixing missing columns (PostgreSQL) ===\n');
    await initDatabase();
    let fixed = 0;
    let skipped = 0;

    const columns = [
        { table: 'invoices', column: 'payment_status', sql: `ALTER TABLE invoices ADD COLUMN payment_status TEXT DEFAULT 'pending'` },
        { table: 'invoices', column: 'payment_method', sql: `ALTER TABLE invoices ADD COLUMN payment_method TEXT` },
        { table: 'invoices', column: 'notes', sql: `ALTER TABLE invoices ADD COLUMN  notes TEXT` },
        { table: 'invoices', column: 'discount_percent', sql: `ALTER TABLE invoices ADD COLUMN  discount_percent DOUBLE PRECISION DEFAULT 0` },
        { table: 'invoices', column: 'shipping_cost', sql: `ALTER TABLE invoices ADD COLUMN  shipping_cost DOUBLE PRECISION DEFAULT 0` },
        { table: 'invoices', column: 'sub_type', sql: `ALTER TABLE invoices ADD COLUMN  sub_type TEXT` },
        { table: 'invoices', column: 'paid_amount', sql: `ALTER TABLE invoices ADD COLUMN  paid_amount DOUBLE PRECISION DEFAULT 0` },
        { table: 'invoices', column: 'remaining_amount', sql: `ALTER TABLE invoices ADD COLUMN  remaining_amount DOUBLE PRECISION DEFAULT 0` },
        { table: 'notifications', column: 'recipient_id', sql: `ALTER TABLE notifications ADD COLUMN  recipient_id TEXT` },
        { table: 'notifications', column: 'recipient_type', sql: `ALTER TABLE notifications ADD COLUMN  recipient_type TEXT DEFAULT 'user'` },
        { table: 'notifications', column: 'priority', sql: `ALTER TABLE notifications ADD COLUMN  priority TEXT DEFAULT 'normal'` },
        { table: 'notifications', column: 'action_url', sql: `ALTER TABLE notifications ADD COLUMN  action_url TEXT` },
        { table: 'notifications', column: 'data', sql: `ALTER TABLE notifications ADD COLUMN  data TEXT` },
        { table: 'users', column: 'department_id', sql: `ALTER TABLE users ADD COLUMN  department_id TEXT` },
        { table: 'users', column: 'position_id', sql: `ALTER TABLE users ADD COLUMN  position_id TEXT` },
        { table: 'users', column: 'employee_code', sql: `ALTER TABLE users ADD COLUMN  employee_code TEXT` },
        { table: 'users', column: 'total_points', sql: `ALTER TABLE users ADD COLUMN  total_points INTEGER DEFAULT 0` },
        { table: 'users', column: 'monthly_points', sql: `ALTER TABLE users ADD COLUMN  monthly_points INTEGER DEFAULT 0` },
        { table: 'users', column: 'current_level', sql: `ALTER TABLE users ADD COLUMN  current_level INTEGER DEFAULT 1` },
        { table: 'users', column: 'avatar_url', sql: `ALTER TABLE users ADD COLUMN  avatar_url TEXT` },
        { table: 'users', column: 'hire_date', sql: `ALTER TABLE users ADD COLUMN  hire_date TEXT` },
        { table: 'users', column: 'salary_encrypted', sql: `ALTER TABLE users ADD COLUMN  salary_encrypted TEXT` },
        { table: 'approvals', column: 'requester_name', sql: `ALTER TABLE approvals ADD COLUMN  requester_name TEXT` },
        { table: 'invoice_items', column: 'product_name', sql: `ALTER TABLE invoice_items ADD COLUMN  product_name TEXT` },
        { table: 'invoice_items', column: 'serial_number', sql: `ALTER TABLE invoice_items ADD COLUMN  serial_number TEXT` },
        { table: 'invoice_items', column: 'cost_price', sql: `ALTER TABLE invoice_items ADD COLUMN  cost_price DOUBLE PRECISION DEFAULT 0` },
        { table: 'invoice_items', column: 'discount', sql: `ALTER TABLE invoice_items ADD COLUMN  discount DOUBLE PRECISION DEFAULT 0` },
        { table: 'invoice_items', column: 'notes', sql: `ALTER TABLE invoice_items ADD COLUMN  notes TEXT` },
        { table: 'deliveries', column: 'customer_name', sql: `ALTER TABLE deliveries ADD COLUMN  customer_name TEXT` },
        { table: 'deliveries', column: 'delivered_date', sql: `ALTER TABLE deliveries ADD COLUMN  delivered_date TEXT` },
        { table: 'deliveries', column: 'driver_id', sql: `ALTER TABLE deliveries ADD COLUMN  driver_id TEXT` },
    ];

    for (const c of columns) {
        const tblExists = await tableExists(c.table);
        const colExists = await columnExists(c.table, c.column);
        if (tblExists && !colExists) {
            try {
                await run(c.sql);
                console.log(`  + Added column: ${c.table}.${c.column}`);
                fixed++;
            } catch (e) {
                if (!e.message.includes('already exists')) skipped++;
            }
        } else {
            skipped++;
        }
    }

    const countRow = await get(`SELECT count(*) as c FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`);
    console.log(`\n=== Done: ${fixed} fixes applied, ${skipped} skipped ===`);
    console.log(`=== Total tables: ${countRow?.c ?? 0} ===`);
}

fixDatabase().then(() => process.exit(0)).catch((e) => {
    console.error(e);
    process.exit(1);
});

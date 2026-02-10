/**
 * Fix missing database tables and columns
 * Run on server: node backend/src/scripts/fix-missing-tables.js
 */
const { initDatabase, getDatabase, saveDatabase } = require('../config/database');

async function fixDatabase() {
  console.log('=== Fixing missing tables and columns ===\n');
  await initDatabase();
  const db = getDatabase();

  // Helper: check if column exists
  function columnExists(table, column) {
    try {
      const stmt = db.prepare(`PRAGMA table_info(${table})`);
      while (stmt.step()) {
        if (stmt.getAsObject().name === column) { stmt.free(); return true; }
      }
      stmt.free();
    } catch (e) {}
    return false;
  }

  // Helper: check if table exists
  function tableExists(table) {
    try {
      const stmt = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`);
      stmt.bind([table]);
      const exists = stmt.step();
      stmt.free();
      return exists;
    } catch (e) { return false; }
  }

  let fixed = 0, skipped = 0;

  // ===== MISSING TABLES =====
  const tables = [
    { name: 'departments', sql: `CREATE TABLE IF NOT EXISTS departments (id TEXT PRIMARY KEY, name TEXT NOT NULL, name_en TEXT, description TEXT, manager_id TEXT, parent_id TEXT, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')))` },
    { name: 'positions', sql: `CREATE TABLE IF NOT EXISTS positions (id TEXT PRIMARY KEY, name TEXT NOT NULL)` },
    { name: 'suppliers', sql: `CREATE TABLE IF NOT EXISTS suppliers (id TEXT PRIMARY KEY, code TEXT, name TEXT NOT NULL, name_ar TEXT, type TEXT DEFAULT 'company', contact_person TEXT, phone TEXT, phone2 TEXT, email TEXT, website TEXT, address TEXT, city TEXT, country TEXT, notes TEXT, rating REAL DEFAULT 0, total_purchases REAL DEFAULT 0, balance REAL DEFAULT 0, pending_returns INTEGER DEFAULT 0, is_active INTEGER DEFAULT 1, is_deleted INTEGER DEFAULT 0, deleted_at TEXT, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')))` },
    { name: 'categories', sql: `CREATE TABLE IF NOT EXISTS categories (id TEXT PRIMARY KEY, name TEXT, name_ar TEXT)` },
    { name: 'warehouses', sql: `CREATE TABLE IF NOT EXISTS warehouses (id TEXT PRIMARY KEY, code TEXT, name TEXT NOT NULL, type TEXT DEFAULT 'main', created_at TEXT DEFAULT (datetime('now')))` },
    { name: 'devices', sql: `CREATE TABLE IF NOT EXISTS devices (id TEXT PRIMARY KEY, serial_number TEXT, product_id TEXT, product_name TEXT, brand TEXT, model TEXT, processor TEXT, ram_size TEXT, storage_size TEXT, status TEXT DEFAULT 'new', warehouse_id TEXT DEFAULT 'main', location_shelf TEXT, location_row TEXT, custody_employee TEXT, purchase_cost REAL DEFAULT 0, supplier_id TEXT, is_deleted INTEGER DEFAULT 0, deleted_at TEXT, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')), created_by TEXT)` },
    { name: 'device_history', sql: `CREATE TABLE IF NOT EXISTS device_history (id TEXT PRIMARY KEY, device_id TEXT, event_type TEXT, event_details TEXT, performed_by TEXT, created_at TEXT DEFAULT (datetime('now')))` },
    { name: 'invoice_expenses', sql: `CREATE TABLE IF NOT EXISTS invoice_expenses (id TEXT PRIMARY KEY, invoice_id TEXT NOT NULL, expense_type TEXT, amount REAL DEFAULT 0, currency TEXT DEFAULT 'IQD', notes TEXT, created_at TEXT DEFAULT (datetime('now')))` },
    { name: 'invoice_workflow_log', sql: `CREATE TABLE IF NOT EXISTS invoice_workflow_log (id TEXT PRIMARY KEY, invoice_id TEXT NOT NULL, event TEXT, user_id TEXT, role TEXT, notes TEXT, created_at TEXT DEFAULT (datetime('now')))` },
    { name: 'pending_invoice_reminders', sql: `CREATE TABLE IF NOT EXISTS pending_invoice_reminders (id TEXT PRIMARY KEY, invoice_id TEXT NOT NULL, remind_at TEXT, remind_count INTEGER DEFAULT 0, notify_creator INTEGER DEFAULT 1, notify_supervisor INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now')))` },
    { name: 'invoice_payments', sql: `CREATE TABLE IF NOT EXISTS invoice_payments (id TEXT PRIMARY KEY, invoice_id TEXT NOT NULL, amount REAL DEFAULT 0, payment_method TEXT, notes TEXT, received_by TEXT, received_at TEXT DEFAULT (datetime('now')))` },
    { name: 'cash_registers', sql: `CREATE TABLE IF NOT EXISTS cash_registers (id TEXT PRIMARY KEY, name TEXT NOT NULL, balance REAL DEFAULT 0, responsible_user_id TEXT, is_active INTEGER DEFAULT 1)` },
    { name: 'cash_transactions', sql: `CREATE TABLE IF NOT EXISTS cash_transactions (id TEXT PRIMARY KEY, cash_register_id TEXT NOT NULL, type TEXT DEFAULT 'in', amount REAL DEFAULT 0, description TEXT, reference_type TEXT, reference_id TEXT, created_by TEXT, created_at TEXT DEFAULT (datetime('now')))` },
    { name: 'journal_entries', sql: `CREATE TABLE IF NOT EXISTS journal_entries (id TEXT PRIMARY KEY, entry_number TEXT, entry_date TEXT, description TEXT, total_debit REAL DEFAULT 0, total_credit REAL DEFAULT 0, status TEXT DEFAULT 'draft', created_by TEXT, created_at TEXT DEFAULT (datetime('now')))` },
    { name: 'journal_entry_lines', sql: `CREATE TABLE IF NOT EXISTS journal_entry_lines (id TEXT PRIMARY KEY, journal_entry_id TEXT NOT NULL, account_id TEXT, debit REAL DEFAULT 0, credit REAL DEFAULT 0, description TEXT)` },
    { name: 'accounts', sql: `CREATE TABLE IF NOT EXISTS accounts (id TEXT PRIMARY KEY, name TEXT NOT NULL, type TEXT DEFAULT 'asset')` },
    { name: 'vacations', sql: `CREATE TABLE IF NOT EXISTS vacations (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, type TEXT DEFAULT 'annual', start_date TEXT, end_date TEXT, reason TEXT, status TEXT DEFAULT 'pending', approved_by TEXT, created_at TEXT DEFAULT (datetime('now')))` },
    { name: 'task_templates', sql: `CREATE TABLE IF NOT EXISTS task_templates (id TEXT PRIMARY KEY, user_id TEXT, title TEXT, description TEXT, priority TEXT DEFAULT 'medium', estimated_minutes INTEGER, recurrence TEXT, day_of_week TEXT, day_of_month TEXT, is_active INTEGER DEFAULT 1)` },
    { name: 'security_events', sql: `CREATE TABLE IF NOT EXISTS security_events (id TEXT PRIMARY KEY, event_type TEXT, severity TEXT DEFAULT 'low', user_id TEXT, details TEXT, resolved INTEGER DEFAULT 0, resolved_by TEXT, resolved_at TEXT, created_at TEXT DEFAULT (datetime('now')))` },
    { name: 'alert_rules', sql: `CREATE TABLE IF NOT EXISTS alert_rules (id TEXT PRIMARY KEY, code TEXT, name TEXT, description TEXT, is_enabled INTEGER DEFAULT 1, threshold TEXT, created_at TEXT DEFAULT (datetime('now')))` },
    { name: 'training_plans', sql: `CREATE TABLE IF NOT EXISTS training_plans (id TEXT PRIMARY KEY, position_id TEXT, name TEXT NOT NULL, description TEXT, duration_days INTEGER DEFAULT 30, tasks TEXT, is_active INTEGER DEFAULT 1, created_at TEXT DEFAULT (datetime('now')))` },
    { name: 'employee_training', sql: `CREATE TABLE IF NOT EXISTS employee_training (id TEXT PRIMARY KEY, employee_id TEXT NOT NULL, plan_id TEXT, started_at TEXT, progress INTEGER DEFAULT 0, current_day INTEGER DEFAULT 1, status TEXT DEFAULT 'active', completed_at TEXT)` },
    { name: 'training_progress', sql: `CREATE TABLE IF NOT EXISTS training_progress (id TEXT PRIMARY KEY, training_id TEXT NOT NULL, task_index INTEGER, completed INTEGER DEFAULT 0, completed_at TEXT, score REAL, notes TEXT)` },
    { name: 'bot_logs', sql: `CREATE TABLE IF NOT EXISTS bot_logs (id TEXT PRIMARY KEY, action TEXT, data TEXT, created_at TEXT DEFAULT (datetime('now')))` },
    { name: 'bot_suggestions', sql: `CREATE TABLE IF NOT EXISTS bot_suggestions (id TEXT PRIMARY KEY, type TEXT, target TEXT, suggestion TEXT, priority TEXT DEFAULT 'medium', created_at TEXT DEFAULT (datetime('now')))` },
    { name: 'bot_fixes', sql: `CREATE TABLE IF NOT EXISTS bot_fixes (id TEXT PRIMARY KEY, type TEXT, target TEXT, fix_sql TEXT, status TEXT DEFAULT 'pending', created_at TEXT DEFAULT (datetime('now')))` },
    { name: 'deliveries', sql: `CREATE TABLE IF NOT EXISTS deliveries (id TEXT PRIMARY KEY, tracking_number TEXT, invoice_id TEXT, customer_id TEXT, customer_name TEXT, address TEXT, notes TEXT, scheduled_date TEXT, delivered_date TEXT, status TEXT DEFAULT 'pending', driver_id TEXT, created_by TEXT, created_at TEXT DEFAULT (datetime('now')))` },
    { name: 'backups', sql: `CREATE TABLE IF NOT EXISTS backups (id TEXT PRIMARY KEY, filename TEXT, file_path TEXT, file_size INTEGER, description TEXT, created_at TEXT DEFAULT (datetime('now')))` },
    { name: 'device_tokens', sql: `CREATE TABLE IF NOT EXISTS device_tokens (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, token TEXT NOT NULL, device_type TEXT)` },
  ];

  for (const t of tables) {
    if (!tableExists(t.name)) {
      try { db.run(t.sql); console.log(`  + Created table: ${t.name}`); fixed++; }
      catch (e) { console.log(`  ~ Error creating ${t.name}: ${e.message.substring(0, 60)}`); skipped++; }
    } else { skipped++; }
  }

  // ===== MISSING COLUMNS =====
  const columns = [
    // invoices
    { table: 'invoices', column: 'payment_status', sql: `ALTER TABLE invoices ADD COLUMN payment_status TEXT DEFAULT 'pending'` },
    { table: 'invoices', column: 'payment_method', sql: `ALTER TABLE invoices ADD COLUMN payment_method TEXT` },
    { table: 'invoices', column: 'notes', sql: `ALTER TABLE invoices ADD COLUMN notes TEXT` },
    { table: 'invoices', column: 'discount_percent', sql: `ALTER TABLE invoices ADD COLUMN discount_percent REAL DEFAULT 0` },
    { table: 'invoices', column: 'shipping_cost', sql: `ALTER TABLE invoices ADD COLUMN shipping_cost REAL DEFAULT 0` },
    { table: 'invoices', column: 'sub_type', sql: `ALTER TABLE invoices ADD COLUMN sub_type TEXT` },
    { table: 'invoices', column: 'paid_amount', sql: `ALTER TABLE invoices ADD COLUMN paid_amount REAL DEFAULT 0` },
    { table: 'invoices', column: 'remaining_amount', sql: `ALTER TABLE invoices ADD COLUMN remaining_amount REAL DEFAULT 0` },
    // notifications
    { table: 'notifications', column: 'recipient_id', sql: `ALTER TABLE notifications ADD COLUMN recipient_id TEXT` },
    { table: 'notifications', column: 'recipient_type', sql: `ALTER TABLE notifications ADD COLUMN recipient_type TEXT DEFAULT 'user'` },
    { table: 'notifications', column: 'priority', sql: `ALTER TABLE notifications ADD COLUMN priority TEXT DEFAULT 'normal'` },
    { table: 'notifications', column: 'action_url', sql: `ALTER TABLE notifications ADD COLUMN action_url TEXT` },
    { table: 'notifications', column: 'data', sql: `ALTER TABLE notifications ADD COLUMN data TEXT` },
    // users
    { table: 'users', column: 'department_id', sql: `ALTER TABLE users ADD COLUMN department_id TEXT` },
    { table: 'users', column: 'position_id', sql: `ALTER TABLE users ADD COLUMN position_id TEXT` },
    { table: 'users', column: 'employee_code', sql: `ALTER TABLE users ADD COLUMN employee_code TEXT` },
    { table: 'users', column: 'total_points', sql: `ALTER TABLE users ADD COLUMN total_points INTEGER DEFAULT 0` },
    { table: 'users', column: 'monthly_points', sql: `ALTER TABLE users ADD COLUMN monthly_points INTEGER DEFAULT 0` },
    { table: 'users', column: 'current_level', sql: `ALTER TABLE users ADD COLUMN current_level INTEGER DEFAULT 1` },
    { table: 'users', column: 'avatar_url', sql: `ALTER TABLE users ADD COLUMN avatar_url TEXT` },
    { table: 'users', column: 'hire_date', sql: `ALTER TABLE users ADD COLUMN hire_date TEXT` },
    { table: 'users', column: 'salary_encrypted', sql: `ALTER TABLE users ADD COLUMN salary_encrypted TEXT` },
    // approvals
    { table: 'approvals', column: 'requester_name', sql: `ALTER TABLE approvals ADD COLUMN requester_name TEXT` },
    // invoice_items
    { table: 'invoice_items', column: 'product_name', sql: `ALTER TABLE invoice_items ADD COLUMN product_name TEXT` },
    { table: 'invoice_items', column: 'serial_number', sql: `ALTER TABLE invoice_items ADD COLUMN serial_number TEXT` },
    { table: 'invoice_items', column: 'cost_price', sql: `ALTER TABLE invoice_items ADD COLUMN cost_price REAL DEFAULT 0` },
    { table: 'invoice_items', column: 'discount', sql: `ALTER TABLE invoice_items ADD COLUMN discount REAL DEFAULT 0` },
    { table: 'invoice_items', column: 'notes', sql: `ALTER TABLE invoice_items ADD COLUMN notes TEXT` },
    // deliveries
    { table: 'deliveries', column: 'customer_name', sql: `ALTER TABLE deliveries ADD COLUMN customer_name TEXT` },
    { table: 'deliveries', column: 'delivered_date', sql: `ALTER TABLE deliveries ADD COLUMN delivered_date TEXT` },
    { table: 'deliveries', column: 'driver_id', sql: `ALTER TABLE deliveries ADD COLUMN driver_id TEXT` },
  ];

  for (const c of columns) {
    if (tableExists(c.table) && !columnExists(c.table, c.column)) {
      try { db.run(c.sql); console.log(`  + Added column: ${c.table}.${c.column}`); fixed++; }
      catch (e) { skipped++; }
    } else { skipped++; }
  }

  // ===== DEFAULT DATA =====
  const seeds = [
    `INSERT OR IGNORE INTO warehouses (id, code, name, type) VALUES ('main', 'WH-MAIN', 'المخزن الرئيسي', 'main')`,
    `INSERT OR IGNORE INTO warehouses (id, code, name, type) VALUES ('inspection', 'WH-INSP', 'مخزن الفحص', 'inspection')`,
    `INSERT OR IGNORE INTO warehouses (id, code, name, type) VALUES ('preparation', 'WH-PREP', 'مخزن التجهيز', 'preparation')`,
    `INSERT OR IGNORE INTO warehouses (id, code, name, type) VALUES ('inspection', 'WH-INS', 'مخزن الفحص', 'inspection')`,
    `INSERT OR IGNORE INTO warehouses (id, code, name, type) VALUES ('preparation', 'WH-PRP', 'مخزن التجهيز', 'preparation')`,
    `INSERT OR IGNORE INTO warehouses (id, code, name, type) VALUES ('repair', 'WH-REP', 'مخزن صيانة داخلي', 'repair_internal')`,
    `INSERT OR IGNORE INTO warehouses (id, code, name, type) VALUES ('repair_ext', 'WH-RXE', 'مخزن صيانة خارجي', 'repair_external')`,
    `INSERT OR IGNORE INTO warehouses (id, code, name, type) VALUES ('supplier_repair', 'WH-SRP', 'مخزن صيانة المورد', 'supplier_repair')`,
    `INSERT OR IGNORE INTO warehouses (id, code, name, type) VALUES ('returns', 'WH-RET', 'مخزن المرتجعات', 'returns')`,
    `INSERT OR IGNORE INTO warehouses (id, code, name, type) VALUES ('defective', 'WH-DEF', 'مخزن التالف/المشطوب', 'defective')`,
    `INSERT OR IGNORE INTO warehouses (id, code, name, type) VALUES ('accessories', 'WH-ACC', 'مخزن الإكسسوارات', 'accessories')`,
    `INSERT OR IGNORE INTO warehouses (id, code, name, type) VALUES ('customer_repair', 'WH-CRP', 'مخزن صيانة الزبائن', 'customer_repair')`,
    `INSERT OR IGNORE INTO cash_registers (id, name, balance, is_active) VALUES ('main', 'الصندوق الرئيسي', 0, 1)`,
    `INSERT OR IGNORE INTO settings (key, value) VALUES ('company_name', 'BI Management')`,
    `INSERT OR IGNORE INTO settings (key, value) VALUES ('currency', 'IQD')`,
    `INSERT OR IGNORE INTO settings (key, value) VALUES ('work_start_time', '08:00')`,
    `INSERT OR IGNORE INTO settings (key, value) VALUES ('work_end_time', '16:00')`,
    `INSERT OR IGNORE INTO settings (key, value) VALUES ('late_threshold_minutes', '15')`,
  ];

  for (const sql of seeds) {
    try { db.run(sql); } catch (e) {}
  }

  saveDatabase();

  // Summary
  const tablesStmt = db.prepare(`SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`);
  tablesStmt.step();
  const totalTables = tablesStmt.getAsObject().count;
  tablesStmt.free();

  console.log(`\n=== Done: ${fixed} fixes applied, ${skipped} already OK ===`);
  console.log(`=== Total tables in database: ${totalTables} ===`);
}

fixDatabase().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });

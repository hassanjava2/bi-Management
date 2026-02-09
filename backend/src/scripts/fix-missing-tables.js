/**
 * Fix missing database tables and columns
 * Run: node backend/src/scripts/fix-missing-tables.js
 */
const { initDatabase, getDatabase, saveDatabase } = require('../config/database');

async function fixDatabase() {
  console.log('=== Fixing missing tables and columns ===\n');
  await initDatabase();
  const db = getDatabase();

  const fixes = [
    // Missing table: departments
    `CREATE TABLE IF NOT EXISTS departments (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      manager_id TEXT,
      parent_id TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )`,

    // Missing column: payment_status on invoices
    `ALTER TABLE invoices ADD COLUMN payment_status TEXT DEFAULT 'pending'`,

    // Missing column: recipient_id on notifications  
    `ALTER TABLE notifications ADD COLUMN recipient_id TEXT`,

    // Missing table: suppliers (if not exists)
    `CREATE TABLE IF NOT EXISTS suppliers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      contact_person TEXT,
      type TEXT DEFAULT 'company',
      phone TEXT,
      phone2 TEXT,
      email TEXT,
      address TEXT,
      notes TEXT,
      rating REAL DEFAULT 0,
      total_purchases REAL DEFAULT 0,
      balance REAL DEFAULT 0,
      pending_returns INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )`,
  ];

  let fixed = 0;
  let skipped = 0;

  for (const sql of fixes) {
    try {
      db.run(sql);
      const action = sql.includes('CREATE TABLE') ? 'Created table' : 'Added column';
      const match = sql.match(/(?:CREATE TABLE IF NOT EXISTS|ALTER TABLE)\s+(\w+)/i);
      console.log(`  + ${action}: ${match?.[1] || 'unknown'}`);
      fixed++;
    } catch (e) {
      if (e.message.includes('already exists') || e.message.includes('duplicate column')) {
        skipped++;
      } else {
        console.log(`  ~ Skipped: ${e.message.substring(0, 80)}`);
        skipped++;
      }
    }
  }

  saveDatabase();
  console.log(`\n=== Done: ${fixed} fixed, ${skipped} skipped ===`);
}

fixDatabase().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });

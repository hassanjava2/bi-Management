/**
 * BI ERP - Migration runner (run from backend: npm run db:migrate)
 */

require('dotenv').config();
const path = require('path');
const fs = require('fs');

async function run() {
  const { initDatabase, getDatabase, all } = require('../src/config/database');

  await initDatabase();
  const pool = getDatabase();

  const migrationsDir = path.join(__dirname, 'migrations');
  if (!fs.existsSync(migrationsDir)) {
    console.log('[migrate] No migrations folder');
    return;
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) UNIQUE NOT NULL,
      batch INTEGER NOT NULL,
      run_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const done = await all('SELECT name FROM migrations');
  const doneSet = new Set((done || []).map((r) => r.name));

  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.js')).sort();
  const maxBatch = await pool.query('SELECT COALESCE(MAX(batch), 0) as b FROM migrations');
  let batch = parseInt(maxBatch.rows[0]?.b || 0, 10);

  for (const file of files) {
    const name = file.replace(/\.js$/, '');
    if (doneSet.has(name)) continue;

    const mod = require(path.join(migrationsDir, file));
    if (typeof mod.up !== 'function') continue;

    process.stdout.write(`  Running ${name}... `);
    try {
      await mod.up(pool);
      await pool.query('INSERT INTO migrations (name, batch) VALUES ($1, $2)', [name, batch + 1]);
      console.log('OK');
    } catch (e) {
      console.error('FAIL:', e.message);
      throw e;
    }
  }

  console.log('[migrate] Done.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

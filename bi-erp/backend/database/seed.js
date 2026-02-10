/**
 * BI ERP - Seed runner (run from backend: npm run db:seed)
 */

require('dotenv').config();
const path = require('path');
const fs = require('fs');

async function run() {
  const { initDatabase, getDatabase } = require('../src/config/database');

  await initDatabase();
  const pool = getDatabase();

  const seedsDir = path.join(__dirname, 'seeds');
  if (!fs.existsSync(seedsDir)) {
    console.log('[seed] No seeds folder');
    return;
  }

  const files = fs.readdirSync(seedsDir).filter((f) => f.endsWith('.js')).sort();

  for (const file of files) {
    const name = file.replace(/\.js$/, '');
    process.stdout.write(`  Seed ${name}... `);
    const mod = require(path.join(seedsDir, file));
    if (typeof mod.run !== 'function') {
      console.log('skip (no run)');
      continue;
    }
    try {
      await mod.run(pool);
      console.log('OK');
    } catch (e) {
      console.error('FAIL:', e.message);
      throw e;
    }
  }

  console.log('[seed] Done.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

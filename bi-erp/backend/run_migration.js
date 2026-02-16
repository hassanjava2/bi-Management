require('dotenv').config({ path: __dirname + '/.env' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const migration = require('./database/migrations/20260216000001_hr_tables');

migration.up(pool)
    .then(() => { console.log('MIGRATION SUCCESS'); pool.end(); })
    .catch(e => { console.error('MIGRATION FAILED:', e.message); pool.end(); process.exit(1); });

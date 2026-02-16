const { AsyncLocalStorage } = require('async_hooks');
const logger = require('../utils/logger');

let pgPool = null;
const pgClientStorage = new AsyncLocalStorage();

function toPgPlaceholders(sql) {
  let i = 0;
  return sql.replace(/\?/g, function () { return '$' + (++i); });
}

async function initDatabase() {
  if (pgPool) return pgPool;
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
  const { Pool } = require('pg');
  pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });
  pgPool.on('error', function (err) { logger.error('PG Pool error', { error: err.message }); });
  const client = await pgPool.connect();
  client.release();
  logger.info('Database: PostgreSQL connected');
  return pgPool;
}

function getDatabase() {
  if (!pgPool) throw new Error('Database not initialized. Call initDatabase() first.');
  return pgPool;
}

async function run(sql, params) {
  if (!params) params = [];
  const clientOrPool = pgClientStorage.getStore() || pgPool;
  const q = toPgPlaceholders(sql);
  const res = await clientOrPool.query(q, params);
  return { changes: res.rowCount ?? 0 };
}

async function get(sql, params) {
  if (!params) params = [];
  const clientOrPool = pgClientStorage.getStore() || pgPool;
  const q = toPgPlaceholders(sql);
  const res = await clientOrPool.query(q, params);
  return res.rows[0] ?? null;
}

async function all(sql, params) {
  if (!params) params = [];
  const clientOrPool = pgClientStorage.getStore() || pgPool;
  const q = toPgPlaceholders(sql);
  const res = await clientOrPool.query(q, params);
  return res.rows ?? [];
}

async function transaction(fn) {
  const client = await pgPool.connect();
  try {
    await client.query('BEGIN');
    const result = await pgClientStorage.run(client, fn);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { initDatabase, getDatabase, run, get, all, transaction, toPgPlaceholders };

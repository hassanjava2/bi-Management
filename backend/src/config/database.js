/**
 * BI Management - Database Configuration
 * PostgreSQL only — استخدم await مع run/get/all/transaction
 */

const { AsyncLocalStorage } = require('async_hooks');

let pgPool = null;
const pgClientStorage = new AsyncLocalStorage();

function toPgPlaceholders(sql) {
    let i = 0;
    return sql.replace(/\?/g, () => `$${++i}`);
}

async function initDatabase() {
    if (pgPool) return pgPool;
    if (!process.env.DATABASE_URL) {
        throw new Error('DATABASE_URL is required. Set it in .env (e.g. postgresql://user:password@localhost:5432/bi_management)');
    }
    const { Pool } = require('pg');
    pgPool = new Pool({
        connectionString: process.env.DATABASE_URL,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
    });
    pgPool.on('error', (err) => console.error('[PG] Pool error:', err.message));
    const client = await pgPool.connect();
    client.release();
    console.log('[+] Database: PostgreSQL connected');
    return pgPool;
}

function getDatabase() {
    if (!pgPool) throw new Error('Database not initialized. Call initDatabase() first.');
    return pgPool;
}

async function run(sql, params = []) {
    const clientOrPool = pgClientStorage.getStore() || pgPool;
    const q = toPgPlaceholders(sql);
    const res = await clientOrPool.query(q, params);
    return { changes: res.rowCount ?? 0 };
}

async function get(sql, params = []) {
    const clientOrPool = pgClientStorage.getStore() || pgPool;
    const q = toPgPlaceholders(sql);
    const res = await clientOrPool.query(q, params);
    return res.rows[0] ?? null;
}

async function all(sql, params = []) {
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

function saveDatabase() {
    // No-op: PostgreSQL persists automatically
}

module.exports = {
    initDatabase,
    getDatabase,
    saveDatabase,
    run,
    get,
    all,
    transaction,
    toPgPlaceholders,
};

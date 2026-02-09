/**
 * BI Management - Database Configuration
 * اتصال قاعدة البيانات SQLite (using sql.js)
 */

const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

// Database path
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../../..', 'data', 'bi_management.db');

// Database instance
let db = null;
let SQL = null;

// Initialize database
async function initDatabase() {
    if (db) return db;

    SQL = await initSqlJs();

    // Load existing database or create new one
    if (fs.existsSync(dbPath)) {
        const buffer = fs.readFileSync(dbPath);
        db = new SQL.Database(buffer);
        console.log('[+] Database loaded:', dbPath);
    } else {
        db = new SQL.Database();
        console.log('[+] New database created');
    }

    // Enable foreign keys
    db.run('PRAGMA foreign_keys = ON');

    return db;
}

// Save database to file
function saveDatabase() {
    if (!db) return;
    
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
}

// Auto-save every 30 seconds
setInterval(() => {
    if (db) saveDatabase();
}, 30000);

// Save on exit
process.on('exit', () => saveDatabase());
process.on('SIGINT', () => { saveDatabase(); process.exit(); });
process.on('SIGTERM', () => { saveDatabase(); process.exit(); });

// Get database instance
function getDatabase() {
    if (!db) {
        throw new Error('Database not initialized. Call initDatabase() first.');
    }
    return db;
}

// Helper functions
function run(sql, params = []) {
    const database = getDatabase();
    database.run(sql, params);
    saveDatabase();
    return { changes: database.getRowsModified() };
}

function get(sql, params = []) {
    const database = getDatabase();
    const stmt = database.prepare(sql);
    stmt.bind(params);
    
    if (stmt.step()) {
        const row = stmt.getAsObject();
        stmt.free();
        return row;
    }
    stmt.free();
    return null;
}

function all(sql, params = []) {
    const database = getDatabase();
    const stmt = database.prepare(sql);
    stmt.bind(params);
    
    const results = [];
    while (stmt.step()) {
        results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
}

function transaction(fn) {
    const database = getDatabase();
    database.run('BEGIN TRANSACTION');
    try {
        const result = fn();
        database.run('COMMIT');
        saveDatabase();
        return result;
    } catch (error) {
        database.run('ROLLBACK');
        throw error;
    }
}

module.exports = {
    initDatabase,
    getDatabase,
    saveDatabase,
    run,
    get,
    all,
    transaction
};

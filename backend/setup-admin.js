/**
 * Setup Admin User Script
 * سكربت إنشاء حساب المدير
 */

require('dotenv').config();

const bcrypt = require('bcryptjs');
const { initDatabase, run, get, saveDatabase } = require('./src/config/database');
const { generateId, now } = require('./src/utils/helpers');

async function setupAdmin() {
    console.log('Starting admin setup...');
    
    // Initialize database
    await initDatabase();
    console.log('[+] Database initialized');

    // Check if admin exists
    const existing = get(`SELECT id FROM users WHERE username = ? OR email = ?`, ['admin', 'admin@bi-company.com']);
    
    if (existing) {
        console.log('[!] Admin user already exists');
        console.log('Username: admin');
        console.log('Email: admin@bi-company.com');
        console.log('Use your existing password or reset it');
        process.exit(0);
    }

    // Hash password
    const password = 'Admin@123';
    const passwordHash = await bcrypt.hash(password, 12);
    
    // Create admin user (matching schema_v3_sqlite.sql)
    const userId = generateId();
    
    run(`
        INSERT INTO users (
            id, username, email, password_hash,
            full_name, phone, role,
            security_level, is_active,
            created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
        userId,
        'admin',
        'admin@bi-company.com',
        passwordHash,
        'مدير النظام',
        '07700000000',
        'owner',
        5,  // highest security level
        1,
        now(),
        now()
    ]);

    saveDatabase();
    
    console.log('='.repeat(50));
    console.log('[+] Admin user created successfully!');
    console.log('='.repeat(50));
    console.log('');
    console.log('Username: admin');
    console.log('Email:    admin@bi-company.com');
    console.log('Password: Admin@123');
    console.log('');
    console.log('='.repeat(50));
    
    process.exit(0);
}

setupAdmin().catch(err => {
    console.error('[!] Error:', err);
    process.exit(1);
});

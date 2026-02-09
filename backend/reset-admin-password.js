/**
 * Reset Admin Password Script
 * سكربت إعادة تعيين كلمة مرور المدير
 */

require('dotenv').config();

const bcrypt = require('bcryptjs');
const { initDatabase, run, get, saveDatabase } = require('./src/config/database');

async function resetPassword() {
    console.log('Resetting admin password...');
    
    // Initialize database
    await initDatabase();
    
    // New password
    const newPassword = 'Admin@123';
    const passwordHash = await bcrypt.hash(newPassword, 12);
    
    // Update password
    run(`UPDATE users SET password_hash = ? WHERE email = ?`, [passwordHash, 'admin@bi-company.com']);
    
    saveDatabase();
    
    console.log('='.repeat(50));
    console.log('[+] Password reset successfully!');
    console.log('='.repeat(50));
    console.log('');
    console.log('Email:    admin@bi-company.com');
    console.log('Password: Admin@123');
    console.log('');
    console.log('='.repeat(50));
    
    process.exit(0);
}

resetPassword().catch(err => {
    console.error('[!] Error:', err);
    process.exit(1);
});

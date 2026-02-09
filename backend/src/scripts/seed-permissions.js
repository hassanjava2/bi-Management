/**
 * BI Management - Seed Permissions Script
 * سكربت إضافة الصلاحيات
 */

const { initDatabase, getDatabase, saveDatabase } = require('../config/database');
const fs = require('fs');
const path = require('path');

async function seedPermissions() {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  BI Management - Permissions Seeding');
    console.log('  إضافة الصلاحيات');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    try {
        await initDatabase();
        const db = getDatabase();
        
        // 1. إنشاء جدول الصلاحيات
        console.log('[1/5] إنشاء جدول الصلاحيات...');
        db.run(`
            CREATE TABLE IF NOT EXISTS permissions (
                id TEXT PRIMARY KEY,
                code TEXT UNIQUE NOT NULL,
                name_ar TEXT NOT NULL,
                name_en TEXT,
                module TEXT NOT NULL,
                feature TEXT NOT NULL,
                action TEXT NOT NULL,
                description TEXT,
                is_sensitive INTEGER DEFAULT 0,
                requires_2fa INTEGER DEFAULT 0,
                requires_approval INTEGER DEFAULT 0,
                security_level INTEGER DEFAULT 1,
                sort_order INTEGER DEFAULT 0,
                created_at TEXT DEFAULT (datetime('now'))
            )
        `);
        console.log('    ✓ تم');

        // 2. إنشاء جدول الأدوار
        console.log('[2/5] إنشاء جدول الأدوار...');
        db.run(`
            CREATE TABLE IF NOT EXISTS roles (
                id TEXT PRIMARY KEY,
                name TEXT UNIQUE NOT NULL,
                name_ar TEXT,
                description TEXT,
                security_level INTEGER DEFAULT 1,
                is_system INTEGER DEFAULT 0,
                is_active INTEGER DEFAULT 1,
                color TEXT DEFAULT '#3B82F6',
                icon TEXT DEFAULT 'Shield',
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT DEFAULT (datetime('now'))
            )
        `);
        console.log('    ✓ تم');

        // 3. إنشاء جدول صلاحيات الأدوار
        console.log('[3/5] إنشاء جدول صلاحيات الأدوار...');
        db.run(`
            CREATE TABLE IF NOT EXISTS role_permissions (
                id TEXT PRIMARY KEY,
                role_id TEXT NOT NULL,
                permission_id TEXT NOT NULL,
                granted_at TEXT DEFAULT (datetime('now')),
                granted_by TEXT
            )
        `);
        // إنشاء الـ unique index منفصل
        try {
            db.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_role_perm ON role_permissions(role_id, permission_id)`);
        } catch (e) {}
        console.log('    ✓ تم');

        // 4. إنشاء جدول صلاحيات المستخدمين
        console.log('[4/5] إنشاء جدول صلاحيات المستخدمين...');
        db.run(`
            CREATE TABLE IF NOT EXISTS user_permissions (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                permission_id TEXT NOT NULL,
                is_granted INTEGER DEFAULT 1,
                granted_at TEXT DEFAULT (datetime('now')),
                granted_by TEXT,
                expires_at TEXT,
                reason TEXT
            )
        `);
        try {
            db.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_user_perm ON user_permissions(user_id, permission_id)`);
        } catch (e) {}
        console.log('    ✓ تم');

        // 5. إضافة البيانات
        console.log('[5/5] إضافة الصلاحيات والأدوار...');
        const seedPath = path.join(__dirname, '../../../database/seeds/permissions_seed.sql');
        
        if (fs.existsSync(seedPath)) {
            const seedContent = fs.readFileSync(seedPath, 'utf8');
            const statements = seedContent
                .split(';')
                .map(s => s.trim())
                .filter(s => s.length > 0 && !s.startsWith('--'));
            
            let inserted = 0;
            let errors = 0;
            
            for (const statement of statements) {
                try {
                    db.run(statement);
                    if (statement.includes('INSERT')) {
                        inserted++;
                    }
                } catch (e) {
                    if (!e.message.includes('UNIQUE constraint')) {
                        errors++;
                    }
                }
            }
            
            console.log(`    ✓ تم تنفيذ ${inserted} أمر INSERT`);
            if (errors > 0) {
                console.log(`    ⚠ ${errors} أخطاء (تم تجاهلها)`);
            }
        } else {
            console.log('    ⚠ ملف الـ Seed غير موجود!');
        }

        saveDatabase();

        // الإحصائيات النهائية
        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log('  الإحصائيات:');
        
        const permCount = db.prepare('SELECT COUNT(*) as count FROM permissions').getAsObject({}).count;
        console.log(`    • عدد الصلاحيات: ${permCount}`);
        
        const roleCount = db.prepare('SELECT COUNT(*) as count FROM roles').getAsObject({}).count;
        console.log(`    • عدد الأدوار: ${roleCount}`);
        
        try {
            const rpCount = db.prepare('SELECT COUNT(*) as count FROM role_permissions').getAsObject({}).count;
            console.log(`    • صلاحيات الأدوار: ${rpCount}`);
        } catch (e) {}
        
        console.log('═══════════════════════════════════════════════════════════════\n');
        
        return true;
    } catch (error) {
        console.error('❌ خطأ:', error.message);
        return false;
    }
}

// تشغيل مباشر
if (require.main === module) {
    seedPermissions().then(success => {
        process.exit(success ? 0 : 1);
    });
}

module.exports = { seedPermissions };

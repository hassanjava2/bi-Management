/**
 * BI Management - Database Initialization Script
 * سكربت تهيئة قاعدة البيانات
 */

const fs = require('fs');
const path = require('path');
const { initDatabase, getDatabase, saveDatabase } = require('../config/database');

async function initializeDatabase() {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  BI Management - Database Initialization');
    console.log('  تهيئة قاعدة البيانات');
    console.log('═══════════════════════════════════════════════════════════════');
    
    try {
        // 1. تهيئة الاتصال
        console.log('\n[1/4] جاري الاتصال بقاعدة البيانات...');
        await initDatabase();
        const db = getDatabase();
        console.log('    ✓ تم الاتصال بنجاح');

        // 2. تشغيل Schema
        console.log('\n[2/4] جاري إنشاء الجداول...');
        const schemaPath = path.join(__dirname, '../../../database/schema_v3_sqlite.sql');
        
        if (fs.existsSync(schemaPath)) {
            let schema = fs.readFileSync(schemaPath, 'utf8');
            
            // تعطيل Foreign Keys مؤقتاً للسماح بإنشاء الجداول بأي ترتيب
            db.run('PRAGMA foreign_keys = OFF');
            
            // إزالة التعليقات
            schema = schema
                .replace(/--[^\n]*/g, '')  // إزالة تعليقات السطر الواحد
                .replace(/\/\*[\s\S]*?\*\//g, '');  // إزالة التعليقات متعددة الأسطر
            
            // تقسيم الـ SQL إلى أوامر منفصلة
            const statements = schema
                .split(';')
                .map(s => s.trim())
                .filter(s => s.length > 0);
            
            let created = 0;
            let skipped = 0;
            let errors = 0;
            
            for (const statement of statements) {
                try {
                    // تخطي PRAGMA foreign_keys لأننا نديره يدوياً
                    if (statement.toLowerCase().includes('pragma foreign_keys')) {
                        continue;
                    }
                    
                    db.run(statement);
                    
                    if (statement.toUpperCase().includes('CREATE TABLE')) {
                        created++;
                    }
                } catch (e) {
                    if (e.message.includes('already exists')) {
                        skipped++;
                    } else if (e.message.includes('GENERATED ALWAYS')) {
                        // تجاهل خطأ GENERATED ALWAYS - غير مدعوم في sql.js
                    } else if (e.message.includes('no such table')) {
                        // تجاهل أخطاء الفهارس للجداول غير الموجودة
                        errors++;
                    } else {
                        console.warn(`    ⚠ ${e.message.substring(0, 60)}...`);
                        errors++;
                    }
                }
            }
            
            // إعادة تفعيل Foreign Keys
            db.run('PRAGMA foreign_keys = ON');
            
            console.log(`    ✓ تم إنشاء ${created} جدول جديد`);
            if (skipped > 0) {
                console.log(`    ℹ ${skipped} جدول موجود مسبقاً`);
            }
            if (errors > 0) {
                console.log(`    ⚠ ${errors} أخطاء (فهارس/قيود)`);
            }
        } else {
            console.log('    ⚠ ملف Schema غير موجود، يتم تخطي...');
        }
        
        // 2.5 تشغيل Schema الإضافي (tasks, etc.)
        const additionalSchemaPath = path.join(__dirname, '../../../database/schema_additional.sql');
        if (fs.existsSync(additionalSchemaPath)) {
            let additionalSchema = fs.readFileSync(additionalSchemaPath, 'utf8');
            
            db.run('PRAGMA foreign_keys = OFF');
            
            additionalSchema = additionalSchema
                .replace(/--[^\n]*/g, '')
                .replace(/\/\*[\s\S]*?\*\//g, '');
            
            const additionalStatements = additionalSchema
                .split(';')
                .map(s => s.trim())
                .filter(s => s.length > 0);
            
            let additionalCreated = 0;
            
            for (const statement of additionalStatements) {
                try {
                    if (statement.toLowerCase().includes('pragma foreign_keys')) {
                        continue;
                    }
                    db.run(statement);
                    if (statement.toUpperCase().includes('CREATE TABLE')) {
                        additionalCreated++;
                    }
                } catch (e) {
                    // Ignore already exists errors
                }
            }
            
            db.run('PRAGMA foreign_keys = ON');
            
            if (additionalCreated > 0) {
                console.log(`    ✓ تم إنشاء ${additionalCreated} جدول إضافي (tasks, etc.)`);
            }
        }

        // 3. تشغيل Seeds
        console.log('\n[3/4] جاري إضافة البيانات الأولية...');
        const seedsPath = path.join(__dirname, '../../../database/seeds');
        
        if (fs.existsSync(seedsPath)) {
            const seedFiles = fs.readdirSync(seedsPath).filter(f => f.endsWith('.sql'));
            
            for (const seedFile of seedFiles) {
                const seedContent = fs.readFileSync(path.join(seedsPath, seedFile), 'utf8');
                const statements = seedContent
                    .split(';')
                    .map(s => s.trim())
                    .filter(s => s.length > 0 && !s.startsWith('--'));
                
                let inserted = 0;
                for (const statement of statements) {
                    try {
                        db.run(statement);
                        if (statement.includes('INSERT')) {
                            inserted++;
                        }
                    } catch (e) {
                        // تجاهل أخطاء الـ UNIQUE constraint
                        if (!e.message.includes('UNIQUE constraint')) {
                            console.warn(`    ⚠ ${seedFile}: ${e.message.substring(0, 50)}...`);
                        }
                    }
                }
                console.log(`    ✓ ${seedFile}: ${inserted} سجل`);
            }
        } else {
            console.log('    ℹ مجلد Seeds غير موجود');
        }

        // 4. التحقق من البيانات
        console.log('\n[4/4] التحقق من البيانات...');
        
        // عدد الجداول
        const tablesStmt = db.prepare(`
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name NOT LIKE 'sqlite_%'
        `);
        const tables = [];
        while (tablesStmt.step()) {
            tables.push(tablesStmt.getAsObject().name);
        }
        tablesStmt.free();
        console.log(`    ✓ عدد الجداول: ${tables.length}`);

        // عدد الأدوار
        try {
            const rolesStmt = db.prepare('SELECT COUNT(*) as count FROM roles');
            rolesStmt.step();
            const rolesCount = rolesStmt.getAsObject().count;
            rolesStmt.free();
            console.log(`    ✓ عدد الأدوار: ${rolesCount}`);
        } catch (e) {
            console.log('    ℹ جدول الأدوار غير موجود بعد');
        }

        // عدد الصلاحيات
        try {
            const permsStmt = db.prepare('SELECT COUNT(*) as count FROM permissions');
            permsStmt.step();
            const permsCount = permsStmt.getAsObject().count;
            permsStmt.free();
            console.log(`    ✓ عدد الصلاحيات: ${permsCount}`);
        } catch (e) {
            console.log('    ℹ جدول الصلاحيات غير موجود بعد');
        }

        // عدد المستخدمين
        let usersCount = 0;
        try {
            const usersStmt = db.prepare('SELECT COUNT(*) as count FROM users');
            usersStmt.step();
            usersCount = usersStmt.getAsObject().count;
            usersStmt.free();
            console.log(`    ✓ عدد المستخدمين: ${usersCount}`);
        } catch (e) {
            console.log('    ℹ جدول المستخدمين غير موجود بعد');
        }

        // 5. إنشاء مستخدم admin إذا لم يوجد
        if (usersCount === 0) {
            console.log('\n[5/5] جاري إنشاء مستخدم المدير...');
            try {
                const bcrypt = require('bcryptjs');
                const { generateId, now } = require('../utils/helpers');
                
                const adminId = generateId();
                const passwordHash = bcrypt.hashSync('Admin@123', 12);
                
                db.run(`
                    INSERT INTO users (
                        id, username, email, password_hash,
                        full_name, phone, role,
                        security_level, is_active,
                        created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    adminId,
                    'admin',
                    'admin@bi-company.com',
                    passwordHash,
                    'مدير النظام',
                    '07700000000',
                    'owner',
                    5,
                    1,
                    now(),
                    now()
                ]);
                
                console.log('    ✓ تم إنشاء مستخدم المدير');
                console.log('    📧 Username: admin');
                console.log('    🔑 Password: Admin@123');
            } catch (e) {
                console.warn('    ⚠ تعذر إنشاء مستخدم المدير:', e.message);
            }
        }

        // 6. حفظ قاعدة البيانات
        saveDatabase();
        
        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log('  ✓ تم تهيئة قاعدة البيانات بنجاح!');
        console.log('═══════════════════════════════════════════════════════════════\n');
        
        return true;
    } catch (error) {
        console.error('\n❌ خطأ في تهيئة قاعدة البيانات:', error);
        return false;
    }
}

// تشغيل مباشر
if (require.main === module) {
    initializeDatabase().then(success => {
        process.exit(success ? 0 : 1);
    });
}

module.exports = { initializeDatabase };

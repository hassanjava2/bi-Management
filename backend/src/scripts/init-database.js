/**
 * BI Management - Database Initialization (PostgreSQL only)
 * سكربت تهيئة قاعدة البيانات
 */

const fs = require('fs');
const path = require('path');
const { initDatabase, getDatabase } = require('../config/database');

async function initializeDatabase() {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  BI Management - Database Initialization (PostgreSQL)');
    console.log('  تهيئة قاعدة البيانات');
    console.log('═══════════════════════════════════════════════════════════════');

    try {
        console.log('\n[1/4] جاري الاتصال بقاعدة البيانات...');
        await initDatabase();
        const pool = getDatabase();
        console.log('    ✓ تم الاتصال بنجاح');

        console.log('\n[2/4] جاري إنشاء الجداول...');
        const schemaPath = path.join(__dirname, '../../../database/schema_postgres.sql');
        if (!fs.existsSync(schemaPath)) {
            console.log('    ⚠ schema_postgres.sql غير موجود');
            return false;
        }
        let schema = fs.readFileSync(schemaPath, 'utf8');
        schema = schema.replace(/--[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
        const statements = schema.split(';').map(s => s.trim()).filter(s => s.length > 0);
        let created = 0;
        for (const statement of statements) {
            try {
                await pool.query(statement);
                if (statement.toUpperCase().includes('CREATE TABLE')) created++;
            } catch (e) {
                if (!e.message.includes('already exists')) {
                    console.warn(`    ⚠ ${e.message.substring(0, 60)}`);
                }
            }
        }
        console.log(`    ✓ تم إنشاء ${created} جدول`);

        console.log('\n[3/4] جاري إضافة البيانات الأولية...');
        const seedsPath = path.join(__dirname, '../../../database/seeds');
        if (fs.existsSync(seedsPath)) {
            const seedFiles = fs.readdirSync(seedsPath).filter(f => f.endsWith('.sql'));
            for (const seedFile of seedFiles) {
                const seedContent = fs.readFileSync(path.join(seedsPath, seedFile), 'utf8');
                const seedStatements = seedContent
                    .split(';')
                    .map(s => s.trim())
                    .filter(s => s.length > 0 && !s.startsWith('--'));
                let inserted = 0;
                for (const statement of seedStatements) {
                    try {
                        await pool.query(statement);
                        if (statement.toUpperCase().includes('INSERT')) inserted++;
                    } catch (e) {
                        if (!e.message.includes('unique') && !e.message.includes('duplicate')) {
                            console.warn(`    ⚠ ${seedFile}: ${e.message.substring(0, 50)}`);
                        }
                    }
                }
                console.log(`    ✓ ${seedFile}: ${inserted} سجل`);
            }
        } else {
            console.log('    ℹ مجلد Seeds غير موجود');
        }

        console.log('\n[4/4] التحقق من البيانات...');
        const tablesRes = await pool.query(`
            SELECT count(*) as c FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
        `);
        const rolesRes = await pool.query('SELECT count(*) as c FROM roles').catch(() => ({ rows: [{ c: 0 }] }));
        const permsRes = await pool.query('SELECT count(*) as c FROM permissions').catch(() => ({ rows: [{ c: 0 }] }));
        const usersRes = await pool.query('SELECT count(*) as c FROM users').catch(() => ({ rows: [{ c: 0 }] }));
        console.log(`    ✓ عدد الجداول: ${tablesRes.rows[0].c}`);
        console.log(`    ✓ عدد الأدوار: ${rolesRes.rows[0].c}`);
        console.log(`    ✓ عدد الصلاحيات: ${permsRes.rows[0].c}`);
        console.log(`    ✓ عدد المستخدمين: ${usersRes.rows[0].c}`);

        const usersCount = parseInt(usersRes.rows[0].c, 10);
        if (usersCount === 0) {
            console.log('\n[5/5] جاري إنشاء مستخدم المدير...');
            try {
                const bcrypt = require('bcryptjs');
                const { generateId, now } = require('../utils/helpers');
                const adminId = generateId();
                const passwordHash = bcrypt.hashSync('Admin@123', 12);
                const nowVal = now();
                await pool.query(
                    `INSERT INTO users (id, username, email, password_hash, full_name, phone, role, security_level, is_active, created_at, updated_at)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
                    [adminId, 'admin', 'admin@bi-company.com', passwordHash, 'مدير النظام', '07700000000', 'owner', 5, 1, nowVal, nowVal]
                );
                console.log('    ✓ تم إنشاء مستخدم المدير');
                console.log('    📧 Username: admin');
                console.log('    🔑 Password: Admin@123');
            } catch (e) {
                console.warn('    ⚠ تعذر إنشاء مستخدم المدير:', e.message);
            }
        }

        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log('  ✓ تم تهيئة قاعدة البيانات بنجاح!');
        console.log('═══════════════════════════════════════════════════════════════\n');
        return true;
    } catch (error) {
        console.error('\n❌ خطأ في تهيئة قاعدة البيانات:', error);
        return false;
    }
}

if (require.main === module) {
    require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
    initializeDatabase().then(success => {
        process.exit(success ? 0 : 1);
    });
}

module.exports = { initializeDatabase };

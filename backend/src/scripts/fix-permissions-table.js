/**
 * Fix permissions table and seed data (PostgreSQL)
 */
const { initDatabase, getDatabase, run, get } = require('../config/database');

async function fix() {
    console.log('Starting permissions table fix (PostgreSQL)...');
    await initDatabase();

    console.log('1. Dropping old permissions table...');
    await run('DROP TABLE IF EXISTS permission_history CASCADE');
    await run('DROP TABLE IF EXISTS role_permissions CASCADE');
    await run('DROP TABLE IF EXISTS user_permissions CASCADE');
    await run('DROP TABLE IF EXISTS permissions CASCADE');

    console.log('2. Creating permissions table...');
    await run(`
        CREATE TABLE permissions (
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
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        )
    `);

    console.log('3. Creating related tables...');
    await run(`
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
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        )
    `);
    await run(`
        CREATE TABLE IF NOT EXISTS role_permissions (
            id TEXT PRIMARY KEY,
            role_id TEXT NOT NULL,
            permission_id TEXT NOT NULL,
            granted_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            granted_by TEXT
        )
    `);
    await run(`
        CREATE TABLE IF NOT EXISTS user_permissions (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            permission_id TEXT NOT NULL,
            is_granted INTEGER DEFAULT 1,
            granted_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            granted_by TEXT,
            expires_at TEXT,
            reason TEXT
        )
    `);
    await run(`
        CREATE TABLE IF NOT EXISTS permission_history (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            role_id TEXT,
            permission_id TEXT,
            action TEXT NOT NULL,
            old_value TEXT,
            new_value TEXT,
            changed_by TEXT NOT NULL,
            changed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            reason TEXT,
            ip_address TEXT
        )
    `);

    console.log('4. Inserting roles...');
    const roles = [
        ['role_super_admin', 'super_admin', 'المدير العام', 'كل الصلاحيات', 5, 1, '#DC2626', 'Crown'],
        ['role_owner', 'owner', 'المالك', 'صلاحيات المالك', 5, 1, '#7C3AED', 'Building'],
        ['role_admin', 'admin', 'مدير النظام', 'إدارة النظام', 4, 1, '#2563EB', 'Shield'],
        ['role_manager', 'manager', 'مدير فرع', 'إدارة الفرع', 3, 1, '#059669', 'Briefcase'],
        ['role_accountant', 'accountant', 'محاسب', 'العمليات المالية', 2, 1, '#D97706', 'Calculator'],
        ['role_salesperson', 'salesperson', 'موظف مبيعات', 'البيع وخدمة العملاء', 1, 1, '#0891B2', 'ShoppingCart'],
        ['role_warehouse', 'warehouse_keeper', 'أمين مخزن', 'إدارة المخزون', 1, 1, '#4F46E5', 'Package'],
        ['role_inspector', 'inspector', 'فاحص', 'فحص الأجهزة', 1, 1, '#7C3AED', 'Search'],
        ['role_preparer', 'preparer', 'مجهز', 'تجهيز الطلبات', 1, 1, '#10B981', 'Wrench'],
        ['role_delivery', 'delivery', 'موظف توصيل', 'التوصيل', 1, 1, '#F59E0B', 'Truck'],
        ['role_technician', 'technician', 'فني صيانة', 'الصيانة', 1, 1, '#6366F1', 'Settings'],
        ['role_viewer', 'viewer', 'مشاهد', 'مشاهدة فقط', 0, 1, '#6B7280', 'Eye']
    ];
    for (const r of roles) {
        try {
            await run(
                `INSERT INTO roles (id, name, name_ar, description, security_level, is_system, color, icon)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                 ON CONFLICT (id) DO UPDATE SET name=$2, name_ar=$3, description=$4, security_level=$5, is_system=$6, color=$7, icon=$8`,
                r
            );
        } catch (e) {}
    }

    console.log('5. Inserting permissions...');
    const perms = [
        ['perm_001', 'system.users.view', 'عرض المستخدمين', 'system', 'users', 'view', 0, 2],
        ['perm_002', 'system.users.create', 'إنشاء مستخدم', 'system', 'users', 'create', 1, 3],
        ['perm_003', 'system.users.edit', 'تعديل مستخدم', 'system', 'users', 'edit', 1, 3],
        ['perm_004', 'system.users.delete', 'حذف مستخدم', 'system', 'users', 'delete', 1, 4],
        ['perm_005', 'system.users.lock', 'قفل مستخدم', 'system', 'users', 'lock', 1, 3],
        ['perm_006', 'system.users.unlock', 'فتح قفل مستخدم', 'system', 'users', 'unlock', 1, 3],
        ['perm_007', 'system.users.reset_password', 'إعادة تعيين كلمة المرور', 'system', 'users', 'reset_password', 1, 3],
        ['perm_008', 'system.users.change_role', 'تغيير دور المستخدم', 'system', 'users', 'change_role', 1, 4],
        ['perm_009', 'system.roles.view', 'عرض الأدوار', 'system', 'roles', 'view', 0, 2],
        ['perm_010', 'system.roles.create', 'إنشاء دور', 'system', 'roles', 'create', 1, 4],
        ['perm_011', 'system.roles.edit', 'تعديل دور', 'system', 'roles', 'edit', 1, 4],
        ['perm_012', 'system.roles.delete', 'حذف دور', 'system', 'roles', 'delete', 1, 5],
        ['perm_013', 'system.permissions.view', 'عرض الصلاحيات', 'system', 'permissions', 'view', 0, 2],
        ['perm_014', 'system.permissions.assign', 'تعيين صلاحيات', 'system', 'permissions', 'assign', 1, 4],
        ['perm_015', 'system.permissions.revoke', 'إلغاء صلاحيات', 'system', 'permissions', 'revoke', 1, 4],
        ['perm_016', 'system.permissions.history', 'سجل الصلاحيات', 'system', 'permissions', 'history', 0, 3],
        ['perm_017', 'system.settings.view', 'عرض الإعدادات', 'system', 'settings', 'view', 0, 2],
        ['perm_018', 'system.settings.edit', 'تعديل الإعدادات', 'system', 'settings', 'edit', 1, 4],
        ['perm_019', 'system.audit.view', 'عرض سجل التدقيق', 'system', 'audit', 'view', 1, 3],
        ['perm_020', 'system.backup.create', 'إنشاء نسخة احتياطية', 'system', 'backup', 'create', 1, 4],
    ];
    for (const p of perms) {
        try {
            await run(
                `INSERT INTO permissions (id, code, name_ar, module, feature, action, is_sensitive, security_level)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                 ON CONFLICT (id) DO UPDATE SET code=$2, name_ar=$3, module=$4, feature=$5, action=$6, is_sensitive=$7, security_level=$8`,
                p
            );
        } catch (e) {}
    }

    const permCount = await get('SELECT COUNT(*) as count FROM permissions');
    const roleCount = await get('SELECT COUNT(*) as count FROM roles');
    console.log('\n  Permissions:', permCount?.count ?? 0);
    console.log('  Roles:', roleCount?.count ?? 0);
    console.log('Done!');
}

fix().then(() => process.exit(0)).catch(e => {
    console.error('Error:', e);
    process.exit(1);
});

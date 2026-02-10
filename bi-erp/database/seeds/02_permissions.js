/**
 * Seed core permissions (minimal set for Phase 1)
 */

const PERMISSIONS = [
  { code: 'users.view', name_ar: 'عرض المستخدمين', module: 'users', feature: 'users', action: 'view', security_level: 2 },
  { code: 'users.create', name_ar: 'إنشاء مستخدم', module: 'users', feature: 'users', action: 'create', security_level: 4 },
  { code: 'users.update', name_ar: 'تعديل مستخدم', module: 'users', feature: 'users', action: 'update', security_level: 4 },
  { code: 'users.delete', name_ar: 'حذف مستخدم', module: 'users', feature: 'users', action: 'delete', security_level: 5 },
  { code: 'roles.manage', name_ar: 'إدارة الأدوار', module: 'roles', feature: 'roles', action: 'manage', security_level: 5 },
  { code: 'permissions.manage', name_ar: 'إدارة الصلاحيات', module: 'permissions', feature: 'permissions', action: 'manage', security_level: 5 },
  { code: 'audit.view', name_ar: 'عرض سجل التدقيق', module: 'audit', feature: 'audit', action: 'view', security_level: 4 },
  { code: 'settings.manage', name_ar: 'إعدادات النظام', module: 'settings', feature: 'settings', action: 'manage', security_level: 5 },
];

async function run(pool) {
  for (const p of PERMISSIONS) {
    await pool.query(
      `INSERT INTO permissions (code, name_ar, module, feature, action, security_level, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, 0)
       ON CONFLICT (code) DO NOTHING`,
      [p.code, p.name_ar, p.module, p.feature, p.action, p.security_level]
    );
  }
}

module.exports = { run };

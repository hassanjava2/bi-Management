/**
 * عينة من الصلاحيات (60 صلاحية نظام) — من أصل 743
 */
export const PERMISSIONS_SAMPLE = [
  { id: "perm_001", code: "system.users.view", nameAr: "عرض المستخدمين", module: "system", feature: "users", action: "view", isSensitive: 0, securityLevel: 2 },
  { id: "perm_002", code: "system.users.view_all", nameAr: "عرض كل المستخدمين", module: "system", feature: "users", action: "view_all", isSensitive: 0, securityLevel: 3 },
  { id: "perm_003", code: "system.users.create", nameAr: "إنشاء مستخدم", module: "system", feature: "users", action: "create", isSensitive: 1, securityLevel: 3 },
  { id: "perm_004", code: "system.users.edit", nameAr: "تعديل مستخدم", module: "system", feature: "users", action: "edit", isSensitive: 1, securityLevel: 3 },
  { id: "perm_005", code: "system.users.delete", nameAr: "حذف مستخدم", module: "system", feature: "users", action: "delete", isSensitive: 1, securityLevel: 4 },
  { id: "perm_016", code: "system.roles.view", nameAr: "عرض الأدوار", module: "system", feature: "roles", action: "view", isSensitive: 0, securityLevel: 2 },
  { id: "perm_017", code: "system.roles.create", nameAr: "إنشاء دور", module: "system", feature: "roles", action: "create", isSensitive: 1, securityLevel: 4 },
  { id: "perm_021", code: "system.permissions.view", nameAr: "عرض الصلاحيات", module: "system", feature: "permissions", action: "view", isSensitive: 0, securityLevel: 2 },
  { id: "perm_022", code: "system.permissions.assign", nameAr: "تعيين صلاحيات", module: "system", feature: "permissions", action: "assign", isSensitive: 1, securityLevel: 4 },
  { id: "perm_028", code: "system.settings.view", nameAr: "عرض الإعدادات", module: "system", feature: "settings", action: "view", isSensitive: 0, securityLevel: 2 },
  { id: "perm_029", code: "system.settings.edit", nameAr: "تعديل الإعدادات", module: "system", feature: "settings", action: "edit", isSensitive: 1, securityLevel: 4 },
  { id: "perm_033", code: "system.branches.view", nameAr: "عرض الفروع", module: "system", feature: "branches", action: "view", isSensitive: 0, securityLevel: 1 },
  { id: "perm_040", code: "system.audit.view", nameAr: "عرض سجل التدقيق", module: "system", feature: "audit", action: "view", isSensitive: 1, securityLevel: 3 },
  { id: "perm_052", code: "system.approvals.view", nameAr: "عرض طلبات الموافقة", module: "system", feature: "approvals", action: "view", isSensitive: 0, securityLevel: 2 },
  { id: "perm_054", code: "system.approvals.approve", nameAr: "الموافقة على الطلبات", module: "system", feature: "approvals", action: "approve", isSensitive: 1, securityLevel: 3 },
] as const;

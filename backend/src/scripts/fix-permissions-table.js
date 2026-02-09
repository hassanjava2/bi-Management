/**
 * Fix permissions table and seed data
 */

const { initDatabase, getDatabase, saveDatabase } = require('../config/database');

async function fix() {
    console.log('Starting permissions table fix...');
    
    await initDatabase();
    const db = getDatabase();
    
    // 1. حذف الجدول القديم
    console.log('1. Dropping old permissions table...');
    try { 
        db.run('DROP TABLE IF EXISTS permissions'); 
    } catch(e) {
        console.log('   Warning:', e.message);
    }
    
    // 2. إنشاء الجدول الجديد
    console.log('2. Creating new permissions table...');
    db.run(`
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
            created_at TEXT DEFAULT (datetime('now'))
        )
    `);
    
    // 3. إنشاء جداول أخرى إذا لم تكن موجودة
    console.log('3. Creating related tables...');
    
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
    
    db.run(`
        CREATE TABLE IF NOT EXISTS role_permissions (
            id TEXT PRIMARY KEY,
            role_id TEXT NOT NULL,
            permission_id TEXT NOT NULL,
            granted_at TEXT DEFAULT (datetime('now')),
            granted_by TEXT
        )
    `);
    
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
    
    db.run(`
        CREATE TABLE IF NOT EXISTS permission_history (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            role_id TEXT,
            permission_id TEXT,
            action TEXT NOT NULL,
            old_value TEXT,
            new_value TEXT,
            changed_by TEXT NOT NULL,
            changed_at TEXT DEFAULT (datetime('now')),
            reason TEXT,
            ip_address TEXT
        )
    `);
    
    // 4. إضافة الأدوار
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
    
    for (const role of roles) {
        try {
            db.run(`INSERT OR REPLACE INTO roles (id, name, name_ar, description, security_level, is_system, color, icon)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, role);
        } catch(e) {}
    }
    
    // 5. إضافة الصلاحيات
    console.log('5. Inserting permissions...');
    
    // نظام والإدارة
    const permissions = [
        // النظام
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
        
        // المبيعات
        ['perm_100', 'sales.invoice.view', 'عرض فواتير البيع', 'sales', 'invoice', 'view', 0, 1],
        ['perm_101', 'sales.invoice.view_all', 'عرض كل الفواتير', 'sales', 'invoice', 'view_all', 0, 2],
        ['perm_102', 'sales.invoice.create', 'إنشاء فاتورة بيع', 'sales', 'invoice', 'create', 0, 1],
        ['perm_103', 'sales.invoice.edit', 'تعديل فاتورة بيع', 'sales', 'invoice', 'edit', 0, 2],
        ['perm_104', 'sales.invoice.delete', 'حذف فاتورة بيع', 'sales', 'invoice', 'delete', 1, 3],
        ['perm_105', 'sales.invoice.void', 'إلغاء فاتورة بيع', 'sales', 'invoice', 'void', 1, 3],
        ['perm_106', 'sales.invoice.approve', 'اعتماد فاتورة بيع', 'sales', 'invoice', 'approve', 0, 2],
        ['perm_107', 'sales.invoice.print', 'طباعة فاتورة بيع', 'sales', 'invoice', 'print', 0, 1],
        ['perm_108', 'sales.invoice.view_cost', 'عرض سعر التكلفة', 'sales', 'invoice', 'view_cost', 1, 3],
        ['perm_109', 'sales.cash.create', 'بيع نقدي', 'sales', 'cash', 'create', 0, 1],
        ['perm_110', 'sales.credit.create', 'بيع آجل', 'sales', 'credit', 'create', 0, 2],
        ['perm_111', 'sales.aqsaty.create', 'بيع أقساطي', 'sales', 'aqsaty', 'create', 0, 2],
        ['perm_112', 'sales.jenny.create', 'بيع جني', 'sales', 'jenny', 'create', 0, 2],
        ['perm_113', 'sales.exchange.create', 'استبدال', 'sales', 'exchange', 'create', 0, 2],
        ['perm_114', 'sales.price.view', 'عرض الأسعار', 'sales', 'price', 'view', 0, 1],
        ['perm_115', 'sales.price.edit', 'تعديل سعر البيع', 'sales', 'price', 'edit', 1, 3],
        ['perm_116', 'sales.price.override', 'تجاوز السعر المحدد', 'sales', 'price', 'override', 1, 3],
        ['perm_117', 'sales.price.below_min', 'بيع بأقل من الحد الأدنى', 'sales', 'price', 'below_min', 1, 4],
        ['perm_118', 'sales.discount.apply', 'تطبيق خصم', 'sales', 'discount', 'apply', 0, 1],
        ['perm_119', 'sales.discount.approve', 'الموافقة على خصم كبير', 'sales', 'discount', 'approve', 1, 3],
        ['perm_120', 'sales.quotation.view', 'عرض عروض الأسعار', 'sales', 'quotation', 'view', 0, 1],
        ['perm_121', 'sales.quotation.create', 'إنشاء عرض سعر', 'sales', 'quotation', 'create', 0, 1],
        ['perm_122', 'sales.installment.view', 'عرض الأقساط', 'sales', 'installment', 'view', 0, 1],
        ['perm_123', 'sales.installment.collect', 'تحصيل قسط', 'sales', 'installment', 'collect', 0, 1],
        
        // المشتريات
        ['perm_200', 'purchases.invoice.view', 'عرض فواتير الشراء', 'purchases', 'invoice', 'view', 0, 1],
        ['perm_201', 'purchases.invoice.create', 'إنشاء فاتورة شراء', 'purchases', 'invoice', 'create', 1, 2],
        ['perm_202', 'purchases.invoice.edit', 'تعديل فاتورة شراء', 'purchases', 'invoice', 'edit', 1, 2],
        ['perm_203', 'purchases.invoice.delete', 'حذف فاتورة شراء', 'purchases', 'invoice', 'delete', 1, 3],
        ['perm_204', 'purchases.invoice.approve', 'اعتماد فاتورة شراء', 'purchases', 'invoice', 'approve', 1, 3],
        ['perm_205', 'purchases.invoice.view_cost', 'عرض أسعار الشراء', 'purchases', 'invoice', 'view_cost', 1, 3],
        ['perm_206', 'purchases.order.view', 'عرض طلبات الشراء', 'purchases', 'order', 'view', 0, 1],
        ['perm_207', 'purchases.order.create', 'إنشاء طلب شراء', 'purchases', 'order', 'create', 0, 2],
        ['perm_208', 'purchases.return.view', 'عرض مرتجعات الشراء', 'purchases', 'return', 'view', 0, 1],
        ['perm_209', 'purchases.return.create', 'إنشاء مرتجع شراء', 'purchases', 'return', 'create', 1, 2],
        
        // المخزون
        ['perm_300', 'inventory.product.view', 'عرض المنتجات', 'inventory', 'product', 'view', 0, 1],
        ['perm_301', 'inventory.product.create', 'إنشاء منتج', 'inventory', 'product', 'create', 0, 2],
        ['perm_302', 'inventory.product.edit', 'تعديل منتج', 'inventory', 'product', 'edit', 0, 2],
        ['perm_303', 'inventory.product.delete', 'حذف منتج', 'inventory', 'product', 'delete', 1, 3],
        ['perm_304', 'inventory.product.view_cost', 'عرض سعر التكلفة', 'inventory', 'product', 'view_cost', 1, 3],
        ['perm_305', 'inventory.product.edit_cost', 'تعديل سعر التكلفة', 'inventory', 'product', 'edit_cost', 1, 4],
        ['perm_306', 'inventory.serial.view', 'عرض السيريالات', 'inventory', 'serial', 'view', 0, 1],
        ['perm_307', 'inventory.serial.create', 'إضافة سيريال', 'inventory', 'serial', 'create', 0, 2],
        ['perm_308', 'inventory.serial.transfer', 'نقل سيريال', 'inventory', 'serial', 'transfer', 0, 2],
        ['perm_309', 'inventory.warehouse.view', 'عرض المخازن', 'inventory', 'warehouse', 'view', 0, 1],
        ['perm_310', 'inventory.warehouse.create', 'إنشاء مخزن', 'inventory', 'warehouse', 'create', 1, 3],
        ['perm_311', 'inventory.warehouse.transfer', 'نقل بين المخازن', 'inventory', 'warehouse', 'transfer', 0, 2],
        ['perm_312', 'inventory.movement.view', 'عرض حركات المخزون', 'inventory', 'movement', 'view', 0, 1],
        ['perm_313', 'inventory.movement.adjust', 'تعديل الكمية', 'inventory', 'movement', 'adjust', 1, 3],
        ['perm_314', 'inventory.count.view', 'عرض الجرد', 'inventory', 'count', 'view', 0, 1],
        ['perm_315', 'inventory.count.create', 'إنشاء جرد', 'inventory', 'count', 'create', 0, 2],
        
        // المرتجعات
        ['perm_400', 'returns.view', 'عرض المرتجعات', 'returns', 'all', 'view', 0, 1],
        ['perm_401', 'returns.create', 'إنشاء مرتجع', 'returns', 'all', 'create', 0, 1],
        ['perm_402', 'returns.approve', 'اعتماد مرتجع', 'returns', 'all', 'approve', 0, 2],
        ['perm_403', 'returns.classify', 'تصنيف المرتجع', 'returns', 'classification', 'edit', 0, 2],
        ['perm_404', 'returns.refund', 'إرجاع المبلغ', 'returns', 'refund', 'create', 1, 2],
        
        // الصيانة
        ['perm_500', 'maintenance.order.view', 'عرض أوامر الصيانة', 'maintenance', 'order', 'view', 0, 1],
        ['perm_501', 'maintenance.order.create', 'إنشاء أمر صيانة', 'maintenance', 'order', 'create', 0, 1],
        ['perm_502', 'maintenance.order.edit', 'تعديل أمر صيانة', 'maintenance', 'order', 'edit', 0, 2],
        ['perm_503', 'maintenance.order.assign', 'تعيين فني', 'maintenance', 'order', 'assign', 0, 2],
        ['perm_504', 'maintenance.order.complete', 'إنهاء الصيانة', 'maintenance', 'order', 'complete', 0, 1],
        ['perm_505', 'maintenance.parts.add', 'إضافة قطع غيار', 'maintenance', 'parts', 'add', 0, 1],
        ['perm_506', 'maintenance.warranty.view', 'عرض الضمان', 'maintenance', 'warranty', 'view', 0, 1],
        ['perm_507', 'maintenance.warranty.claim', 'مطالبة ضمان', 'maintenance', 'warranty', 'claim', 0, 2],
        
        // المالية
        ['perm_600', 'finance.accounts.view', 'عرض شجرة الحسابات', 'finance', 'accounts', 'view', 1, 2],
        ['perm_601', 'finance.accounts.create', 'إنشاء حساب', 'finance', 'accounts', 'create', 1, 3],
        ['perm_602', 'finance.journal.view', 'عرض القيود', 'finance', 'journal', 'view', 1, 2],
        ['perm_603', 'finance.journal.create', 'إنشاء قيد', 'finance', 'journal', 'create', 1, 2],
        ['perm_604', 'finance.voucher.view', 'عرض السندات', 'finance', 'voucher', 'view', 0, 1],
        ['perm_605', 'finance.voucher.receipt.create', 'إنشاء سند قبض', 'finance', 'voucher', 'receipt_create', 0, 1],
        ['perm_606', 'finance.voucher.payment.create', 'إنشاء سند صرف', 'finance', 'voucher', 'payment_create', 1, 2],
        ['perm_607', 'finance.cash.view', 'عرض القاصة', 'finance', 'cash', 'view', 1, 2],
        ['perm_608', 'finance.cash.in', 'إيداع في القاصة', 'finance', 'cash', 'in', 1, 2],
        ['perm_609', 'finance.cash.out', 'سحب من القاصة', 'finance', 'cash', 'out', 1, 3],
        ['perm_610', 'finance.bank.view', 'عرض الحسابات البنكية', 'finance', 'bank', 'view', 1, 2],
        ['perm_611', 'finance.check.view', 'عرض الشيكات', 'finance', 'check', 'view', 1, 2],
        ['perm_612', 'finance.check.receive', 'استلام شيك', 'finance', 'check', 'receive', 0, 1],
        
        // العملاء والموردين
        ['perm_700', 'customers.view', 'عرض العملاء', 'customers', 'all', 'view', 0, 1],
        ['perm_701', 'customers.create', 'إضافة عميل', 'customers', 'all', 'create', 0, 1],
        ['perm_702', 'customers.edit', 'تعديل عميل', 'customers', 'all', 'edit', 0, 1],
        ['perm_703', 'customers.delete', 'حذف عميل', 'customers', 'all', 'delete', 1, 3],
        ['perm_704', 'customers.statement', 'كشف حساب العميل', 'customers', 'statement', 'view', 0, 1],
        ['perm_705', 'customers.credit_limit.edit', 'تعديل حد الائتمان', 'customers', 'credit', 'edit', 1, 3],
        ['perm_706', 'suppliers.view', 'عرض الموردين', 'suppliers', 'all', 'view', 0, 1],
        ['perm_707', 'suppliers.create', 'إضافة مورد', 'suppliers', 'all', 'create', 1, 2],
        ['perm_708', 'suppliers.edit', 'تعديل مورد', 'suppliers', 'all', 'edit', 1, 2],
        ['perm_709', 'suppliers.statement', 'كشف حساب المورد', 'suppliers', 'statement', 'view', 1, 2],
        
        // الموارد البشرية
        ['perm_800', 'hr.employee.view', 'عرض الموظفين', 'hr', 'employee', 'view', 0, 2],
        ['perm_801', 'hr.employee.create', 'إضافة موظف', 'hr', 'employee', 'create', 1, 3],
        ['perm_802', 'hr.employee.edit', 'تعديل موظف', 'hr', 'employee', 'edit', 1, 3],
        ['perm_803', 'hr.employee.view_salary', 'عرض راتب الموظف', 'hr', 'employee', 'view_salary', 1, 4],
        ['perm_804', 'hr.attendance.view', 'عرض الحضور', 'hr', 'attendance', 'view', 0, 1],
        ['perm_805', 'hr.attendance.checkin', 'تسجيل حضور', 'hr', 'attendance', 'checkin', 0, 1],
        ['perm_806', 'hr.attendance.edit', 'تعديل حضور', 'hr', 'attendance', 'edit', 1, 3],
        ['perm_807', 'hr.salary.view', 'عرض كشف الرواتب', 'hr', 'salary', 'view', 1, 3],
        ['perm_808', 'hr.salary.create', 'إنشاء كشف راتب', 'hr', 'salary', 'create', 1, 3],
        ['perm_809', 'hr.advance.view', 'عرض السلف', 'hr', 'advance', 'view', 0, 2],
        ['perm_810', 'hr.advance.request', 'طلب سلفة', 'hr', 'advance', 'request', 0, 1],
        ['perm_811', 'hr.advance.approve', 'الموافقة على سلفة', 'hr', 'advance', 'approve', 1, 3],
        ['perm_812', 'hr.leave.view', 'عرض الإجازات', 'hr', 'leave', 'view', 0, 1],
        ['perm_813', 'hr.leave.request', 'طلب إجازة', 'hr', 'leave', 'request', 0, 1],
        ['perm_814', 'hr.leave.approve', 'الموافقة على إجازة', 'hr', 'leave', 'approve', 0, 2],
        
        // التوصيل
        ['perm_900', 'delivery.order.view', 'عرض طلبات التوصيل', 'delivery', 'order', 'view', 0, 1],
        ['perm_901', 'delivery.order.create', 'إنشاء طلب توصيل', 'delivery', 'order', 'create', 0, 1],
        ['perm_902', 'delivery.order.assign', 'تعيين سائق', 'delivery', 'order', 'assign', 0, 2],
        ['perm_903', 'delivery.order.deliver', 'تأكيد التسليم', 'delivery', 'order', 'deliver', 0, 1],
        ['perm_904', 'delivery.driver.view', 'عرض السائقين', 'delivery', 'driver', 'view', 0, 1],
        ['perm_905', 'delivery.track', 'تتبع التوصيل', 'delivery', 'track', 'view', 0, 1],
        
        // التقارير
        ['perm_1000', 'reports.sales.daily', 'تقرير المبيعات اليومي', 'reports', 'sales', 'daily', 0, 1],
        ['perm_1001', 'reports.sales.monthly', 'تقرير المبيعات الشهري', 'reports', 'sales', 'monthly', 0, 2],
        ['perm_1002', 'reports.sales.profit', 'تقرير الأرباح', 'reports', 'sales', 'profit', 1, 3],
        ['perm_1003', 'reports.inventory.current', 'المخزون الحالي', 'reports', 'inventory', 'current', 0, 1],
        ['perm_1004', 'reports.inventory.valuation', 'تقييم المخزون', 'reports', 'inventory', 'valuation', 1, 3],
        ['perm_1005', 'reports.finance.trial_balance', 'ميزان المراجعة', 'reports', 'finance', 'trial_balance', 1, 3],
        ['perm_1006', 'reports.finance.balance_sheet', 'الميزانية العمومية', 'reports', 'finance', 'balance_sheet', 1, 4],
        ['perm_1007', 'reports.export', 'تصدير التقارير', 'reports', 'all', 'export', 0, 2],
        
        // الأسهم
        ['perm_1100', 'shares.view', 'عرض الأسهم', 'shares', 'all', 'view', 1, 4],
        ['perm_1101', 'shares.shareholder.view', 'عرض المساهمين', 'shares', 'shareholder', 'view', 1, 4],
        ['perm_1102', 'shares.dividend.view', 'عرض الأرباح', 'shares', 'dividend', 'view', 1, 4],
        ['perm_1103', 'shares.dividend.create', 'توزيع أرباح', 'shares', 'dividend', 'create', 1, 5],
        
        // الذكاء الاصطناعي
        ['perm_1200', 'ai.chat', 'استخدام المساعد الذكي', 'ai', 'chat', 'use', 0, 1],
        ['perm_1201', 'ai.analyze', 'التحليل الذكي', 'ai', 'analyze', 'use', 0, 2],
        ['perm_1202', 'ai.ocr', 'قراءة المستندات', 'ai', 'ocr', 'use', 0, 1],
        
        // الإشعارات
        ['perm_1300', 'notifications.view', 'عرض الإشعارات', 'notifications', 'all', 'view', 0, 1],
        ['perm_1301', 'notifications.send', 'إرسال إشعار', 'notifications', 'all', 'send', 0, 2],
        ['perm_1302', 'notifications.broadcast', 'إرسال للجميع', 'notifications', 'all', 'broadcast', 1, 3],
    ];
    
    for (const perm of permissions) {
        try {
            db.run(`INSERT OR REPLACE INTO permissions (id, code, name_ar, module, feature, action, is_sensitive, security_level)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, perm);
        } catch(e) {}
    }
    
    saveDatabase();
    
    // الإحصائيات
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  Statistics:');
    const permCount = db.prepare('SELECT COUNT(*) as count FROM permissions').getAsObject({}).count;
    console.log(`    Permissions: ${permCount}`);
    const roleCount = db.prepare('SELECT COUNT(*) as count FROM roles').getAsObject({}).count;
    console.log(`    Roles: ${roleCount}`);
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    console.log('Done!');
}

fix().then(() => process.exit(0)).catch(e => {
    console.error('Error:', e);
    process.exit(1);
});

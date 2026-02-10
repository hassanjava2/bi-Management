/**
 * BI Management - Permission Hooks
 * هوكات الصلاحيات للواجهة الأمامية
 */

import { useState, useEffect, useMemo, useCallback, createContext, useContext } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

// ═══════════════════════════════════════════════════════════════════════════════
// Context للصلاحيات
// ═══════════════════════════════════════════════════════════════════════════════

const PermissionContext = createContext(null);

/**
 * Provider للصلاحيات
 */
export function PermissionProvider({ children }) {
    const { user, isAuthenticated } = useAuth();
    const [permissions, setPermissions] = useState([]);
    const [permissionCodes, setPermissionCodes] = useState(new Set());
    const [isLoading, setIsLoading] = useState(true);
    const [isSuper, setIsSuper] = useState(false);

    // جلب الصلاحيات عند تسجيل الدخول
    useEffect(() => {
        if (isAuthenticated && user) {
            fetchPermissions();
        } else {
            setPermissions([]);
            setPermissionCodes(new Set());
            setIsLoading(false);
            setIsSuper(false);
        }
    }, [isAuthenticated, user?.id]);

    const fetchPermissions = async () => {
        try {
            setIsLoading(true);
            
            // المالك لديه كل الصلاحيات
            if (user?.role === 'owner') {
                setIsSuper(true);
                setIsLoading(false);
                return;
            }
            
            const response = await api.get('/permissions/my-permissions');
            
            if (response.data.success) {
                setPermissions(response.data.data || []);
                setPermissionCodes(new Set(response.data.codes || []));
                setIsSuper(response.data.is_super || false);
            }
        } catch (error) {
            console.warn('Could not fetch permissions, using defaults:', error.message);
            // في حالة الخطأ، نستخدم الصلاحيات من التوكن أو نعطي صلاحيات افتراضية
            if (user?.role === 'owner' || user?.role === 'admin') {
                setIsSuper(true);
            } else if (user?.permissions) {
                setPermissionCodes(new Set(user.permissions));
            }
        } finally {
            setIsLoading(false);
        }
    };

    // إعادة تحميل الصلاحيات
    const refreshPermissions = useCallback(() => {
        if (isAuthenticated) {
            fetchPermissions();
        }
    }, [isAuthenticated]);

    // التحقق من صلاحية
    const hasPermission = useCallback((code) => {
        if (isSuper) return true;
        return permissionCodes.has(code);
    }, [permissionCodes, isSuper]);

    // التحقق من أي صلاحية من قائمة
    const hasAnyPermission = useCallback((codes) => {
        if (isSuper) return true;
        return codes.some(code => permissionCodes.has(code));
    }, [permissionCodes, isSuper]);

    // التحقق من كل الصلاحيات
    const hasAllPermissions = useCallback((codes) => {
        if (isSuper) return true;
        return codes.every(code => permissionCodes.has(code));
    }, [permissionCodes, isSuper]);

    const value = {
        permissions,
        permissionCodes,
        isLoading,
        isSuper,
        hasPermission,
        hasAnyPermission,
        hasAllPermissions,
        refreshPermissions
    };

    return (
        <PermissionContext.Provider value={value}>
            {children}
        </PermissionContext.Provider>
    );
}

/**
 * استخدام Context الصلاحيات
 */
export function usePermissions() {
    const context = useContext(PermissionContext);
    if (!context) {
        throw new Error('usePermissions must be used within PermissionProvider');
    }
    return context;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Hooks منفصلة
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * التحقق من صلاحية واحدة
 * @param {string} permissionCode - كود الصلاحية
 * @returns {boolean}
 * 
 * @example
 * const canCreateInvoice = usePermission('sales.invoice.create');
 * if (canCreateInvoice) { ... }
 */
export function usePermission(permissionCode) {
    const { hasPermission, isLoading } = usePermissions();
    
    return useMemo(() => ({
        allowed: hasPermission(permissionCode),
        loading: isLoading
    }), [hasPermission, permissionCode, isLoading]);
}

/**
 * التحقق من أي صلاحية من قائمة
 * @param {string[]} permissionCodes - قائمة أكواد الصلاحيات
 * @returns {boolean}
 * 
 * @example
 * const canManageInvoices = useAnyPermission(['sales.invoice.create', 'sales.invoice.edit']);
 */
export function useAnyPermission(permissionCodes) {
    const { hasAnyPermission, isLoading } = usePermissions();
    
    return useMemo(() => ({
        allowed: hasAnyPermission(permissionCodes),
        loading: isLoading
    }), [hasAnyPermission, permissionCodes, isLoading]);
}

/**
 * التحقق من كل الصلاحيات
 * @param {string[]} permissionCodes - قائمة أكواد الصلاحيات
 * @returns {boolean}
 */
export function useAllPermissions(permissionCodes) {
    const { hasAllPermissions, isLoading } = usePermissions();
    
    return useMemo(() => ({
        allowed: hasAllPermissions(permissionCodes),
        loading: isLoading
    }), [hasAllPermissions, permissionCodes, isLoading]);
}

/**
 * جلب صلاحيات متعددة كـ object
 * @param {string[]} codes - قائمة أكواد الصلاحيات
 * @returns {object} - {code: boolean}
 * 
 * @example
 * const perms = usePermissionsMap(['sales.invoice.create', 'sales.invoice.edit', 'sales.invoice.delete']);
 * // { 'sales.invoice.create': true, 'sales.invoice.edit': true, 'sales.invoice.delete': false }
 */
export function usePermissionsMap(codes) {
    const { hasPermission, isLoading } = usePermissions();
    
    return useMemo(() => {
        const result = {};
        codes.forEach(code => {
            result[code] = hasPermission(code);
        });
        return { permissions: result, loading: isLoading };
    }, [hasPermission, codes, isLoading]);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Components
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * عرض المحتوى فقط إذا لدى المستخدم الصلاحية
 * 
 * @example
 * <Can permission="sales.invoice.create">
 *   <Button>إنشاء فاتورة</Button>
 * </Can>
 * 
 * @example
 * <Can permission="sales.invoice.create" fallback={<span>غير مصرح</span>}>
 *   <Button>إنشاء فاتورة</Button>
 * </Can>
 */
export function Can({ permission, permissions, any, all, fallback = null, children }) {
    const { hasPermission, hasAnyPermission, hasAllPermissions, isLoading } = usePermissions();
    
    if (isLoading) {
        return null; // أو loading spinner
    }
    
    let allowed = false;
    
    if (permission) {
        allowed = hasPermission(permission);
    } else if (permissions && any) {
        allowed = hasAnyPermission(permissions);
    } else if (permissions && all) {
        allowed = hasAllPermissions(permissions);
    } else if (permissions) {
        // default: all
        allowed = hasAllPermissions(permissions);
    }
    
    return allowed ? children : fallback;
}

/**
 * إخفاء المحتوى إذا لدى المستخدم الصلاحية
 * (عكس Can)
 */
export function Cannot({ permission, permissions, any, all, children }) {
    return (
        <Can permission={permission} permissions={permissions} any={any} all={all} fallback={children}>
            {null}
        </Can>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Utilities
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * قائمة الصلاحيات الشائعة
 */
export const PERMISSIONS = {
    // المبيعات
    SALES_INVOICE_VIEW: 'sales.invoice.view',
    SALES_INVOICE_CREATE: 'sales.invoice.create',
    SALES_INVOICE_EDIT: 'sales.invoice.edit',
    SALES_INVOICE_DELETE: 'sales.invoice.delete',
    SALES_INVOICE_VOID: 'sales.invoice.void',
    SALES_INVOICE_APPROVE: 'sales.invoice.approve',
    SALES_INVOICE_PRINT: 'sales.invoice.print',
    SALES_INVOICE_VIEW_COST: 'sales.invoice.view_cost',
    
    // أنواع البيع
    SALES_CASH: 'sales.cash.create',
    SALES_CREDIT: 'sales.credit.create',
    SALES_AQSATY: 'sales.aqsaty.create',
    SALES_JENNY: 'sales.jenny.create',
    SALES_EXCHANGE: 'sales.exchange.create',
    
    // الأسعار
    SALES_PRICE_VIEW: 'sales.price.view',
    SALES_PRICE_EDIT: 'sales.price.edit',
    SALES_PRICE_OVERRIDE: 'sales.price.override',
    SALES_PRICE_BELOW_MIN: 'sales.price.below_min',
    SALES_DISCOUNT_APPLY: 'sales.discount.apply',
    SALES_DISCOUNT_APPROVE: 'sales.discount.approve',
    
    // المخزون
    INVENTORY_PRODUCT_VIEW: 'inventory.product.view',
    INVENTORY_PRODUCT_CREATE: 'inventory.product.create',
    INVENTORY_PRODUCT_EDIT: 'inventory.product.edit',
    INVENTORY_PRODUCT_DELETE: 'inventory.product.delete',
    INVENTORY_PRODUCT_VIEW_COST: 'inventory.product.view_cost',
    INVENTORY_SERIAL_VIEW: 'inventory.serial.view',
    INVENTORY_SERIAL_CREATE: 'inventory.serial.create',
    INVENTORY_SERIAL_TRANSFER: 'inventory.serial.transfer',
    INVENTORY_WAREHOUSE_VIEW: 'inventory.warehouse.view',
    INVENTORY_WAREHOUSE_TRANSFER: 'inventory.warehouse.transfer',
    
    // العملاء
    CUSTOMERS_VIEW: 'customers.view',
    CUSTOMERS_CREATE: 'customers.create',
    CUSTOMERS_EDIT: 'customers.edit',
    CUSTOMERS_DELETE: 'customers.delete',
    CUSTOMERS_CREDIT_LIMIT: 'customers.credit_limit.edit',
    
    // المالية
    FINANCE_ACCOUNTS_VIEW: 'finance.accounts.view',
    FINANCE_JOURNAL_VIEW: 'finance.journal.view',
    FINANCE_VOUCHER_VIEW: 'finance.voucher.view',
    FINANCE_VOUCHER_RECEIPT: 'finance.voucher.receipt.create',
    FINANCE_VOUCHER_PAYMENT: 'finance.voucher.payment.create',
    FINANCE_CASH_VIEW: 'finance.cash.view',
    
    // التقارير
    REPORTS_SALES: 'reports.sales.daily',
    REPORTS_INVENTORY: 'reports.inventory.current',
    REPORTS_FINANCE: 'reports.finance.trial_balance',
    REPORTS_PROFIT: 'reports.sales.profit',
    
    // النظام
    SYSTEM_USERS_VIEW: 'system.users.view',
    SYSTEM_USERS_CREATE: 'system.users.create',
    SYSTEM_USERS_EDIT: 'system.users.edit',
    SYSTEM_ROLES_VIEW: 'system.roles.view',
    SYSTEM_ROLES_CREATE: 'system.roles.create',
    SYSTEM_PERMISSIONS_VIEW: 'system.permissions.view',
    SYSTEM_PERMISSIONS_ASSIGN: 'system.permissions.assign',
    SYSTEM_SETTINGS_VIEW: 'system.settings.view',
    SYSTEM_SETTINGS_EDIT: 'system.settings.edit',
    SYSTEM_AUDIT_VIEW: 'system.audit.view',
};

export default {
    PermissionProvider,
    usePermissions,
    usePermission,
    useAnyPermission,
    useAllPermissions,
    usePermissionsMap,
    Can,
    Cannot,
    PERMISSIONS
};

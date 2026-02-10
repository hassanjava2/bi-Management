/**
 * BI ERP - Constants
 */

module.exports = {
    ROLES: {
        OWNER: 'owner',
        ADMIN: 'admin',
        MANAGER: 'manager',
        HR: 'hr',
        ACCOUNTANT: 'accountant',
        EMPLOYEE: 'employee',
    },
    SECURITY_LEVELS: {
        EMPLOYEE: 1,
        SUPERVISOR: 2,
        DEPT_MANAGER: 3,
        HR_ACCOUNTANT: 4,
        ADMIN: 5,
    },
    AUDIT_ACTIONS: {
        CREATE: 'CREATE',
        READ: 'READ',
        UPDATE: 'UPDATE',
        DELETE: 'DELETE',
        LOGIN: 'LOGIN',
        LOGOUT: 'LOGOUT',
        LOGIN_FAILED: 'LOGIN_FAILED',
        PERMISSION_DENIED: 'PERMISSION_DENIED',
    },
};

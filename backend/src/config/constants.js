/**
 * BI Management - Constants
 * ثوابت النظام
 */

module.exports = {
    // User Roles
    ROLES: {
        OWNER: 'owner',
        ADMIN: 'admin',
        MANAGER: 'manager',
        HR: 'hr',
        ACCOUNTANT: 'accountant',
        EMPLOYEE: 'employee'
    },

    // Security Levels
    SECURITY_LEVELS: {
        EMPLOYEE: 1,      // موظف عادي
        SUPERVISOR: 2,    // مشرف
        DEPT_MANAGER: 3,  // مدير قسم
        HR_ACCOUNTANT: 4, // HR/محاسب
        ADMIN: 5          // مدير عام
    },

    // Task Status
    TASK_STATUS: {
        PENDING: 'pending',
        IN_PROGRESS: 'in_progress',
        COMPLETED: 'completed',
        CANCELLED: 'cancelled',
        OVERDUE: 'overdue',
        BLOCKED: 'blocked'
    },

    // Task Priority
    TASK_PRIORITY: {
        URGENT: 'urgent',
        HIGH: 'high',
        MEDIUM: 'medium',
        LOW: 'low'
    },

    // Task Source
    TASK_SOURCE: {
        MANUAL: 'manual',
        AI_CAMERA: 'ai_camera',
        AI_INVOICE: 'ai_invoice',
        AI_CHAT: 'ai_chat',
        SYSTEM: 'system',
        RECURRING: 'recurring',
        ERP: 'erp',
        STORE: 'store'
    },

    // Attendance Status
    ATTENDANCE_STATUS: {
        PRESENT: 'present',
        ABSENT: 'absent',
        LATE: 'late',
        EARLY_LEAVE: 'early_leave',
        VACATION: 'vacation',
        SICK: 'sick',
        REMOTE: 'remote'
    },

    // Notification Types
    NOTIFICATION_TYPES: {
        INFO: 'info',
        TASK: 'task',
        REMINDER: 'reminder',
        ALERT: 'alert',
        URGENT: 'urgent',
        WARNING: 'warning',
        SUCCESS: 'success'
    },

    // Sensitive Tables (require high security level)
    SENSITIVE_TABLES: [
        'payroll',
        'salary_encrypted',
        'purchase_prices'
    ],

    // Audit Actions
    AUDIT_ACTIONS: {
        CREATE: 'CREATE',
        READ: 'READ',
        UPDATE: 'UPDATE',
        DELETE: 'DELETE',
        LOGIN: 'LOGIN',
        LOGOUT: 'LOGOUT',
        LOGIN_FAILED: 'LOGIN_FAILED',
        PERMISSION_DENIED: 'PERMISSION_DENIED',
        VIEW_SENSITIVE: 'VIEW_SENSITIVE'
    }
};

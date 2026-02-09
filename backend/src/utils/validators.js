/**
 * BI Management - Validation Schemas
 * استخدام Joi للتحقق من المدخلات
 */

const Joi = require('joi');

// User Schemas
const userSchemas = {
    create: Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().min(8).required(),
        full_name: Joi.string().min(2).max(255).required(),
        phone: Joi.string().pattern(/^[0-9]{10,15}$/),
        department_id: Joi.string(),
        position_id: Joi.string(),
        role: Joi.string().valid('admin', 'manager', 'hr', 'accountant', 'employee'),
        security_level: Joi.number().min(1).max(5),
        salary: Joi.number().min(0),
        hire_date: Joi.date()
    }),

    update: Joi.object({
        full_name: Joi.string().min(2).max(255),
        phone: Joi.string().pattern(/^[0-9]{10,15}$/),
        department_id: Joi.string(),
        position_id: Joi.string(),
        role: Joi.string().valid('admin', 'manager', 'hr', 'accountant', 'employee'),
        security_level: Joi.number().min(1).max(5),
        is_active: Joi.boolean()
    }),

    login: Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().required()
    }),

    changePassword: Joi.object({
        current_password: Joi.string().required(),
        new_password: Joi.string().min(8).required()
    })
};

// Task Schemas
const taskSchemas = {
    create: Joi.object({
        title: Joi.string().min(3).max(255).required(),
        description: Joi.string().max(2000),
        assigned_to: Joi.string(),
        department_id: Joi.string(),
        priority: Joi.string().valid('urgent', 'high', 'medium', 'low').default('medium'),
        category: Joi.string(),
        source: Joi.string().valid('manual', 'ai_camera', 'ai_invoice', 'ai_chat', 'system', 'recurring', 'erp', 'store'),
        source_reference: Joi.object(),
        due_date: Joi.date(),
        estimated_minutes: Joi.number().min(0)
    }),

    update: Joi.object({
        title: Joi.string().min(3).max(255),
        description: Joi.string().max(2000),
        assigned_to: Joi.string(),
        priority: Joi.string().valid('urgent', 'high', 'medium', 'low'),
        category: Joi.string(),
        due_date: Joi.date(),
        estimated_minutes: Joi.number().min(0)
    }),

    updateStatus: Joi.object({
        status: Joi.string().valid('pending', 'in_progress', 'completed', 'cancelled', 'blocked').required(),
        delay_reason: Joi.string().when('status', {
            is: 'blocked',
            then: Joi.string().required()
        })
    }),

    comment: Joi.object({
        comment: Joi.string().min(1).max(1000).required()
    })
};

// Attendance Schemas
const attendanceSchemas = {
    checkIn: Joi.object({
        location: Joi.object({
            lat: Joi.number(),
            lng: Joi.number(),
            address: Joi.string()
        }),
        method: Joi.string().valid('app', 'web', 'manual', 'biometric', 'camera')
    }),

    checkOut: Joi.object({
        location: Joi.object({
            lat: Joi.number(),
            lng: Joi.number(),
            address: Joi.string()
        }),
        method: Joi.string().valid('app', 'web', 'manual', 'biometric', 'camera')
    }),

    manual: Joi.object({
        user_id: Joi.string().required(),
        date: Joi.date().required(),
        check_in: Joi.string(),
        check_out: Joi.string(),
        status: Joi.string().valid('present', 'absent', 'late', 'vacation', 'sick'),
        notes: Joi.string()
    })
};

// Notification Schema
const notificationSchemas = {
    create: Joi.object({
        user_id: Joi.string().required(),
        title: Joi.string().required(),
        body: Joi.string().required(),
        type: Joi.string().valid('info', 'task', 'reminder', 'alert', 'urgent', 'warning', 'success'),
        data: Joi.object()
    })
};

module.exports = {
    userSchemas,
    taskSchemas,
    attendanceSchemas,
    notificationSchemas
};

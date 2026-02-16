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
        email: Joi.string().email({ tlds: false }).required(),
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

// Invoice Schemas
const invoiceSchemas = {
    create: Joi.object({
        type: Joi.string().valid('sale', 'purchase').required(),
        customer_id: Joi.alternatives().try(Joi.string(), Joi.number()).allow(null),
        supplier_id: Joi.alternatives().try(Joi.string(), Joi.number()).allow(null),
        payment_type: Joi.string().valid('cash', 'credit', 'installment').default('cash'),
        currency: Joi.string().valid('IQD', 'USD').default('IQD'),
        discount: Joi.number().min(0).default(0),
        discount_type: Joi.string().valid('fixed', 'percent').default('fixed'),
        tax: Joi.number().min(0).default(0),
        notes: Joi.string().max(1000).allow('', null),
        items: Joi.array().items(Joi.object({
            product_id: Joi.alternatives().try(Joi.string(), Joi.number()).required(),
            quantity: Joi.number().min(0.01).required(),
            price: Joi.number().min(0).required(),
            discount: Joi.number().min(0).default(0),
        })).min(1).required(),
        rep_id: Joi.alternatives().try(Joi.string(), Joi.number()).allow(null),
    }),

    update: Joi.object({
        payment_type: Joi.string().valid('cash', 'credit', 'installment'),
        payment_status: Joi.string().valid('pending', 'partial', 'paid'),
        discount: Joi.number().min(0),
        discount_type: Joi.string().valid('fixed', 'percent'),
        tax: Joi.number().min(0),
        notes: Joi.string().max(1000).allow('', null),
    }),
};

// Customer Schemas
const customerSchemas = {
    create: Joi.object({
        name: Joi.string().min(2).max(255).required(),
        phone: Joi.string().max(20).allow('', null),
        phone2: Joi.string().max(20).allow('', null),
        email: Joi.string().email().allow('', null),
        address: Joi.string().max(500).allow('', null),
        city: Joi.string().max(100).allow('', null),
        type: Joi.string().valid('individual', 'company').default('individual'),
        credit_limit: Joi.number().min(0).default(0),
        notes: Joi.string().max(500).allow('', null),
    }),

    update: Joi.object({
        name: Joi.string().min(2).max(255),
        phone: Joi.string().max(20).allow('', null),
        phone2: Joi.string().max(20).allow('', null),
        email: Joi.string().email().allow('', null),
        address: Joi.string().max(500).allow('', null),
        city: Joi.string().max(100).allow('', null),
        type: Joi.string().valid('individual', 'company'),
        credit_limit: Joi.number().min(0),
        notes: Joi.string().max(500).allow('', null),
    }),
};

// Supplier Schemas
const supplierSchemas = {
    create: Joi.object({
        name: Joi.string().min(2).max(255).required(),
        phone: Joi.string().max(20).allow('', null),
        email: Joi.string().email().allow('', null),
        address: Joi.string().max(500).allow('', null),
        contact_person: Joi.string().max(255).allow('', null),
        notes: Joi.string().max(500).allow('', null),
    }),

    update: Joi.object({
        name: Joi.string().min(2).max(255),
        phone: Joi.string().max(20).allow('', null),
        email: Joi.string().email().allow('', null),
        address: Joi.string().max(500).allow('', null),
        contact_person: Joi.string().max(255).allow('', null),
        notes: Joi.string().max(500).allow('', null),
    }),
};

// Common Schemas
const commonSchemas = {
    pagination: Joi.object({
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(100).default(20),
        search: Joi.string().max(255).allow('', null),
        sort: Joi.string().max(50).allow('', null),
        order: Joi.string().valid('asc', 'desc').default('desc'),
    }),

    idParam: Joi.object({
        id: Joi.alternatives().try(
            Joi.string().uuid(),
            Joi.number().integer().positive()
        ).required(),
    }),

    dateRange: Joi.object({
        from: Joi.date().allow('', null),
        to: Joi.date().allow('', null),
        month: Joi.string().pattern(/^\d{4}-\d{2}$/).allow('', null),
    }),
};

module.exports = {
    userSchemas,
    taskSchemas,
    attendanceSchemas,
    notificationSchemas,
    invoiceSchemas,
    customerSchemas,
    supplierSchemas,
    commonSchemas,
};

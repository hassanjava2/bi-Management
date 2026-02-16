/**
 * BI Management - AI Task Service
 * خدمة إنشاء المهام بالذكاء الاصطناعي
 */

const { aiService } = require('./ai.service');
const taskService = require('./task.service');
const notificationService = require('./notification.service');
const { run, get, all } = require('../config/database');
const { generateId, now } = require('../utils/helpers');
const logger = require('../utils/logger');

/**
 * معالجة مشكلة المستخدم وإنشاء مهمة
 */
async function processUserProblem(userId, conversationId, description) {
    try {
        // 1. تحليل المشكلة بـ AI
        const taskSuggestion = await aiService.createTaskFromDescription(description, {
            user_id: userId,
            conversation_id: conversationId
        });

        // 2. تحديد القسم المسؤول
        const department = determineDepartment(taskSuggestion.suggested_department, description);

        // 3. اقتراح موظف
        const assignee = await aiService.suggestAssignee(taskSuggestion, department?.id);

        // 4. إعداد المهمة
        const task = {
            title: taskSuggestion.title,
            description: taskSuggestion.description,
            priority: taskSuggestion.priority || 'medium',
            status: 'pending',
            created_by: userId,
            assigned_to: assignee?.employee_id || null,
            department_id: department?.id || null,
            due_date: calculateDueDate(taskSuggestion.priority),
            estimated_minutes: taskSuggestion.estimated_minutes || 60,
            source: 'ai_chat',
            conversation_id: conversationId,
            tags: JSON.stringify(taskSuggestion.tags || [])
        };

        return {
            suggested_task: task,
            assignee_suggestion: assignee,
            department: department,
            requires_confirmation: true
        };

    } catch (error) {
        logger.error('[AI Task Service] Error:', error.message);
        throw error;
    }
}

/**
 * تأكيد وإنشاء المهمة
 */
async function confirmAndCreateTask(userId, taskData) {
    try {
        // إنشاء المهمة
        const task = await taskService.createTask({
            ...taskData,
            created_by: userId
        });

        // إشعار المسؤول
        if (task.assigned_to) {
            notificationService.create({
                user_id: task.assigned_to,
                title: 'مهمة جديدة من AI',
                body: `تم إنشاء مهمة جديدة: ${task.title}`,
                type: 'task',
                data: { task_id: task.id, source: 'ai' }
            });
        }

        // إشعار مدير القسم
        if (task.department_id) {
            const manager = await get(`
                SELECT id FROM users 
                WHERE department_id = ? AND role IN ('manager', 'admin')
                LIMIT 1
            `, [task.department_id]);

            if (manager && manager.id !== task.assigned_to) {
                notificationService.create({
                    user_id: manager.id,
                    title: 'مهمة جديدة في قسمك',
                    body: `تم إنشاء مهمة: ${task.title}`,
                    type: 'info',
                    data: { task_id: task.id }
                });
            }
        }

        return task;
    } catch (error) {
        logger.error('[AI Task Service] Confirm error:', error.message);
        throw error;
    }
}

/**
 * إنشاء مهام التدريب للموظف الجديد
 */
async function createOnboardingTasks(newEmployeeId) {
    const employee = await get(`
        SELECT u.*, d.name as department_name 
        FROM users u 
        LEFT JOIN departments d ON u.department_id = d.id 
        WHERE u.id = ?
    `, [newEmployeeId]);

    if (!employee) return [];

    const onboardingTasks = [
        {
            title: 'التعرف على فريق العمل',
            description: 'قم بالتعرف على زملائك في القسم والأقسام الأخرى',
            priority: 'high',
            estimated_minutes: 60,
            day_offset: 0
        },
        {
            title: 'إعداد بيئة العمل',
            description: 'تأكد من إعداد حسابك، البريد الإلكتروني، والأدوات المطلوبة',
            priority: 'high',
            estimated_minutes: 120,
            day_offset: 0
        },
        {
            title: 'قراءة سياسات الشركة',
            description: 'اطلع على دليل الموظف وسياسات الشركة',
            priority: 'medium',
            estimated_minutes: 90,
            day_offset: 1
        },
        {
            title: 'التدريب على النظام',
            description: 'تعلم استخدام أنظمة الشركة الداخلية',
            priority: 'high',
            estimated_minutes: 180,
            day_offset: 2
        },
        {
            title: 'اجتماع مع المدير المباشر',
            description: 'حدد موعد اجتماع لمناقشة المهام والتوقعات',
            priority: 'high',
            estimated_minutes: 60,
            day_offset: 3
        }
    ];

    const createdTasks = [];

    for (const taskTemplate of onboardingTasks) {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + taskTemplate.day_offset);

        const task = await taskService.createTask({
            title: taskTemplate.title,
            description: taskTemplate.description,
            priority: taskTemplate.priority,
            assigned_to: newEmployeeId,
            due_date: dueDate.toISOString().split('T')[0],
            estimated_minutes: taskTemplate.estimated_minutes,
            created_by: 'system',
            source: 'onboarding',
            tags: JSON.stringify(['تدريب', 'موظف جديد'])
        });

        createdTasks.push(task);
    }

    // إشعار الموظف الجديد
    notificationService.create({
        user_id: newEmployeeId,
        title: 'أهلاً بك في الفريق!',
        body: `تم إنشاء ${createdTasks.length} مهام تدريبية لمساعدتك على البدء`,
        type: 'info',
        data: { onboarding: true, tasks_count: createdTasks.length }
    });

    return createdTasks;
}

/**
 * إنشاء مهام يومية عند تسجيل الدخول
 */
async function createDailyTasks(userId) {
    const today = new Date().toISOString().split('T')[0];
    
    // التحقق من وجود مهام اليوم
    const existingTasks = await all(`
        SELECT id FROM tasks 
        WHERE assigned_to = ? 
        AND date(due_date) = ? 
        AND status IN ('pending', 'in_progress')
    `, [userId, today]);

    if (existingTasks.length > 0) {
        return existingTasks;
    }

    // جلب المهام المتكررة
    const recurringTasks = await all(`
        SELECT * FROM task_templates 
        WHERE (user_id = ? OR user_id IS NULL)
        AND is_active = 1
        AND (
            recurrence = 'daily'
            OR (recurrence = 'weekly' AND EXTRACT(DOW FROM CURRENT_DATE)::integer = day_of_week)
            OR (recurrence = 'monthly' AND EXTRACT(DAY FROM CURRENT_DATE)::integer = day_of_month)
        )
    `, [userId]);

    const createdTasks = [];

    for (const template of recurringTasks) {
        const task = await taskService.createTask({
            title: template.title,
            description: template.description,
            priority: template.priority,
            assigned_to: userId,
            due_date: today,
            estimated_minutes: template.estimated_minutes,
            created_by: 'system',
            source: 'recurring',
            template_id: template.id
        });
        createdTasks.push(task);
    }

    return createdTasks;
}

/**
 * إنشاء مهمة من فاتورة
 */
async function createTaskFromInvoice(invoice, assignTo = null) {
    const description = `معالجة الفاتورة رقم ${invoice.number}\n` +
        `المورد/العميل: ${invoice.party_name}\n` +
        `المبلغ: ${invoice.total}\n` +
        `النوع: ${invoice.type === 'purchase' ? 'شراء' : 'بيع'}`;

    // تحديد المسؤول حسب نوع الفاتورة
    let department = null;
    if (invoice.type === 'purchase') {
        department = await get(`SELECT id FROM departments WHERE name_en = 'Inventory' OR name LIKE '%مخازن%'`);
    } else {
        department = await get(`SELECT id FROM departments WHERE name_en = 'Sales' OR name LIKE '%مبيعات%'`);
    }

    const taskData = {
        title: `معالجة فاتورة ${invoice.number}`,
        description,
        priority: invoice.total > 1000000 ? 'high' : 'medium',
        assigned_to: assignTo,
        department_id: department?.id,
        due_date: new Date().toISOString().split('T')[0],
        estimated_minutes: 30,
        created_by: 'system',
        source: 'invoice',
        reference_type: 'invoice',
        reference_id: invoice.id
    };

    // إذا لم يحدد مسؤول، اقترح واحد
    if (!assignTo && department) {
        const suggestion = await aiService.suggestAssignee(taskData, department.id);
        if (suggestion) {
            taskData.assigned_to = suggestion.employee_id;
        }
    }

    const task = await taskService.createTask(taskData);

    if (task.assigned_to) {
        notificationService.create({
            user_id: task.assigned_to,
            title: 'فاتورة جديدة تحتاج معالجة',
            body: `فاتورة ${invoice.number} بمبلغ ${invoice.total}`,
            type: 'task',
            data: { task_id: task.id, invoice_id: invoice.id }
        });
    }

    return task;
}

/**
 * تحديد القسم المناسب
 */
async function determineDepartment(suggestedCode, description) {
    const descLower = description.toLowerCase();
    
    const departmentKeywords = {
        'IT': ['كمبيوتر', 'طابعة', 'انترنت', 'شبكة', 'برنامج', 'تقني', 'computer', 'printer', 'network'],
        'HR': ['إجازة', 'راتب', 'موظف', 'توظيف', 'vacation', 'salary', 'employee'],
        'Accounting': ['فاتورة', 'دفع', 'حساب', 'مالي', 'invoice', 'payment', 'financial'],
        'Sales': ['عميل', 'بيع', 'طلب', 'customer', 'sale', 'order'],
        'Inventory': ['مخزن', 'منتج', 'استلام', 'stock', 'product', 'warehouse'],
        'Maintenance': ['صيانة', 'تصليح', 'عطل', 'repair', 'maintenance', 'broken']
    };

    // أولاً: استخدم اقتراح AI
    if (suggestedCode) {
        const dept = await get(`SELECT id, name, name_en FROM departments WHERE name_en = ? OR name LIKE ?`, 
            [suggestedCode, `%${suggestedCode}%`]);
        if (dept) return dept;
    }

    // ثانياً: تحليل الكلمات المفتاحية
    for (const [deptName, keywords] of Object.entries(departmentKeywords)) {
        for (const keyword of keywords) {
            if (descLower.includes(keyword)) {
                const dept = await get(`SELECT id, name, name_en FROM departments WHERE name_en = ? OR name LIKE ?`, 
                    [deptName, `%${deptName}%`]);
                if (dept) return dept;
            }
        }
    }

    return null;
}

/**
 * حساب تاريخ الاستحقاق
 */
function calculateDueDate(priority) {
    const date = new Date();
    
    switch (priority) {
        case 'urgent':
            // نفس اليوم
            break;
        case 'high':
            date.setDate(date.getDate() + 1);
            break;
        case 'medium':
            date.setDate(date.getDate() + 3);
            break;
        case 'low':
            date.setDate(date.getDate() + 7);
            break;
        default:
            date.setDate(date.getDate() + 3);
    }
    
    return date.toISOString().split('T')[0];
}

module.exports = {
    processUserProblem,
    confirmAndCreateTask,
    createOnboardingTasks,
    createDailyTasks,
    createTaskFromInvoice
};

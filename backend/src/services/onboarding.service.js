/**
 * BI Management - Onboarding Service
 * خدمة تدريب الموظفين الجدد
 */

const { run, get, all } = require('../config/database');
const { generateId, now, addDays, today } = require('../utils/helpers');
const notificationService = require('./notification.service');
const taskService = require('./task.service');

// Lazy load to avoid circular dependencies
let aiService = null;
let goalsService = null;

function getAIService() {
    if (!aiService) {
        aiService = require('./ai.service');
    }
    return aiService;
}

function getGoalsService() {
    if (!goalsService) {
        goalsService = require('./goals.service').goalsService;
    }
    return goalsService;
}

class OnboardingService {
    /**
     * بدء عملية التدريب لموظف جديد
     */
    async startOnboarding(employeeId) {
        // 1. جلب معلومات الموظف
        const employee = await get(`
            SELECT u.*, p.name as position_name, p.id as position_id,
                   d.name as department_name
            FROM users u
            LEFT JOIN positions p ON u.position_id = p.id
            LEFT JOIN departments d ON u.department_id = d.id
            WHERE u.id = ?
        `, [employeeId]);

        if (!employee) {
            throw new Error('الموظف غير موجود');
        }

        // 2. التحقق من عدم وجود تدريب سابق
        const existingTraining = await get(`
            SELECT id FROM employee_training 
            WHERE employee_id = ? AND status != 'completed'
        `, [employeeId]);

        if (existingTraining) {
            return { 
                message: 'الموظف لديه تدريب قائم بالفعل',
                training_id: existingTraining.id
            };
        }

        // 3. جلب خطة التدريب حسب المنصب
        let plan = await this.getTrainingPlan(employee.position_id);
        
        // إذا لا توجد خطة للمنصب، استخدم الخطة الافتراضية
        if (!plan) {
            plan = await this.getDefaultPlan();
        }

        // 4. إنشاء سجل التدريب
        const trainingId = generateId();
        const startDate = now();

        await run(`
            INSERT INTO employee_training (
                id, employee_id, plan_id, started_at, progress, current_day, status
            ) VALUES (?, ?, ?, ?, 0, 1, 'in_progress')
        `, [trainingId, employeeId, plan.id, startDate]);

        // 5. إنشاء Tasks التدريب
        await this.createTrainingTasks(employeeId, trainingId, plan);

        // 6. إرسال رسالة ترحيب
        await this.sendWelcomeMessage(employee, plan);

        // 7. إشعار HR
        await this.notifyHR(employee, 'new_trainee');

        return {
            success: true,
            training_id: trainingId,
            plan: plan,
            message: `تم بدء تدريب ${employee.full_name}`
        };
    }

    /**
     * جلب خطة التدريب حسب المنصب
     */
    async getTrainingPlan(positionId) {
        if (!positionId) return null;

        const plan = await get(`
            SELECT * FROM training_plans 
            WHERE position_id = ? AND is_active = 1
        `, [positionId]);

        if (plan && plan.tasks) {
            plan.tasks = JSON.parse(plan.tasks);
        }

        return plan;
    }

    /**
     * الخطة الافتراضية للتدريب
     */
    async getDefaultPlan() {
        let plan = await get(`
            SELECT * FROM training_plans 
            WHERE position_id IS NULL AND is_active = 1
            LIMIT 1
        `);

        if (!plan) {
            // إنشاء خطة افتراضية
            plan = this.createDefaultPlan();
        }

        if (plan.tasks && typeof plan.tasks === 'string') {
            plan.tasks = JSON.parse(plan.tasks);
        }

        return plan;
    }

    /**
     * إنشاء خطة تدريب افتراضية
     */
    async createDefaultPlan() {
        const planId = generateId();
        const tasks = [
            { day: 1, title: 'التعرف على الشركة', description: 'مقدمة عن شركة BI وتاريخها ورؤيتها', type: 'video' },
            { day: 1, title: 'جولة في المكتب', description: 'التعرف على الأقسام والزملاء', type: 'task' },
            { day: 2, title: 'نظام العمل', description: 'التعرف على ساعات العمل وسياسات الحضور', type: 'reading' },
            { day: 2, title: 'الأدوات والبرامج', description: 'تعلم استخدام أنظمة الشركة', type: 'task' },
            { day: 3, title: 'مهام القسم', description: 'فهم مهام قسمك ودورك', type: 'reading' },
            { day: 3, title: 'اختبار قصير', description: 'اختبار على ما تعلمته', type: 'quiz' },
            { day: 4, title: 'العمل مع الفريق', description: 'بدء العمل مع أعضاء الفريق', type: 'task' },
            { day: 5, title: 'المهمة الأولى', description: 'إنجاز أول مهمة حقيقية', type: 'task' },
            { day: 5, title: 'تقييم الأسبوع', description: 'جلسة مع المدير المباشر', type: 'meeting' },
            { day: 7, title: 'اختبار نهائي', description: 'اختبار شامل للتدريب', type: 'quiz' },
        ];

        await run(`
            INSERT INTO training_plans (id, name, description, duration_days, tasks, is_active)
            VALUES (?, ?, ?, ?, ?, 1)
        `, [
            planId,
            'خطة التدريب الأساسية',
            'خطة تدريب عامة لجميع الموظفين الجدد',
            7,
            JSON.stringify(tasks)
        ]);

        return {
            id: planId,
            name: 'خطة التدريب الأساسية',
            description: 'خطة تدريب عامة لجميع الموظفين الجدد',
            duration_days: 7,
            tasks: tasks
        };
    }

    /**
     * إنشاء Tasks التدريب
     */
    async createTrainingTasks(employeeId, trainingId, plan) {
        const tasks = plan.tasks || [];
        
        for (let i = 0; i < tasks.length; i++) {
            const task = tasks[i];
            const dueDate = addDays(today(), task.day);

            // إنشاء task
            const taskId = generateId();
            await run(`
                INSERT INTO tasks (
                    id, title, description, assigned_to, 
                    priority, status, category, due_date,
                    source, source_reference
                ) VALUES (?, ?, ?, ?, 'medium', 'pending', 'training', ?, 'onboarding', ?)
            `, [
                taskId,
                `[تدريب] ${task.title}`,
                task.description,
                employeeId,
                dueDate,
                JSON.stringify({ training_id: trainingId, task_index: i, type: task.type })
            ]);

            // تسجيل في training_progress
            await run(`
                INSERT INTO training_progress (id, training_id, task_index, completed)
                VALUES (?, ?, ?, 0)
            `, [generateId(), trainingId, i]);
        }
    }

    /**
     * إرسال رسالة ترحيب
     */
    async sendWelcomeMessage(employee, plan) {
        // إشعار ترحيب
        notificationService.create({
            user_id: employee.id,
            title: 'مرحباً بك في عائلة BI! 🎉',
            body: `أهلاً ${employee.full_name}! نحن سعداء بانضمامك. تدريبك يبدأ اليوم ويستمر ${plan.duration_days} أيام.`,
            type: 'success',
            data: { type: 'welcome', training_id: plan.id }
        });

        // رسالة AI ترحيبية
        try {
            const ai = getAIService();
            await ai.sendWelcomeMessage(employee.id, employee.full_name, employee.position_name);
        } catch (e) {
            console.error('[Onboarding] AI welcome message failed:', e.message);
        }
    }

    /**
     * إشعار HR
     */
    async notifyHR(employee, eventType) {
        const hrUsers = await all(`SELECT id FROM users WHERE role IN ('hr', 'admin')`);
        
        let title, body;
        
        switch (eventType) {
            case 'new_trainee':
                title = 'موظف جديد بدأ التدريب';
                body = `${employee.full_name} (${employee.position_name || 'غير محدد'}) بدأ تدريبه اليوم`;
                break;
            case 'training_complete':
                title = 'موظف أكمل التدريب';
                body = `${employee.full_name} أكمل برنامج التدريب بنجاح!`;
                break;
            case 'training_delayed':
                title = 'تنبيه: تأخر في التدريب';
                body = `${employee.full_name} متأخر في برنامج التدريب`;
                break;
            default:
                return;
        }

        for (const hr of hrUsers) {
            notificationService.create({
                user_id: hr.id,
                title,
                body,
                type: eventType === 'training_delayed' ? 'warning' : 'info',
                data: { employee_id: employee.id, event: eventType }
            });
        }
    }

    /**
     * فحص تقدم الموظف
     */
    async checkProgress(employeeId) {
        const training = await get(`
            SELECT et.*, tp.name as plan_name, tp.duration_days, tp.tasks
            FROM employee_training et
            JOIN training_plans tp ON et.plan_id = tp.id
            WHERE et.employee_id = ? AND et.status = 'in_progress'
        `, [employeeId]);

        if (!training) {
            return { in_training: false };
        }

        // حساب التقدم
        const progress = await all(`
            SELECT * FROM training_progress 
            WHERE training_id = ?
            ORDER BY task_index
        `, [training.id]);

        const completedTasks = progress.filter(p => p.completed).length;
        const totalTasks = progress.length;
        const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        // تحديث نسبة التقدم
        await run(`UPDATE employee_training SET progress = ? WHERE id = ?`, [progressPercent, training.id]);

        // حساب اليوم الحالي
        const startDate = new Date(training.started_at);
        const currentDay = Math.floor((Date.now() - startDate) / (1000 * 60 * 60 * 24)) + 1;

        return {
            in_training: true,
            training_id: training.id,
            plan_name: training.plan_name,
            started_at: training.started_at,
            current_day: Math.min(currentDay, training.duration_days),
            duration_days: training.duration_days,
            progress: progressPercent,
            completed_tasks: completedTasks,
            total_tasks: totalTasks,
            tasks: progress.map((p, i) => {
                const planTasks = JSON.parse(training.tasks || '[]');
                return {
                    ...p,
                    ...planTasks[i]
                };
            })
        };
    }

    /**
     * إكمال مهمة تدريب
     */
    async completeTrainingTask(employeeId, taskIndex, score = null, notes = null) {
        const training = await get(`
            SELECT et.*, tp.tasks
            FROM employee_training et
            JOIN training_plans tp ON et.plan_id = tp.id
            WHERE et.employee_id = ? AND et.status = 'in_progress'
        `, [employeeId]);

        if (!training) {
            throw new Error('لا يوجد تدريب نشط');
        }

        // تحديث التقدم
        await run(`
            UPDATE training_progress 
            SET completed = 1, completed_at = CURRENT_TIMESTAMP, score = ?, notes = ?
            WHERE training_id = ? AND task_index = ?
        `, [score, notes, training.id, taskIndex]);

        // تحديث المهمة المرتبطة
        await run(`
            UPDATE tasks SET status = 'completed', completed_at = CURRENT_TIMESTAMP
            WHERE assigned_to = ? AND source = 'onboarding' 
            AND source_reference LIKE ?
        `, [employeeId, `%"task_index":${taskIndex}%`]);

        // منح نقاط
        try {
            const goals = getGoalsService();
            goals.awardPoints(employeeId, 'training_completed');
        } catch (e) {
            console.error('[Onboarding] Points award failed:', e.message);
        }

        // فحص إذا أكمل كل المهام
        const progress = await this.checkProgress(employeeId);
        
        if (progress.progress === 100) {
            await this.completeTraining(employeeId, training.id);
        } else {
            // إرسال تشجيع
            const tasks = JSON.parse(training.tasks || '[]');
            const completedTask = tasks[taskIndex];
            
            notificationService.create({
                user_id: employeeId,
                title: 'أحسنت! 🌟',
                body: `أكملت "${completedTask?.title || 'المهمة'}" بنجاح!`,
                type: 'success',
                data: { type: 'training_progress', task_index: taskIndex }
            });
        }

        return progress;
    }

    /**
     * إكمال التدريب
     */
    async completeTraining(employeeId, trainingId) {
        await run(`
            UPDATE employee_training 
            SET status = 'completed', completed_at = CURRENT_TIMESTAMP, progress = 100
            WHERE id = ?
        `, [trainingId]);

        const employee = await get(`SELECT * FROM users WHERE id = ?`, [employeeId]);

        // إشعار الموظف
        notificationService.create({
            user_id: employeeId,
            title: 'مبروك! أكملت التدريب 🎓',
            body: 'أنت الآن جاهز للعمل بشكل كامل. نتمنى لك التوفيق!',
            type: 'success',
            data: { type: 'training_complete' }
        });

        // منح نقاط إضافية
        try {
            const goals = getGoalsService();
            goals.awardPoints(employeeId, 'new_skill_acquired', 50);
        } catch (e) {
            console.error('[Onboarding] Completion points failed:', e.message);
        }

        // إشعار HR
        await this.notifyHR(employee, 'training_complete');
    }

    /**
     * جلب تدريب موظف
     */
    async getEmployeeTraining(employeeId) {
        return await get(`
            SELECT et.*, tp.name as plan_name, tp.duration_days, tp.tasks
            FROM employee_training et
            JOIN training_plans tp ON et.plan_id = tp.id
            WHERE et.employee_id = ? 
            ORDER BY et.started_at DESC
            LIMIT 1
        `, [employeeId]);
    }

    /**
     * تذكير يومي للتدريب
     */
    async sendDailyTrainingReminder(employeeId) {
        const progress = await this.checkProgress(employeeId);
        
        if (!progress.in_training) return;

        const todayTasks = progress.tasks.filter(t => t.day === progress.current_day && !t.completed);

        if (todayTasks.length > 0) {
            notificationService.create({
                user_id: employeeId,
                title: `يوم ${progress.current_day} من التدريب`,
                body: `مهام اليوم: ${todayTasks.map(t => t.title).join('، ')}`,
                type: 'reminder',
                data: { type: 'daily_training', day: progress.current_day }
            });
        }
    }

    /**
     * تقرير التدريب للـ HR
     */
    async getTrainingReport() {
        const activeTrainings = await all(`
            SELECT et.*, u.full_name, u.email, p.name as position_name,
                   tp.name as plan_name, tp.duration_days
            FROM employee_training et
            JOIN users u ON et.employee_id = u.id
            JOIN training_plans tp ON et.plan_id = tp.id
            LEFT JOIN positions p ON u.position_id = p.id
            WHERE et.status = 'in_progress'
            ORDER BY et.started_at DESC
        `);

        const completedThisMonth = await get(`
            SELECT COUNT(*) as count
            FROM employee_training 
            WHERE status = 'completed' 
            AND completed_at >= CURRENT_TIMESTAMP - INTERVAL '30 days'
        `);

        // تحديد المتأخرين
        const delayed = activeTrainings.filter(t => {
            const startDate = new Date(t.started_at);
            const expectedDay = Math.floor((Date.now() - startDate) / (1000 * 60 * 60 * 24)) + 1;
            const expectedProgress = Math.min(100, Math.round((expectedDay / t.duration_days) * 100));
            return t.progress < expectedProgress - 20; // متأخر أكثر من 20%
        });

        return {
            active_trainings: activeTrainings.length,
            completed_this_month: completedThisMonth?.count || 0,
            delayed_count: delayed.length,
            trainees: activeTrainings.map(t => ({
                ...t,
                is_delayed: delayed.some(d => d.id === t.id)
            }))
        };
    }

    /**
     * إنشاء خطة تدريب جديدة
     */
    async createTrainingPlan(data) {
        const id = generateId();

        await run(`
            INSERT INTO training_plans (id, position_id, name, description, duration_days, tasks, is_active)
            VALUES (?, ?, ?, ?, ?, ?, 1)
        `, [
            id,
            data.position_id,
            data.name,
            data.description,
            data.duration_days,
            JSON.stringify(data.tasks || [])
        ]);

        return await get(`SELECT * FROM training_plans WHERE id = ?`, [id]);
    }

    /**
     * قائمة خطط التدريب
     */
    async listTrainingPlans() {
        return await all(`
            SELECT tp.*, p.name as position_name
            FROM training_plans tp
            LEFT JOIN positions p ON tp.position_id = p.id
            WHERE tp.is_active = 1
            ORDER BY tp.created_at DESC
        `);
    }
}

// Singleton
const onboardingService = new OnboardingService();

module.exports = { OnboardingService, onboardingService };

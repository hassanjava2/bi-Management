/**
 * BI Management - AI Service
 * خدمة الاتصال بمحرك الذكاء الاصطناعي
 */

const AI_ENGINE_URL = process.env.AI_ENGINE_URL || 'http://localhost:8000';

class AIService {
    constructor() {
        this.baseUrl = AI_ENGINE_URL;
    }

    /**
     * إرسال رسالة للمساعد الذكي
     */
    async chat(userId, message, userInfo = {}, conversationId = null) {
        try {
            // Encode userInfo as base64 to avoid ASCII-only header limitation
            const userInfoEncoded = Buffer.from(JSON.stringify(userInfo)).toString('base64');
            
            const response = await fetch(`${this.baseUrl}/api/ai/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-User-Info': userInfoEncoded
                },
                body: JSON.stringify({
                    user_id: userId,
                    message: message,
                    conversation_id: conversationId,
                    user_info: userInfo  // Also send in body as backup
                })
            });

            if (!response.ok) {
                throw new Error(`AI Engine error: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('[AI Service] Chat error:', error.message);
            
            // Fallback response
            return {
                response: 'عذراً، خدمة الذكاء الاصطناعي غير متوفرة حالياً. يرجى المحاولة لاحقاً.',
                conversation_id: conversationId || 'fallback',
                suggestions: ['المحاولة مرة أخرى', 'التواصل مع الدعم الفني'],
                blocked: false,
                error: error.message
            };
        }
    }

    /**
     * تحليل نص باستخدام AI
     */
    async analyze(text, type = 'general') {
        try {
            const response = await fetch(`${this.baseUrl}/api/ai/analysis/text`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, analysis_type: type })
            });

            if (!response.ok) {
                throw new Error(`AI Analysis error: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('[AI Service] Analysis error:', error.message);
            return { error: error.message };
        }
    }

    /**
     * توليد مهمة من وصف (يستدعي محرك Python /api/ai/tasks/create)
     */
    async generateTask(description, context = {}) {
        try {
            const response = await fetch(`${this.baseUrl}/api/ai/tasks/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ description, context })
            });

            if (!response.ok) {
                throw new Error(`AI Task generation error: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('[AI Service] Task generation error:', error.message);
            return { error: error.message };
        }
    }

    /**
     * إنشاء مهمة من وصف (للاستخدام من processUserProblem)
     * يرجع نفس الشكل المتوقع: title, description, priority, suggested_department, estimated_minutes, tags, steps
     */
    async createTaskFromDescription(description, context = {}) {
        const result = await this.generateTask(description, context);
        if (result.error) throw new Error(result.error);
        return result;
    }

    /**
     * اقتراح تعيين مهمة لموظف (محرك Python)
     */
    async suggestAssignment(taskDescription, availableEmployees) {
        try {
            const response = await fetch(`${this.baseUrl}/api/ai/tasks/suggest-assignee`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    task: typeof taskDescription === 'object' ? taskDescription : { description: taskDescription },
                    available_employees: availableEmployees
                })
            });

            if (!response.ok) {
                throw new Error(`AI Assignment suggestion error: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('[AI Service] Assignment suggestion error:', error.message);
            return { error: error.message };
        }
    }

    /**
     * اقتراح موظف لمهمة (يستخدم suggestAssignment مع جلب الموظفين من النظام)
     */
    async suggestAssignee(task, departmentId) {
        const { all } = require('../config/database');
        const employees = await all(`
            SELECT u.id, u.department_id, u.full_name as full_name, d.name as department_name,
                   (SELECT COUNT(*) FROM tasks t WHERE t.assigned_to = u.id AND t.status NOT IN ('completed', 'cancelled')) as pending_tasks_count
            FROM users u
            LEFT JOIN departments d ON u.department_id = d.id
            WHERE u.is_active = 1
            ${departmentId ? ' AND (u.department_id = ? OR u.department_id IS NULL)' : ''}
        `, departmentId ? [departmentId] : []);
        const list = (employees || []).map((e) => ({
            id: e.id,
            full_name: e.full_name,
            department_code: e.department_id || e.department_name,
            pending_tasks_count: e.pending_tasks_count || 0
        }));
        const result = await this.suggestAssignment(task, list);
        const sug = result?.suggestion || result?.data?.suggestion;
        if (!sug) return null;
        return {
            employee_id: sug.employee_id || sug.id,
            employee_name: sug.employee_name || sug.full_name,
            reason: sug.reason,
            department: sug.department
        };
    }

    /**
     * تحليل أداء موظف
     */
    async analyzePerformance(employeeId, data) {
        try {
            const response = await fetch(`${this.baseUrl}/api/ai/analysis/performance`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    employee_id: employeeId,
                    ...data
                })
            });

            if (!response.ok) {
                throw new Error(`AI Performance analysis error: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('[AI Service] Performance analysis error:', error.message);
            return { error: error.message };
        }
    }

    /**
     * فحص صحة الخدمة
     */
    async healthCheck() {
        try {
            const response = await fetch(`${this.baseUrl}/health`, {
                method: 'GET',
                timeout: 5000
            });

            if (!response.ok) {
                return { status: 'unhealthy', error: `Status ${response.status}` };
            }

            return await response.json();
        } catch (error) {
            return { status: 'unavailable', error: error.message };
        }
    }
}

// Singleton
const aiService = new AIService();

module.exports = {
    AIService,
    aiService
};

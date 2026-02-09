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
     * توليد مهمة من وصف
     */
    async generateTask(description, context = {}) {
        try {
            const response = await fetch(`${this.baseUrl}/api/ai/tasks/generate`, {
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
     * اقتراح تعيين مهمة
     */
    async suggestAssignment(taskDescription, availableEmployees) {
        try {
            const response = await fetch(`${this.baseUrl}/api/ai/tasks/suggest-assignment`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    task_description: taskDescription,
                    employees: availableEmployees
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

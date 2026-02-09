/**
 * BI Management - Security Report Service
 * خدمة تقارير الأمان
 */

const { get, all } = require('../config/database');

class SecurityReportService {
    /**
     * تقرير يومي
     */
    async generateDailyReport(date = null) {
        const targetDate = date || new Date().toISOString().split('T')[0];

        const totalOperations = this._countOperations(targetDate);
        const failedLogins = this._countFailedLogins(targetDate);
        const successLogins = this._countSuccessLogins(targetDate);
        const sensitiveAccess = this._countSensitiveAccess(targetDate);
        const securityEvents = this._getSecurityEvents(targetDate);
        const topUsers = this._getTopActiveUsers(targetDate);
        const operationsByType = this._getOperationsByType(targetDate);

        return {
            date: targetDate,
            generated_at: new Date().toISOString(),
            summary: {
                total_operations: totalOperations,
                success_logins: successLogins,
                failed_logins: failedLogins,
                sensitive_access: sensitiveAccess,
                security_events: securityEvents.length
            },
            security_events: securityEvents,
            top_active_users: topUsers,
            operations_by_type: operationsByType,
            recommendations: this._generateRecommendations({
                failedLogins,
                sensitiveAccess,
                securityEvents
            })
        };
    }

    /**
     * تقرير أسبوعي
     */
    async generateWeeklyReport() {
        const days = 7;
        const dailyStats = [];

        for (let i = 0; i < days; i++) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];

            dailyStats.push({
                date: dateStr,
                operations: this._countOperations(dateStr),
                logins: this._countSuccessLogins(dateStr),
                failed_logins: this._countFailedLogins(dateStr)
            });
        }

        const securityEvents = all(`
            SELECT event_type, severity, COUNT(*) as count
            FROM security_events
            WHERE created_at >= datetime('now', '-7 days')
            GROUP BY event_type, severity
            ORDER BY count DESC
        `);

        const suspiciousUsers = this._getSuspiciousUsers(7);

        return {
            period: 'weekly',
            start_date: dailyStats[dailyStats.length - 1].date,
            end_date: dailyStats[0].date,
            daily_stats: dailyStats.reverse(),
            security_events_summary: securityEvents,
            suspicious_users: suspiciousUsers,
            total_security_events: securityEvents.reduce((sum, e) => sum + e.count, 0)
        };
    }

    /**
     * عدد العمليات
     */
    _countOperations(date) {
        const result = get(`
            SELECT COUNT(*) as count FROM audit_logs
            WHERE date(created_at) = ?
        `, [date]);
        return result?.count || 0;
    }

    /**
     * محاولات الدخول الفاشلة
     */
    _countFailedLogins(date) {
        const result = get(`
            SELECT COUNT(*) as count FROM audit_logs
            WHERE action = 'LOGIN_FAILED'
            AND date(created_at) = ?
        `, [date]);
        return result?.count || 0;
    }

    /**
     * تسجيلات الدخول الناجحة
     */
    _countSuccessLogins(date) {
        const result = get(`
            SELECT COUNT(*) as count FROM audit_logs
            WHERE action = 'LOGIN_SUCCESS'
            AND date(created_at) = ?
        `, [date]);
        return result?.count || 0;
    }

    /**
     * الوصول للبيانات الحساسة
     */
    _countSensitiveAccess(date) {
        const result = get(`
            SELECT COUNT(*) as count FROM audit_logs
            WHERE action = 'VIEW_SENSITIVE'
            AND date(created_at) = ?
        `, [date]);
        return result?.count || 0;
    }

    /**
     * أحداث الأمان
     */
    _getSecurityEvents(date) {
        return all(`
            SELECT se.*, u.full_name as user_name
            FROM security_events se
            LEFT JOIN users u ON se.user_id = u.id
            WHERE date(se.created_at) = ?
            ORDER BY se.created_at DESC
        `, [date]);
    }

    /**
     * أكثر المستخدمين نشاطاً
     */
    _getTopActiveUsers(date, limit = 10) {
        return all(`
            SELECT al.user_id, u.full_name, u.email, COUNT(*) as operations
            FROM audit_logs al
            LEFT JOIN users u ON al.user_id = u.id
            WHERE date(al.created_at) = ?
            AND al.user_id IS NOT NULL
            GROUP BY al.user_id
            ORDER BY operations DESC
            LIMIT ?
        `, [date, limit]);
    }

    /**
     * العمليات حسب النوع
     */
    _getOperationsByType(date) {
        return all(`
            SELECT action, COUNT(*) as count
            FROM audit_logs
            WHERE date(created_at) = ?
            GROUP BY action
            ORDER BY count DESC
        `, [date]);
    }

    /**
     * المستخدمين المشبوهين
     */
    _getSuspiciousUsers(days = 7) {
        return all(`
            SELECT se.user_id, u.full_name, u.email, 
                   COUNT(*) as event_count,
                   GROUP_CONCAT(DISTINCT se.event_type) as event_types
            FROM security_events se
            LEFT JOIN users u ON se.user_id = u.id
            WHERE se.created_at >= datetime('now', '-' || ? || ' days')
            AND se.severity IN ('warning', 'high', 'critical')
            GROUP BY se.user_id
            HAVING event_count >= 3
            ORDER BY event_count DESC
        `, [days]);
    }

    /**
     * توليد توصيات
     */
    _generateRecommendations(data) {
        const recommendations = [];

        if (data.failedLogins >= 10) {
            recommendations.push({
                type: 'security',
                priority: 'high',
                message: 'عدد كبير من محاولات الدخول الفاشلة. يُنصح بمراجعة الأمان.',
                action: 'مراجعة سياسة كلمات المرور وتفعيل القفل التلقائي'
            });
        }

        if (data.sensitiveAccess >= 50) {
            recommendations.push({
                type: 'access',
                priority: 'medium',
                message: 'وصول متكرر للبيانات الحساسة.',
                action: 'مراجعة صلاحيات المستخدمين'
            });
        }

        const criticalEvents = data.securityEvents.filter(e => e.severity === 'critical');
        if (criticalEvents.length > 0) {
            recommendations.push({
                type: 'critical',
                priority: 'critical',
                message: `${criticalEvents.length} أحداث أمنية حرجة تحتاج مراجعة فورية.`,
                action: 'مراجعة الأحداث الحرجة وحلها'
            });
        }

        if (recommendations.length === 0) {
            recommendations.push({
                type: 'info',
                priority: 'low',
                message: 'لا توجد مشاكل أمنية ملحوظة.',
                action: 'استمر في المراقبة الدورية'
            });
        }

        return recommendations;
    }

    /**
     * ملخص سريع للوحة التحكم
     */
    getDashboardStats() {
        const today = new Date().toISOString().split('T')[0];

        return {
            today: {
                operations: this._countOperations(today),
                logins: this._countSuccessLogins(today),
                failed_logins: this._countFailedLogins(today)
            },
            unresolved_events: get(`
                SELECT COUNT(*) as count FROM security_events
                WHERE resolved = 0
            `)?.count || 0,
            critical_events: get(`
                SELECT COUNT(*) as count FROM security_events
                WHERE severity = 'critical' AND resolved = 0
            `)?.count || 0
        };
    }
}

// Singleton
const securityReportService = new SecurityReportService();

module.exports = { SecurityReportService, securityReportService };

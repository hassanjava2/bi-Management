/**
 * BI Management - Goals & Incentives Service
 * نظام Bi Goals للحوافز والنقاط
 */

const { run, get, all } = require('../config/database');
const { generateId, now, today } = require('../utils/helpers');
const notificationService = require('./notification.service');

// نقاط لكل نوع إنجاز
const POINTS_CONFIG = {
    // مهام
    task_completed: 10,                  // إكمال مهمة
    task_completed_early: 15,            // إكمال قبل الموعد
    task_completed_same_day: 20,         // إكمال نفس اليوم
    task_urgent_completed: 25,           // إكمال مهمة عاجلة
    
    // حضور
    attendance_on_time: 5,               // حضور بالوقت
    attendance_early: 10,                // حضور مبكر
    perfect_week: 50,                    // أسبوع كامل بدون تأخير
    perfect_month: 200,                  // شهر كامل بدون تأخير/غياب
    
    // أداء
    no_overdue_week: 30,                 // أسبوع بدون تأخير مهام
    customer_positive_feedback: 15,     // تقييم إيجابي من عميل
    team_collaboration: 10,              // مساعدة زميل
    suggestion_accepted: 25,             // اقتراح تم قبوله
    
    // تدريب
    training_completed: 20,              // إكمال تدريب
    new_skill_acquired: 30,              // اكتساب مهارة جديدة
    
    // خصومات
    task_overdue: -10,                   // تأخير مهمة
    absent_unexcused: -50,               // غياب بدون عذر
    late_arrival: -5,                    // تأخير بالحضور
    warning_received: -20,               // إنذار
};

// المستويات
const LEVELS = [
    { level: 1, name: 'مبتدئ', name_en: 'Beginner', min_points: 0, badge: '🌱' },
    { level: 2, name: 'نشيط', name_en: 'Active', min_points: 100, badge: '⭐' },
    { level: 3, name: 'متميز', name_en: 'Rising Star', min_points: 500, badge: '🌟' },
    { level: 4, name: 'محترف', name_en: 'Professional', min_points: 1500, badge: '💫' },
    { level: 5, name: 'خبير', name_en: 'Expert', min_points: 3000, badge: '🏆' },
    { level: 6, name: 'قائد', name_en: 'Leader', min_points: 5000, badge: '👑' },
    { level: 7, name: 'أسطورة', name_en: 'Legend', min_points: 10000, badge: '🎖️' },
];

class GoalsService {
    /**
     * منح نقاط للموظف
     */
    awardPoints(userId, reason, customPoints = null) {
        const points = customPoints !== null ? customPoints : (POINTS_CONFIG[reason] || 0);
        
        if (points === 0) return null;

        const transaction = {
            id: generateId(),
            user_id: userId,
            points: points,
            reason: reason,
            description: this._getReasonDescription(reason),
            created_at: now()
        };

        // إضافة للسجل
        run(`
            INSERT INTO point_transactions (id, user_id, points, reason, description, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [transaction.id, userId, points, reason, transaction.description, transaction.created_at]);

        // تحديث مجموع النقاط
        run(`
            UPDATE users SET 
                total_points = COALESCE(total_points, 0) + ?,
                monthly_points = COALESCE(monthly_points, 0) + ?
            WHERE id = ?
        `, [points, points, userId]);

        // فحص ترقية المستوى
        this._checkLevelUp(userId);

        // إشعار إذا كانت نقاط إيجابية
        if (points > 0) {
            notificationService.create({
                user_id: userId,
                title: `+${points} نقطة! 🎉`,
                body: transaction.description,
                type: 'success',
                data: { points, reason }
            });
        }

        return transaction;
    }

    /**
     * خصم نقاط
     */
    deductPoints(userId, reason, customPoints = null, adminNote = null) {
        const points = customPoints !== null ? -Math.abs(customPoints) : (POINTS_CONFIG[reason] || 0);
        
        if (points === 0) return null;

        const transaction = {
            id: generateId(),
            user_id: userId,
            points: points,
            reason: reason,
            description: this._getReasonDescription(reason),
            admin_note: adminNote,
            created_at: now()
        };

        run(`
            INSERT INTO point_transactions (id, user_id, points, reason, description, admin_note, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [transaction.id, userId, points, reason, transaction.description, adminNote, transaction.created_at]);

        run(`
            UPDATE users SET 
                total_points = MAX(0, COALESCE(total_points, 0) + ?),
                monthly_points = MAX(0, COALESCE(monthly_points, 0) + ?)
            WHERE id = ?
        `, [points, points, userId]);

        return transaction;
    }

    /**
     * جلب نقاط موظف
     */
    getUserPoints(userId) {
        const user = get(`
            SELECT id, full_name, total_points, monthly_points, current_level
            FROM users WHERE id = ?
        `, [userId]);

        if (!user) return null;

        const level = this._getLevel(user.total_points || 0);
        const nextLevel = this._getNextLevel(level.level);
        const progress = nextLevel ? 
            Math.round((user.total_points - level.min_points) / (nextLevel.min_points - level.min_points) * 100) : 100;

        return {
            ...user,
            level: level,
            next_level: nextLevel,
            progress_to_next: progress,
            points_to_next: nextLevel ? nextLevel.min_points - user.total_points : 0
        };
    }

    /**
     * جلب سجل النقاط
     */
    getPointsHistory(userId, limit = 20, offset = 0) {
        return all(`
            SELECT * FROM point_transactions 
            WHERE user_id = ? 
            ORDER BY created_at DESC 
            LIMIT ? OFFSET ?
        `, [userId, limit, offset]);
    }

    /**
     * لوحة المتصدرين
     */
    getLeaderboard(period = 'monthly', departmentId = null, limit = 10) {
        // Whitelist valid columns to prevent SQL injection
        const validColumns = ['monthly_points', 'total_points'];
        const pointsColumn = period === 'monthly' ? 'monthly_points' : 'total_points';
        
        // Safety check - should never fail but prevents any future bugs
        if (!validColumns.includes(pointsColumn)) {
            throw new Error('Invalid period parameter');
        }
        
        // Sanitize limit
        const safeLimit = Math.min(Math.max(parseInt(limit) || 10, 1), 100);
        
        let query = `
            SELECT u.id, u.full_name, u.avatar_url, u.department_id,
                   d.name as department_name,
                   u.${pointsColumn} as points,
                   u.current_level,
                   u.total_points
            FROM users u
            LEFT JOIN departments d ON u.department_id = d.id
            WHERE u.is_active = 1 AND u.${pointsColumn} > 0
        `;
        const params = [];

        if (departmentId) {
            query += ` AND u.department_id = ?`;
            params.push(departmentId);
        }

        query += ` ORDER BY u.${pointsColumn} DESC LIMIT ?`;
        params.push(safeLimit);

        const users = all(query, params);

        return users.map((user, index) => ({
            rank: index + 1,
            ...user,
            level: this._getLevel(user.total_points || 0)
        }));
    }

    /**
     * إحصائيات الموظف
     */
    getUserStats(userId, period = 'month') {
        let dateFilter = '';
        if (period === 'week') {
            dateFilter = `AND created_at >= date('now', '-7 days')`;
        } else if (period === 'month') {
            dateFilter = `AND created_at >= date('now', '-30 days')`;
        }

        const stats = get(`
            SELECT 
                SUM(CASE WHEN points > 0 THEN points ELSE 0 END) as earned,
                SUM(CASE WHEN points < 0 THEN ABS(points) ELSE 0 END) as lost,
                COUNT(CASE WHEN points > 0 THEN 1 END) as positive_actions,
                COUNT(CASE WHEN points < 0 THEN 1 END) as negative_actions
            FROM point_transactions 
            WHERE user_id = ? ${dateFilter}
        `, [userId]);

        const topReasons = all(`
            SELECT reason, SUM(points) as total_points, COUNT(*) as count
            FROM point_transactions 
            WHERE user_id = ? AND points > 0 ${dateFilter}
            GROUP BY reason
            ORDER BY total_points DESC
            LIMIT 5
        `, [userId]);

        return {
            ...stats,
            net_points: (stats?.earned || 0) - (stats?.lost || 0),
            top_earning_reasons: topReasons.map(r => ({
                ...r,
                description: this._getReasonDescription(r.reason)
            }))
        };
    }

    /**
     * الإنجازات/الشارات
     */
    getUserBadges(userId) {
        // فحص الإنجازات
        const user = get(`SELECT * FROM users WHERE id = ?`, [userId]);
        const stats = this._calculateUserAchievements(userId);

        const badges = [];

        // شارة الحضور المثالي
        if (stats.perfect_attendance_streak >= 30) {
            badges.push({
                id: 'perfect_attendance',
                name: 'الحضور المثالي',
                name_en: 'Perfect Attendance',
                icon: '🏅',
                description: 'شهر كامل بدون تأخير أو غياب',
                earned_at: stats.perfect_attendance_date
            });
        }

        // شارة إنجاز المهام
        if (stats.tasks_completed >= 100) {
            badges.push({
                id: 'task_master',
                name: 'سيد المهام',
                name_en: 'Task Master',
                icon: '🎯',
                description: 'إكمال 100 مهمة',
                earned_at: stats.task_master_date
            });
        }

        // شارة السرعة
        if (stats.early_completions >= 20) {
            badges.push({
                id: 'speed_demon',
                name: 'البرق',
                name_en: 'Speed Demon',
                icon: '⚡',
                description: 'إكمال 20 مهمة قبل موعدها',
                earned_at: stats.speed_date
            });
        }

        // شارة التعاون
        if (stats.team_help_count >= 10) {
            badges.push({
                id: 'team_player',
                name: 'روح الفريق',
                name_en: 'Team Player',
                icon: '🤝',
                description: 'مساعدة 10 زملاء',
                earned_at: stats.team_date
            });
        }

        return badges;
    }

    /**
     * المكافآت المتاحة للاستبدال
     */
    getAvailableRewards() {
        return all(`
            SELECT * FROM rewards 
            WHERE is_active = 1 AND (quantity IS NULL OR quantity > 0)
            ORDER BY points_required ASC
        `);
    }

    /**
     * استبدال نقاط بمكافأة
     */
    redeemReward(userId, rewardId) {
        const user = get(`SELECT total_points FROM users WHERE id = ?`, [userId]);
        const reward = get(`SELECT * FROM rewards WHERE id = ? AND is_active = 1`, [rewardId]);

        if (!reward) {
            throw new Error('المكافأة غير متوفرة');
        }

        if (user.total_points < reward.points_required) {
            throw new Error('نقاطك غير كافية');
        }

        if (reward.quantity !== null && reward.quantity <= 0) {
            throw new Error('المكافأة نفدت');
        }

        // خصم النقاط
        run(`
            UPDATE users SET total_points = total_points - ? WHERE id = ?
        `, [reward.points_required, userId]);

        // تسجيل الاستبدال
        const redemption = {
            id: generateId(),
            user_id: userId,
            reward_id: rewardId,
            points_spent: reward.points_required,
            status: 'pending',
            created_at: now()
        };

        run(`
            INSERT INTO reward_redemptions (id, user_id, reward_id, points_spent, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [redemption.id, userId, rewardId, reward.points_required, 'pending', redemption.created_at]);

        // تحديث الكمية
        if (reward.quantity !== null) {
            run(`UPDATE rewards SET quantity = quantity - 1 WHERE id = ?`, [rewardId]);
        }

        // إشعار HR
        const hrUsers = all(`SELECT id FROM users WHERE role IN ('hr', 'admin')`);
        for (const hr of hrUsers) {
            notificationService.create({
                user_id: hr.id,
                title: 'طلب استبدال مكافأة',
                body: `${user.full_name} طلب استبدال: ${reward.name}`,
                type: 'info',
                data: { redemption_id: redemption.id }
            });
        }

        return redemption;
    }

    /**
     * إعادة تعيين النقاط الشهرية (تشغيل أول كل شهر)
     */
    resetMonthlyPoints() {
        // أرشفة النقاط الشهرية
        run(`
            INSERT INTO monthly_points_archive (id, user_id, month, year, points, created_at)
            SELECT 
                lower(hex(randomblob(16))),
                id,
                strftime('%m', 'now', '-1 month'),
                strftime('%Y', 'now', '-1 month'),
                monthly_points,
                CURRENT_TIMESTAMP
            FROM users WHERE monthly_points > 0
        `);

        // تصفير
        run(`UPDATE users SET monthly_points = 0`);

        console.log('[Goals] Monthly points reset completed');
    }

    // ========== Private Methods ==========

    _getLevel(points) {
        let currentLevel = LEVELS[0];
        for (const level of LEVELS) {
            if (points >= level.min_points) {
                currentLevel = level;
            }
        }
        return currentLevel;
    }

    _getNextLevel(currentLevelNum) {
        return LEVELS.find(l => l.level === currentLevelNum + 1) || null;
    }

    _checkLevelUp(userId) {
        const user = get(`SELECT total_points, current_level FROM users WHERE id = ?`, [userId]);
        const newLevel = this._getLevel(user.total_points || 0);

        if (newLevel.level > (user.current_level || 1)) {
            run(`UPDATE users SET current_level = ? WHERE id = ?`, [newLevel.level, userId]);

            notificationService.create({
                user_id: userId,
                title: `ترقية! ${newLevel.badge}`,
                body: `مبروك! وصلت للمستوى ${newLevel.level}: ${newLevel.name}`,
                type: 'success',
                data: { level: newLevel.level, badge: newLevel.badge }
            });
        }
    }

    _getReasonDescription(reason) {
        const descriptions = {
            task_completed: 'إكمال مهمة',
            task_completed_early: 'إكمال مهمة قبل الموعد',
            task_completed_same_day: 'إكمال مهمة في نفس اليوم',
            task_urgent_completed: 'إكمال مهمة عاجلة',
            attendance_on_time: 'حضور في الوقت',
            attendance_early: 'حضور مبكر',
            perfect_week: 'أسبوع مثالي',
            perfect_month: 'شهر مثالي',
            no_overdue_week: 'أسبوع بدون تأخير مهام',
            customer_positive_feedback: 'تقييم إيجابي من عميل',
            team_collaboration: 'مساعدة زميل',
            suggestion_accepted: 'اقتراح تم قبوله',
            training_completed: 'إكمال تدريب',
            new_skill_acquired: 'اكتساب مهارة جديدة',
            task_overdue: 'تأخير في إنجاز مهمة',
            absent_unexcused: 'غياب بدون عذر',
            late_arrival: 'تأخير في الحضور',
            warning_received: 'إنذار',
            manual_bonus: 'مكافأة يدوية',
            manual_deduction: 'خصم يدوي'
        };
        return descriptions[reason] || reason;
    }

    _calculateUserAchievements(userId) {
        // هذه دالة مبسطة - يمكن توسيعها
        const taskStats = get(`
            SELECT 
                COUNT(*) as tasks_completed,
                SUM(CASE WHEN completed_at < due_date THEN 1 ELSE 0 END) as early_completions
            FROM tasks WHERE assigned_to = ? AND status = 'completed'
        `, [userId]);

        return {
            tasks_completed: taskStats?.tasks_completed || 0,
            early_completions: taskStats?.early_completions || 0,
            perfect_attendance_streak: 0, // يحتاج حساب
            team_help_count: 0 // يحتاج تتبع
        };
    }
}

// Singleton
const goalsService = new GoalsService();

module.exports = { GoalsService, goalsService, POINTS_CONFIG, LEVELS };

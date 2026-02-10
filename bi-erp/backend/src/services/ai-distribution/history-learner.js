/**
 * BI Management - AI Task Distribution
 * History Learner - متعلم التاريخ: يحلل أداء كل موظف، يحدّث skill scores تلقائياً
 */

const { all, get, run } = require('../../config/database');
const { SKILL_KEYS } = require('./task-generator');

const TASK_KIND_TO_SKILL = {
    inspection: 'inspection',
    preparation: 'preparation',
    packaging: 'preparation',
    delivery: 'delivery',
    cleaning: 'cleaning',
    maintenance: 'maintenance',
    accounting: 'accounting',
    sales: 'sales',
    sticker: 'preparation',
    stock_order: 'accounting',
    warranty_inspect: 'inspection',
    warranty_send: 'delivery',
};

/**
 * Ensure employee_skills table and default row for user
 */
async function ensureEmployeeSkills(userId) {
    try {
        await run(`
            INSERT INTO employee_skills (user_id, inspection, preparation, sales, delivery, cleaning, maintenance, accounting, updated_at)
            VALUES (?, 50, 50, 50, 50, 50, 50, 50, CURRENT_TIMESTAMP)
            ON CONFLICT (user_id) DO NOTHING
        `, [userId]);
    } catch (e) {
        // Table might not exist yet
    }
}

/**
 * Get skill scores for a user (0-100 per skill). Default 50 if missing.
 */
async function getSkillScores(userId) {
    ensureEmployeeSkills(userId);
    const row = await get(`SELECT * FROM employee_skills WHERE user_id = ?`, [userId]);
    if (!row) {
        return Object.fromEntries(SKILL_KEYS.map((k) => [k, 50]));
    }
    return {
        inspection: Number(row.inspection) || 50,
        preparation: Number(row.preparation) || 50,
        sales: Number(row.sales) || 50,
        delivery: Number(row.delivery) || 50,
        cleaning: Number(row.cleaning) || 50,
        maintenance: Number(row.maintenance) || 50,
        accounting: Number(row.accounting) || 50,
    };
}

/**
 * History-based score 0-1: average of on-time completion rate and completion speed (inverse of avg delay)
 */
function getHistoryScore(userId, taskKind) {
    const skillKey = TASK_KIND_TO_SKILL[taskKind] || 'preparation';
    const scores = getSkillScores(userId);
    const raw = scores[skillKey] || 50;
    return raw / 100;
}

/**
 * Average completion time for this user for a given category (from completed tasks)
 */
async function getAverageCompletionMinutes(userId, taskKind) {
    const ref = await get(`
        SELECT AVG(actual_minutes) as avg_min
        FROM tasks
        WHERE assigned_to = ? AND status = 'completed' AND actual_minutes IS NOT NULL
        AND (source_reference LIKE ? OR category = ?)
        LIMIT 1
    `, [userId, `%${taskKind}%`, taskKind]);
    return Number(ref?.avg_min) || null;
}

/**
 * On-time completion rate (0-1) for user
 */
async function getOnTimeRate(userId) {
    const row = await get(`
        SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN date(completed_at) <= date(due_date) OR due_date IS NULL THEN 1 ELSE 0 END) as on_time
        FROM tasks
        WHERE assigned_to = ? AND status = 'completed'
    `, [userId]);
    const total = Number(row?.total) || 0;
    if (total === 0) return 0.5;
    return Number(row?.on_time) / total;
}

/**
 * Update skill score after task completion (small delta toward 100 for success, toward 0 for fail/late)
 */
async function recordCompletion(userId, taskKind, options = {}) {
    const { onTime = true, rating } = options;
    const skillKey = TASK_KIND_TO_SKILL[taskKind];
    if (!skillKey) return;

    const allowed = ['inspection', 'preparation', 'sales', 'delivery', 'cleaning', 'maintenance', 'accounting'];
    if (!allowed.includes(skillKey)) return;

    try {
        const scores = getSkillScores(userId);
        let current = scores[skillKey] || 50;
        const delta = onTime ? (rating ? Math.min(5, rating) : 2) : -2;
        current = Math.max(0, Math.min(100, current + delta));

        await run(
            `UPDATE employee_skills SET ${skillKey} = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?`,
            [current, userId]
        );
    } catch (e) {
        console.error('[HistoryLearner] recordCompletion error:', e.message);
    }
}

/**
 * Ensure employee_skills table exists (call from index init)
 */
async function ensureTable() {
    try {
        await run(`
            CREATE TABLE IF NOT EXISTS employee_skills (
                user_id TEXT PRIMARY KEY,
                inspection INTEGER DEFAULT 50,
                preparation INTEGER DEFAULT 50,
                sales INTEGER DEFAULT 50,
                delivery INTEGER DEFAULT 50,
                cleaning INTEGER DEFAULT 50,
                maintenance INTEGER DEFAULT 50,
                accounting INTEGER DEFAULT 50,
                updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            )
        `);
    } catch (e) {
        console.error('[HistoryLearner] ensureTable:', e.message);
    }
}

module.exports = {
    getSkillScores,
    getHistoryScore,
    getAverageCompletionMinutes,
    getOnTimeRate,
    recordCompletion,
    ensureEmployeeSkills,
    ensureTable,
    TASK_KIND_TO_SKILL,
};

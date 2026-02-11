/**
 * BI Management - AI Task Distribution
 * Workload Balancer - موازن الحمل
 */

const { all, get } = require('../../config/database');
const config = require('./config');

function getMaxUtilization() {
    return config.getConfig().max_utilization ?? 0.85;
}

async function getWorkload(userId) {
    const row = await get(`
        SELECT 
            COUNT(*) as task_count,
            COALESCE(SUM(estimated_minutes), 0) as estimated_minutes
        FROM tasks
        WHERE assigned_to = ? AND status NOT IN ('completed', 'cancelled')
    `, [userId]);

    const taskCount = Number(row?.task_count) || 0;
    const estimatedMinutesRemaining = Number(row?.estimated_minutes) || 0;
    const utilization = Math.min(1, estimatedMinutesRemaining / 480);

    return {
        taskCount,
        estimatedMinutesRemaining,
        utilization,
    };
}

function getWorkloadScore(userId) {
    const maxU = getMaxUtilization();
    const { utilization } = getWorkload(userId);
    if (utilization >= maxU) return 0;
    return 1 - (utilization / maxU);
}

async function getEligibleUserIds() {
    const maxU = getMaxUtilization();
    const activeUsers = await all(`SELECT id FROM users WHERE is_active = TRUE`);
    const ids = activeUsers.map((u) => u.id);
    return ids.filter((id) => getWorkload(id).utilization < maxU);
}

async function getAllWorkloads() {
    const users = await all(`SELECT id, full_name, department_id FROM users WHERE is_active = TRUE`);
    return users.map((u) => ({
        userId: u.id,
        full_name: u.full_name,
        department_id: u.department_id,
        ...getWorkload(u.id),
    }));
}

async function getTasksToReassign(fromUserId) {
    return await all(`
        SELECT id, title, estimated_minutes FROM tasks
        WHERE assigned_to = ? AND status NOT IN ('completed', 'cancelled')
    `, [fromUserId]);
}

module.exports = {
    getWorkload,
    getWorkloadScore,
    getEligibleUserIds,
    getAllWorkloads,
    getTasksToReassign,
    getMaxUtilization,
    MAX_UTILIZATION: 0.85,
};

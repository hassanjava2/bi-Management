/**
 * BI Management - AI Task Distribution
 * Assignment Engine - محرك التوزيع الذكي (scoring: مهارات 40%, حمل 25%, تاريخ 20%, توفر 15%)
 */

const { get } = require('../../config/database');
const workloadBalancer = require('./workload-balancer');
const historyLearner = require('./history-learner');
const config = require('./config');

function getWeights() {
    return config.getConfig().weights;
}

/**
 * Skill match score 0-1: average of required skills for this user
 */
function getSkillMatchScore(userId, requiredSkills) {
    if (!requiredSkills || requiredSkills.length === 0) return 1;
    const scores = historyLearner.getSkillScores(userId);
    let sum = 0;
    for (const sk of requiredSkills) {
        sum += (scores[sk] || 50) / 100;
    }
    return sum / requiredSkills.length;
}

/**
 * Availability: 1 if user has attendance today (or we don't track), else 0.5
 */
async function getAvailabilityScore(userId) {
    try {
        const today = new Date().toISOString().split('T')[0];
        const row = await get(
            `SELECT id FROM attendance WHERE user_id = ? AND date = ? AND (check_in IS NOT NULL OR status = 'present')`,
            [userId, today]
        );
        return row ? 1 : 0.5;
    } catch (e) {
        return 0.5;
    }
}

/**
 * Compute full score for one candidate
 */
function scoreCandidate(userId, taskDef) {
    const w = getWeights();
    const skillScore = getSkillMatchScore(userId, taskDef.required_skills || []);
    const workloadScore = workloadBalancer.getWorkloadScore(userId);
    const historyScore = historyLearner.getHistoryScore(userId, taskDef.taskKind || 'preparation');
    const availabilityScore = getAvailabilityScore(userId);

    const total =
        skillScore * (w.skill ?? 0.4) +
        workloadScore * (w.workload ?? 0.25) +
        historyScore * (w.history ?? 0.2) +
        availabilityScore * (w.availability ?? 0.15);

    return {
        userId,
        score: Math.round(total * 1000) / 1000,
        breakdown: {
            skill: skillScore,
            workload: workloadScore,
            history: historyScore,
            availability: availabilityScore,
        },
    };
}

/**
 * Get all candidate scores for a task (only eligible users - under 85% load)
 */
function getCandidateScores(taskDef, candidateUserIds = null) {
    const userIds = candidateUserIds || workloadBalancer.getEligibleUserIds();
    if (userIds.length === 0) return [];

    const scored = userIds.map((uid) => scoreCandidate(uid, taskDef));
    return scored.sort((a, b) => b.score - a.score);
}

/**
 * Select best assignee for a task. Returns { userId, score, autoAssign } or null if no candidates.
 * autoAssign: true for routine (low/normal), false when manager approval required
 */
function selectAssignee(taskDef) {
    const candidates = getCandidateScores(taskDef);
    if (candidates.length === 0) return null;

    const best = candidates[0];
    const isRoutine =
        (taskDef.priority === 'low' || taskDef.priority === 'normal') &&
        !taskDef.requires_approval;

    return {
        userId: best.userId,
        score: best.score,
        autoAssign: isRoutine,
        breakdown: best.breakdown,
        alternatives: candidates.slice(1, 4),
    };
}

module.exports = {
    getCandidateScores,
    selectAssignee,
    getSkillMatchScore,
    getAvailabilityScore,
    getWeights,
    WEIGHTS: { skill: 0.4, workload: 0.25, history: 0.2, availability: 0.15 },
};

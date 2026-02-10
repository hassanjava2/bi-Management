/**
 * Minimal onboarding/training - progress based on user hire_date and simple checklist
 */
const { get } = require('../config/database');

const DEFAULT_TASKS = [
  { index: 0, title: 'مراجعة دليل الموظف', completed_key: 'onboarding_0' },
  { index: 1, title: 'إعداد المعدات', completed_key: 'onboarding_1' },
  { index: 2, title: 'مقابلة المشرف', completed_key: 'onboarding_2' },
];

async function checkProgress(userId) {
  const user = await get('SELECT id, hire_date, created_at FROM users WHERE id = ?', [userId]);
  if (!user) return { in_training: false, tasks: [], completed_count: 0 };
  const completed = [];
  for (const t of DEFAULT_TASKS) {
    completed.push({ ...t, completed: false });
  }
  return {
    in_training: true,
    tasks: completed,
    completed_count: 0,
  };
}

async function completeTrainingTask(userId, index, score, notes) {
  return checkProgress(userId);
}

module.exports = { checkProgress, completeTrainingTask };

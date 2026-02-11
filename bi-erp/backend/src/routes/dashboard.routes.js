const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const taskService = require('../services/task.service');
const attendanceService = require('../services/attendance.service');

router.use(auth);

router.get('/', async (req, res) => {
  try {
    const [taskStats, attendanceStats] = await Promise.all([
      taskService.getTaskStats({}),
      attendanceService.getStats(),
    ]);
    res.json({
      success: true,
      data: {
        tasks: {
          total: taskStats.total ?? 0,
          today: taskStats.today ?? 0,
          overdue: taskStats.overdue ?? 0,
        },
        attendance: {
          checked_in: attendanceStats.checked_in ?? attendanceStats.present ?? 0,
          total_employees: attendanceStats.total_employees ?? 0,
        },
      },
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;

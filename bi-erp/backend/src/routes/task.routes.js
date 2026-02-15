const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const taskService = require('../services/task.service');

router.use(auth);

router.get('/my-tasks', async (req, res) => {
  try {
    const data = await taskService.myTasks(req.user.id);
    res.json({ success: true, data });
  } catch (e) {
    res.json({ success: true, data: [] });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const data = await taskService.getTaskStats({
      assigned_to: req.query.assigned_to,
      department_id: req.query.department_id,
    });
    res.json({ success: true, data });
  } catch (e) {
    res.json({ success: true, data: { total: 0, today: 0, overdue: 0, completed: 0, in_progress: 0 } });
  }
});

router.get('/', async (req, res) => {
  try {
    const data = await taskService.list({ assigned_to: req.query.assigned_to, status: req.query.status });
    res.json({ success: true, data });
  } catch (e) {
    res.json({ success: true, data: [] });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const task = await taskService.getById(req.params.id);
    if (!task) return res.status(404).json({ success: false, error: 'NOT_FOUND' });
    res.json({ success: true, data: task });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const created = await taskService.create(req.body, req.user.id);
    res.status(201).json({ success: true, data: created });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const updated = await taskService.update(req.params.id, req.body);
    res.json({ success: true, data: updated });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.post('/:id/comments', async (req, res) => {
  try {
    const { comment } = req.body;
    const updated = await taskService.addComment(req.params.id, req.user.id, comment);
    res.status(201).json({ success: true, data: updated });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;

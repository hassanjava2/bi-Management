/**
 * BI Management - Warranty Routes
 * مسارات الضمان والصيانة — thin controller
 */
const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const claimsService = require('../services/warranty-claims.service');

router.use(auth);

// ─── Stats ───
router.get('/stats', async (req, res) => {
  try {
    const data = await claimsService.getStats();
    res.json({ success: true, data });
  } catch (e) {
    res.json({ success: true, data: { total: 0, pending: 0, in_repair: 0, resolved: 0, closed: 0 } });
  }
});

// ─── List Claims ───
router.get('/', async (req, res) => {
  try {
    const data = await claimsService.listClaims(req.query);
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ─── Single Claim ───
router.get('/:id', async (req, res) => {
  try {
    const data = await claimsService.getClaimById(req.params.id);
    if (!data) return res.status(404).json({ success: false, error: 'مطالبة الضمان غير موجودة' });
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ─── Create Claim (POST /claims and POST /) ───
const handleCreate = async (req, res) => {
  try {
    const data = await claimsService.createClaim(req.body, req.user?.id);
    res.status(201).json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};
router.post('/claims', handleCreate);
router.post('/', handleCreate);

// ─── Update Claim ───
router.put('/claims/:id', async (req, res) => {
  try {
    const data = await claimsService.updateClaim(req.params.id, req.body);
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ─── Close Claim ───
router.post('/claims/:id/close', async (req, res) => {
  try {
    const data = await claimsService.closeClaim(req.params.id, req.body.resolution, req.body.notes, req.user?.id);
    res.json({ success: true, data, message: 'تم إغلاق المطالبة' });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ─── List Repairs ───
router.get('/repairs', async (req, res) => {
  try {
    const data = await claimsService.listRepairs();
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ─── Create Repair ───
router.post('/repairs', async (req, res) => {
  try {
    const data = await claimsService.createRepair(req.body, req.user?.id);
    res.status(201).json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ─── Update Repair ───
router.put('/repairs/:id', async (req, res) => {
  try {
    const data = await claimsService.updateRepair(req.params.id, req.body);
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;

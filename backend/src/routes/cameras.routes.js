/**
 * BI Management - Camera Routes
 * مسارات إدارة الكاميرات
 */

const router = require('express').Router();
const { auth } = require('../middleware/auth');
const { hasRole, hasSecurityLevel } = require('../middleware/rbac');
const { cameraService } = require('../services/camera.service');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * GET /api/cameras
 * List all cameras
 */
router.get('/', auth, hasSecurityLevel(3), asyncHandler(async (req, res) => {
    const cameras = cameraService.listCameras();
    
    // Get status for each camera
    const camerasWithStatus = await Promise.all(
        cameras.map(async (cam) => {
            const status = await cameraService.getCameraStatus(cam.id);
            return { ...cam, status };
        })
    );

    res.json({
        success: true,
        data: camerasWithStatus
    });
}));

/**
 * POST /api/cameras
 * Add new camera
 */
router.post('/', auth, hasSecurityLevel(4), asyncHandler(async (req, res) => {
    const { name, rtsp_url, location, detection_types } = req.body;

    if (!name || !rtsp_url) {
        return res.status(400).json({
            success: false,
            error: 'MISSING_DATA',
            message: 'name و rtsp_url مطلوبان'
        });
    }

    const camera = await cameraService.addCamera({
        name,
        rtsp_url,
        location,
        detection_types
    });

    res.status(201).json({
        success: true,
        data: camera,
        message: 'تم إضافة الكاميرا بنجاح'
    });
}));

/**
 * GET /api/cameras/:id
 * Get camera details
 */
router.get('/:id', auth, hasSecurityLevel(3), asyncHandler(async (req, res) => {
    const camera = cameraService.getCamera(req.params.id);

    if (!camera) {
        return res.status(404).json({
            success: false,
            error: 'NOT_FOUND',
            message: 'الكاميرا غير موجودة'
        });
    }

    const status = await cameraService.getCameraStatus(req.params.id);

    res.json({
        success: true,
        data: { ...camera, status }
    });
}));

/**
 * PUT /api/cameras/:id
 * Update camera
 */
router.put('/:id', auth, hasSecurityLevel(4), asyncHandler(async (req, res) => {
    const camera = cameraService.updateCamera(req.params.id, req.body);

    if (!camera) {
        return res.status(404).json({
            success: false,
            error: 'NOT_FOUND',
            message: 'الكاميرا غير موجودة'
        });
    }

    res.json({
        success: true,
        data: camera,
        message: 'تم تحديث الكاميرا'
    });
}));

/**
 * DELETE /api/cameras/:id
 * Delete camera
 */
router.delete('/:id', auth, hasSecurityLevel(5), asyncHandler(async (req, res) => {
    cameraService.deleteCamera(req.params.id);

    res.json({
        success: true,
        message: 'تم حذف الكاميرا'
    });
}));

/**
 * POST /api/cameras/:id/start
 * Start camera analysis
 */
router.post('/:id/start', auth, hasSecurityLevel(4), asyncHandler(async (req, res) => {
    const result = await cameraService.startAnalysis(req.params.id);

    res.json({
        success: true,
        data: result,
        message: 'تم بدء التحليل'
    });
}));

/**
 * POST /api/cameras/:id/stop
 * Stop camera analysis
 */
router.post('/:id/stop', auth, hasSecurityLevel(4), asyncHandler(async (req, res) => {
    const result = await cameraService.stopAnalysis(req.params.id);

    res.json({
        success: true,
        data: result,
        message: 'تم إيقاف التحليل'
    });
}));

/**
 * GET /api/cameras/:id/snapshot
 * Get camera snapshot
 */
router.get('/:id/snapshot', auth, hasSecurityLevel(3), asyncHandler(async (req, res) => {
    const snapshot = await cameraService.getSnapshot(req.params.id);

    res.json({
        success: true,
        data: snapshot
    });
}));

/**
 * GET /api/cameras/:id/detections
 * Get camera detections
 */
router.get('/:id/detections', auth, hasSecurityLevel(3), asyncHandler(async (req, res) => {
    const { limit = 50 } = req.query;
    const detections = cameraService.getDetections(req.params.id, parseInt(limit));

    res.json({
        success: true,
        data: detections
    });
}));

/**
 * GET /api/cameras/detections/all
 * Get all recent detections
 */
router.get('/detections/all', auth, hasSecurityLevel(3), asyncHandler(async (req, res) => {
    const { limit = 100 } = req.query;
    const detections = cameraService.getAllDetections(parseInt(limit));

    res.json({
        success: true,
        data: detections
    });
}));

/**
 * GET /api/cameras/statistics
 * Get camera statistics
 */
router.get('/statistics', auth, hasSecurityLevel(3), asyncHandler(async (req, res) => {
    const stats = cameraService.getStatistics();

    res.json({
        success: true,
        data: stats
    });
}));

/**
 * POST /api/cameras/webhook
 * Webhook for Camera AI to report detections
 */
router.post('/webhook', asyncHandler(async (req, res) => {
    // Verify API key
    const apiKey = req.headers['x-api-key'] || req.query.api_key;
    const validApiKey = process.env.CAMERA_WEBHOOK_API_KEY || 'dev-camera-webhook-key';
    
    if (apiKey !== validApiKey) {
        return res.status(401).json({
            success: false,
            error: 'UNAUTHORIZED',
            message: 'Invalid API key'
        });
    }
    
    const { camera_id, detection_type, severity, location, image_path, task_id } = req.body;

    const detection = cameraService.saveDetection({
        camera_id,
        detection_type,
        severity,
        location,
        image_path,
        task_created: !!task_id,
        task_id
    });

    res.json({
        success: true,
        data: detection
    });
}));

module.exports = router;

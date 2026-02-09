/**
 * BI Management - Camera Integration Service
 * خدمة التكامل مع نظام الكاميرات
 */

const axios = require('axios');
const { run, get, all } = require('../config/database');
const { generateId, now } = require('../utils/helpers');
const notificationService = require('./notification.service');

// Camera AI Service URL
const CAMERA_AI_URL = process.env.CAMERA_AI_URL || 'http://localhost:8001/api';

class CameraService {
    /**
     * Add camera to system
     */
    async addCamera(data) {
        const id = generateId();

        run(`
            INSERT INTO cameras (id, name, rtsp_url, location, detection_config, is_active)
            VALUES (?, ?, ?, ?, ?, 1)
        `, [
            id,
            data.name,
            data.rtsp_url,
            data.location,
            JSON.stringify(data.detection_types || ['idle', 'mess'])
        ]);

        // Register with Camera AI service
        try {
            await axios.post(`${CAMERA_AI_URL}/cameras`, {
                name: data.name,
                rtsp_url: data.rtsp_url,
                location: data.location,
                detection_types: data.detection_types || ['idle', 'mess']
            });
        } catch (e) {
            console.error('[Camera Service] Failed to register with Camera AI:', e.message);
        }

        return this.getCamera(id);
    }

    /**
     * Get camera by ID
     */
    getCamera(id) {
        return get(`SELECT * FROM cameras WHERE id = ?`, [id]);
    }

    /**
     * List all cameras
     */
    listCameras() {
        return all(`SELECT * FROM cameras ORDER BY created_at DESC`);
    }

    /**
     * Update camera
     */
    updateCamera(id, data) {
        const updates = [];
        const params = [];

        if (data.name) {
            updates.push('name = ?');
            params.push(data.name);
        }
        if (data.rtsp_url) {
            updates.push('rtsp_url = ?');
            params.push(data.rtsp_url);
        }
        if (data.location) {
            updates.push('location = ?');
            params.push(data.location);
        }
        if (data.detection_types) {
            updates.push('detection_config = ?');
            params.push(JSON.stringify(data.detection_types));
        }
        if (typeof data.is_active === 'boolean') {
            updates.push('is_active = ?');
            params.push(data.is_active ? 1 : 0);
        }

        params.push(id);

        if (updates.length > 0) {
            run(`UPDATE cameras SET ${updates.join(', ')} WHERE id = ?`, params);
        }

        return this.getCamera(id);
    }

    /**
     * Delete camera
     */
    deleteCamera(id) {
        run(`DELETE FROM cameras WHERE id = ?`, [id]);
        
        // Stop analysis on Camera AI
        try {
            axios.post(`${CAMERA_AI_URL}/cameras/${id}/stop-analysis`);
        } catch (e) {
            // Ignore
        }
    }

    /**
     * Get camera status from Camera AI
     */
    async getCameraStatus(id) {
        try {
            const response = await axios.get(`${CAMERA_AI_URL}/cameras/${id}/status`);
            return response.data.data;
        } catch (e) {
            return { error: 'Camera AI unavailable' };
        }
    }

    /**
     * Start camera analysis
     */
    async startAnalysis(id) {
        try {
            const response = await axios.post(`${CAMERA_AI_URL}/cameras/${id}/start-analysis`);
            return response.data;
        } catch (e) {
            throw new Error('Failed to start camera analysis');
        }
    }

    /**
     * Stop camera analysis
     */
    async stopAnalysis(id) {
        try {
            const response = await axios.post(`${CAMERA_AI_URL}/cameras/${id}/stop-analysis`);
            return response.data;
        } catch (e) {
            throw new Error('Failed to stop camera analysis');
        }
    }

    /**
     * Get snapshot from camera
     */
    async getSnapshot(id) {
        try {
            const response = await axios.get(`${CAMERA_AI_URL}/cameras/${id}/snapshot`);
            return response.data.data;
        } catch (e) {
            throw new Error('Failed to get camera snapshot');
        }
    }

    /**
     * Save detection from Camera AI (webhook)
     */
    saveDetection(data) {
        const id = generateId();

        run(`
            INSERT INTO camera_detections (
                id, camera_id, detection_type, severity, location,
                image_path, task_created, task_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            id,
            data.camera_id,
            data.detection_type,
            data.severity,
            data.location,
            data.image_path,
            data.task_created ? 1 : 0,
            data.task_id
        ]);

        return get(`SELECT * FROM camera_detections WHERE id = ?`, [id]);
    }

    /**
     * Get detections for camera
     */
    getDetections(cameraId, limit = 50) {
        return all(`
            SELECT * FROM camera_detections 
            WHERE camera_id = ?
            ORDER BY created_at DESC
            LIMIT ?
        `, [cameraId, limit]);
    }

    /**
     * Get all recent detections
     */
    getAllDetections(limit = 100) {
        return all(`
            SELECT cd.*, c.name as camera_name, c.location as camera_location
            FROM camera_detections cd
            JOIN cameras c ON cd.camera_id = c.id
            ORDER BY cd.created_at DESC
            LIMIT ?
        `, [limit]);
    }

    /**
     * Get detection statistics
     */
    getStatistics() {
        const stats = get(`
            SELECT 
                COUNT(*) as total_detections,
                SUM(CASE WHEN detection_type = 'mess' THEN 1 ELSE 0 END) as mess_detections,
                SUM(CASE WHEN detection_type = 'idle' THEN 1 ELSE 0 END) as idle_detections,
                SUM(CASE WHEN task_created = 1 THEN 1 ELSE 0 END) as tasks_created
            FROM camera_detections
            WHERE created_at >= datetime('now', '-7 days')
        `);

        const byCamera = all(`
            SELECT c.id, c.name, COUNT(cd.id) as detection_count
            FROM cameras c
            LEFT JOIN camera_detections cd ON c.id = cd.camera_id
            WHERE cd.created_at >= datetime('now', '-7 days') OR cd.id IS NULL
            GROUP BY c.id
        `);

        return {
            ...stats,
            by_camera: byCamera
        };
    }
}

// Singleton
const cameraService = new CameraService();

module.exports = { CameraService, cameraService };

/**
 * BI Management - Backup Routes
 * مسارات النسخ الاحتياطي
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { checkPermission } = require('../middleware/checkPermission');
const { getBackupService } = require('../services/backup.service');

/**
 * GET /api/backup
 * قائمة النسخ الاحتياطية
 */
router.get('/', 
    authenticate, 
    checkPermission('system.backup.view'),
    async (req, res) => {
        try {
            const backupService = getBackupService();
            const backups = await backupService.listBackups();
            const totalSize = await backupService.getTotalBackupSize();

            res.json({
                success: true,
                data: backups,
                summary: {
                    count: totalSize.count,
                    total_size_mb: totalSize.mb,
                    total_size_gb: totalSize.gb
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: 'BACKUP_LIST_ERROR',
                message: error.message
            });
        }
    }
);

/**
 * POST /api/backup/create
 * إنشاء نسخة احتياطية
 */
router.post('/create',
    authenticate,
    checkPermission('system.backup.create'),
    async (req, res) => {
        try {
            const { description } = req.body;
            const backupService = getBackupService();
            const result = await backupService.createBackup(
                description || `Manual backup by ${req.user.name}`
            );

            res.json({
                success: true,
                data: result,
                message: 'تم إنشاء النسخة الاحتياطية بنجاح'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: 'BACKUP_CREATE_ERROR',
                message: error.message
            });
        }
    }
);

/**
 * POST /api/backup/restore/:filename
 * استعادة نسخة احتياطية
 */
router.post('/restore/:filename',
    authenticate,
    checkPermission('system.backup.restore'),
    async (req, res) => {
        try {
            const { filename } = req.params;
            const backupService = getBackupService();
            const result = await backupService.restoreBackup(filename);

            res.json({
                success: true,
                data: result,
                message: 'تم بدء استعادة النسخة الاحتياطية'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: 'BACKUP_RESTORE_ERROR',
                message: error.message
            });
        }
    }
);

/**
 * DELETE /api/backup/:filename
 * حذف نسخة احتياطية
 */
router.delete('/:filename',
    authenticate,
    checkPermission('system.backup.delete'),
    async (req, res) => {
        try {
            const { filename } = req.params;
            const backupService = getBackupService();
            const result = await backupService.deleteBackup(filename);

            res.json({
                success: true,
                data: result,
                message: 'تم حذف النسخة الاحتياطية'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: 'BACKUP_DELETE_ERROR',
                message: error.message
            });
        }
    }
);

/**
 * GET /api/backup/download/:filename
 * تحميل نسخة احتياطية
 */
router.get('/download/:filename',
    authenticate,
    checkPermission('system.backup.view'),
    async (req, res) => {
        try {
            const { filename } = req.params;
            const path = require('path');
            const backupPath = path.join(__dirname, '../../backups', filename);
            
            const fs = require('fs');
            if (!fs.existsSync(backupPath)) {
                return res.status(404).json({
                    success: false,
                    error: 'BACKUP_NOT_FOUND',
                    message: 'الملف غير موجود'
                });
            }

            res.download(backupPath, filename);
        } catch (error) {
            res.status(500).json({
                success: false,
                error: 'BACKUP_DOWNLOAD_ERROR',
                message: error.message
            });
        }
    }
);

module.exports = router;

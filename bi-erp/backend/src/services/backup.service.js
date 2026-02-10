/**
 * BI Management - Backup Service
 * خدمة النسخ الاحتياطي
 */

const fs = require('fs');
const path = require('path');
const { getDatabase } = require('../config/database');

// مسار ملف قاعدة البيانات الرئيسي (مطابق لـ config/database.js)
const mainDbPath = process.env.DATABASE_PATH || path.join(__dirname, '../../..', 'data', 'bi_management.db');

class BackupService {
    constructor() {
        this.backupDir = path.join(__dirname, '../../backups');
        this.mainDbPath = mainDbPath;
        this.maxBackups = 30; // Keep last 30 backups
        
        // Create backup directory if not exists
        if (!fs.existsSync(this.backupDir)) {
            fs.mkdirSync(this.backupDir, { recursive: true });
        }
    }

    /**
     * إنشاء نسخة احتياطية
     * @returns {object} معلومات النسخة الاحتياطية
     */
    async createBackup(description = 'Manual backup') {
        const db = getDatabase();
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `backup-${timestamp}.db`;
        const backupPath = path.join(this.backupDir, filename);

        try {
            // Export database to file
            const data = db.export();
            const buffer = Buffer.from(data);
            fs.writeFileSync(backupPath, buffer);

            // Get file size
            const stats = fs.statSync(backupPath);
            const sizeMB = (stats.size / 1024 / 1024).toFixed(2);

            // Log backup
            this.logBackup({
                filename,
                path: backupPath,
                size: stats.size,
                description,
                created_at: new Date().toISOString()
            });

            // Cleanup old backups
            this.cleanupOldBackups();

            console.log(`[Backup] Created: ${filename} (${sizeMB} MB)`);

            return {
                success: true,
                filename,
                path: backupPath,
                size: sizeMB + ' MB',
                created_at: new Date().toISOString()
            };
        } catch (error) {
            console.error('[Backup] Error creating backup:', error);
            throw error;
        }
    }

    /**
     * استعادة نسخة احتياطية
     * ينسخ محتوى ملف النسخة إلى ملف قاعدة البيانات الرئيسي.
     * يُنصح بإعادة تشغيل الخادم بعد الاسترجاع لتحميل البيانات الجديدة.
     * @param {string} filename اسم ملف النسخة
     */
    async restoreBackup(filename) {
        const backupPath = path.join(this.backupDir, filename);

        if (!fs.existsSync(backupPath)) {
            throw new Error('Backup file not found');
        }

        try {
            const buffer = fs.readFileSync(backupPath);
            const dir = path.dirname(this.mainDbPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(this.mainDbPath, buffer);
            console.log(`[Backup] Restored: ${filename} -> ${this.mainDbPath}`);
            return {
                success: true,
                message: 'تم استرجاع النسخة الاحتياطية بنجاح. يُنصح بإعادة تشغيل الخادم لتحميل البيانات الجديدة.',
                filename
            };
        } catch (error) {
            console.error('[Backup] Error restoring backup:', error);
            throw error;
        }
    }

    /**
     * قائمة النسخ الاحتياطية
     */
    listBackups() {
        try {
            const files = fs.readdirSync(this.backupDir)
                .filter(f => f.endsWith('.db'))
                .map(f => {
                    const filePath = path.join(this.backupDir, f);
                    const stats = fs.statSync(filePath);
                    return {
                        filename: f,
                        size: (stats.size / 1024 / 1024).toFixed(2) + ' MB',
                        created_at: stats.birthtime,
                        modified_at: stats.mtime
                    };
                })
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

            return files;
        } catch (error) {
            console.error('[Backup] Error listing backups:', error);
            return [];
        }
    }

    /**
     * حذف نسخة احتياطية
     */
    deleteBackup(filename) {
        const backupPath = path.join(this.backupDir, filename);

        if (!fs.existsSync(backupPath)) {
            throw new Error('Backup file not found');
        }

        try {
            fs.unlinkSync(backupPath);
            console.log(`[Backup] Deleted: ${filename}`);
            return { success: true, filename };
        } catch (error) {
            console.error('[Backup] Error deleting backup:', error);
            throw error;
        }
    }

    /**
     * تنظيف النسخ القديمة
     */
    cleanupOldBackups() {
        try {
            const backups = this.listBackups();
            
            if (backups.length > this.maxBackups) {
                const toDelete = backups.slice(this.maxBackups);
                
                for (const backup of toDelete) {
                    this.deleteBackup(backup.filename);
                }
                
                console.log(`[Backup] Cleaned up ${toDelete.length} old backups`);
            }
        } catch (error) {
            console.error('[Backup] Error cleaning up backups:', error);
        }
    }

    /**
     * تسجيل النسخة في قاعدة البيانات
     */
    logBackup(info) {
        try {
            const db = getDatabase();
            const { v4: uuid } = require('uuid');
            
            db.run(`
                INSERT INTO backups (id, filename, file_path, file_size, description, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [
                uuid(),
                info.filename,
                info.path,
                info.size,
                info.description,
                info.created_at
            ]);
        } catch (error) {
            // Table might not exist, ignore
            console.warn('[Backup] Could not log backup to database');
        }
    }

    /**
     * جدولة النسخ الاحتياطي التلقائي
     */
    scheduleAutoBackup() {
        // Run at 2:00 AM daily
        const now = new Date();
        const night = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate() + 1, // tomorrow
            2, 0, 0 // 2:00 AM
        );
        const msUntilMidnight = night.getTime() - now.getTime();

        setTimeout(() => {
            this.runAutoBackup();
            // Then run every 24 hours
            setInterval(() => this.runAutoBackup(), 24 * 60 * 60 * 1000);
        }, msUntilMidnight);

        console.log(`[Backup] Auto-backup scheduled for 2:00 AM daily`);
    }

    /**
     * تنفيذ النسخ الاحتياطي التلقائي
     */
    async runAutoBackup() {
        try {
            console.log('[Backup] Running automatic backup...');
            await this.createBackup('Automatic daily backup');
        } catch (error) {
            console.error('[Backup] Automatic backup failed:', error);
        }
    }

    /**
     * حساب حجم جميع النسخ
     */
    getTotalBackupSize() {
        try {
            const backups = this.listBackups();
            let totalBytes = 0;
            
            for (const backup of backups) {
                const filePath = path.join(this.backupDir, backup.filename);
                const stats = fs.statSync(filePath);
                totalBytes += stats.size;
            }
            
            return {
                bytes: totalBytes,
                mb: (totalBytes / 1024 / 1024).toFixed(2),
                gb: (totalBytes / 1024 / 1024 / 1024).toFixed(2),
                count: backups.length
            };
        } catch (error) {
            return { bytes: 0, mb: '0', gb: '0', count: 0 };
        }
    }
}

// Singleton instance
let backupService = null;

function getBackupService() {
    if (!backupService) {
        backupService = new BackupService();
    }
    return backupService;
}

module.exports = {
    BackupService,
    getBackupService
};

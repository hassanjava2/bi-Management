@echo off
echo ═══════════════════════════════════════════════════════════════
echo BI Management - Manual Backup
echo ═══════════════════════════════════════════════════════════════
echo.

cd backend

:: Run backup script
node -e "const {getBackupService} = require('./src/services/backup.service'); getBackupService().createBackup('Manual backup').then(r => console.log('Backup created:', r.filename)).catch(e => console.error('Error:', e.message))"

echo.
echo ═══════════════════════════════════════════════════════════════
echo Backup Complete!
echo ═══════════════════════════════════════════════════════════════
pause

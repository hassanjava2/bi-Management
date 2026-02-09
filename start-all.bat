@echo off
chcp 65001 >nul
echo.
echo ═══════════════════════════════════════════════════
echo         BI Management System - Start All
echo ═══════════════════════════════════════════════════
echo.

echo [1/3] Starting Backend API...
cd /d "%~dp0backend"
start cmd /k "npm install && npm run dev"

echo.
echo [2/3] Starting Inventory Entry System...
cd /d "%~dp0inventory-entry"
start cmd /k "npm install && npm start"

echo.
echo [3/3] Opening Admin Dashboard...
timeout /t 5 /nobreak >nul
start http://localhost:3000/api/health
start "%~dp0frontend\public\admin\index.html"

echo.
echo ═══════════════════════════════════════════════════
echo All services started!
echo.
echo Backend API:         http://localhost:3000/api
echo Inventory Entry:     http://localhost:3500
echo Admin Dashboard:     frontend/public/admin/index.html
echo ═══════════════════════════════════════════════════
echo.
pause

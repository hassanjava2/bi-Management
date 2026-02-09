@echo off
echo ═══════════════════════════════════════════════════════════════
echo BI Management - Production Start
echo ═══════════════════════════════════════════════════════════════
echo.

:: Set environment
set NODE_ENV=production

:: Check Node.js
node -v > nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not installed!
    pause
    exit /b 1
)

:: Create backups directory
if not exist "backend\backups" mkdir "backend\backups"

:: Create data directory
if not exist "backend\data" mkdir "backend\data"

:: Start Backend
echo [1/2] Starting Backend API...
cd backend
start /B node src/app.js

:: Wait for backend to start
timeout /t 3 /nobreak > nul

:: Check if backend is running
curl -s http://localhost:3000/api/health > nul 2>&1
if errorlevel 1 (
    echo [WARNING] Backend might not have started correctly
) else (
    echo [OK] Backend is running on http://localhost:3000
)

echo.
echo ═══════════════════════════════════════════════════════════════
echo BI Management Started Successfully!
echo ═══════════════════════════════════════════════════════════════
echo.
echo API: http://localhost:3000
echo Health: http://localhost:3000/api/health
echo.
echo Press Ctrl+C to stop
echo.

:: Keep window open
cmd /k

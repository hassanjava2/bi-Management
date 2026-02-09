@echo off
chcp 65001 > nul
title BI Smart Management System

echo ══════════════════════════════════════════════════════════
echo    BI للحاسبات - نظام الإدارة الذكي
echo    Beyond Intelligence Smart Management System
echo ══════════════════════════════════════════════════════════
echo.

:: التحقق من Python
python --version > nul 2>&1
if errorlevel 1 (
    echo ❌ Python غير مثبت! يرجى تثبيت Python 3.10 أو أحدث
    pause
    exit /b 1
)

:: التحقق من Node.js
node --version > nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js غير مثبت! يرجى تثبيت Node.js 18 أو أحدث
    pause
    exit /b 1
)

echo ✓ Python متوفر
echo ✓ Node.js متوفر
echo.

:: تثبيت متطلبات Python
echo 📦 جاري تثبيت متطلبات Python...
cd /d "d:\bi distor\server"
pip install -r requirements.txt -q

:: تهيئة قاعدة البيانات
echo.
echo 🗄️ جاري تهيئة قاعدة البيانات...
python init_database.py

:: تثبيت متطلبات Web
echo.
echo 📦 جاري تثبيت متطلبات الواجهة...
cd /d "d:\bi distor\web"
if not exist "node_modules" (
    call npm install
)

echo.
echo ══════════════════════════════════════════════════════════
echo    🚀 جاري تشغيل النظام...
echo ══════════════════════════════════════════════════════════
echo.
echo    📡 API Server: http://localhost:8000
echo    🌐 Web Dashboard: http://localhost:3000
echo    📚 API Docs: http://localhost:8000/docs
echo.
echo    💡 للإيقاف: اضغط Ctrl+C
echo ══════════════════════════════════════════════════════════
echo.

:: تشغيل السيرفر في نافذة جديدة
start "BI API Server" cmd /k "cd /d d:\bi distor\server && python main.py"

:: انتظار قليلاً ثم تشغيل الواجهة
timeout /t 3 /nobreak > nul
start "BI Web Dashboard" cmd /k "cd /d d:\bi distor\web && npm run dev"

:: فتح المتصفح
timeout /t 5 /nobreak > nul
start http://localhost:3000

echo ✅ النظام يعمل الآن!
echo.
pause

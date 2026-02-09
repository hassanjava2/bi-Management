# BI Smart Management System - PowerShell Startup Script
# نظام BI الذكي - سكربت التشغيل

$Host.UI.RawUI.WindowTitle = "BI Smart Management System"

Write-Host "══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "   BI للحاسبات - نظام الإدارة الذكي" -ForegroundColor White
Write-Host "   Beyond Intelligence Smart Management System" -ForegroundColor Gray
Write-Host "══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# التحقق من المتطلبات
$pythonExists = Get-Command python -ErrorAction SilentlyContinue
$nodeExists = Get-Command node -ErrorAction SilentlyContinue
$ollamaExists = Get-Command ollama -ErrorAction SilentlyContinue

if (-not $pythonExists) {
    Write-Host "❌ Python غير مثبت! يرجى تثبيت Python 3.10 أو أحدث" -ForegroundColor Red
    Read-Host "اضغط Enter للخروج"
    exit 1
}

if (-not $nodeExists) {
    Write-Host "❌ Node.js غير مثبت! يرجى تثبيت Node.js 18 أو أحدث" -ForegroundColor Red
    Read-Host "اضغط Enter للخروج"
    exit 1
}

Write-Host "✓ Python متوفر" -ForegroundColor Green
Write-Host "✓ Node.js متوفر" -ForegroundColor Green

if ($ollamaExists) {
    Write-Host "✓ Ollama متوفر - AI سيعمل محلياً" -ForegroundColor Green
} else {
    Write-Host "⚠ Ollama غير مثبت - AI سيعمل بردود محددة مسبقاً" -ForegroundColor Yellow
    Write-Host "  لتثبيت Ollama: https://ollama.ai" -ForegroundColor Gray
}

Write-Host ""

# تثبيت متطلبات Python
Write-Host "📦 جاري تثبيت متطلبات Python..." -ForegroundColor Yellow
Set-Location "d:\bi distor\server"
pip install -r requirements.txt -q

# تهيئة قاعدة البيانات
Write-Host ""
Write-Host "🗄️ جاري تهيئة قاعدة البيانات..." -ForegroundColor Yellow
python init_database.py

# تثبيت متطلبات Web
Write-Host ""
Write-Host "📦 جاري تثبيت متطلبات الواجهة..." -ForegroundColor Yellow
Set-Location "d:\bi distor\web"
if (-not (Test-Path "node_modules")) {
    npm install
}

Write-Host ""
Write-Host "══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "   🚀 جاري تشغيل النظام..." -ForegroundColor White
Write-Host "══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "   📡 API Server: " -NoNewline; Write-Host "http://localhost:8000" -ForegroundColor Green
Write-Host "   🌐 Web Dashboard: " -NoNewline; Write-Host "http://localhost:3000" -ForegroundColor Green
Write-Host "   📚 API Docs: " -NoNewline; Write-Host "http://localhost:8000/docs" -ForegroundColor Green
Write-Host ""
Write-Host "   💡 للإيقاف: اضغط Ctrl+C في كل نافذة" -ForegroundColor Gray
Write-Host "══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# تشغيل Ollama إذا كان موجوداً
if ($ollamaExists) {
    Write-Host "🤖 جاري تشغيل Ollama..." -ForegroundColor Yellow
    Start-Process -FilePath "ollama" -ArgumentList "serve" -WindowStyle Hidden
    Start-Sleep -Seconds 2
    
    # التحقق من وجود النموذج
    $models = ollama list 2>&1
    if ($models -notmatch "llama3.2|mistral|qwen") {
        Write-Host "⬇️ جاري تحميل نموذج AI (قد يستغرق بضع دقائق)..." -ForegroundColor Yellow
        ollama pull llama3.2
    }
}

# تشغيل السيرفر
Start-Process -FilePath "powershell" -ArgumentList "-NoExit", "-Command", "cd 'd:\bi distor\server'; python main.py" -WindowStyle Normal

# انتظار بدء السيرفر
Start-Sleep -Seconds 3

# تشغيل الواجهة
Start-Process -FilePath "powershell" -ArgumentList "-NoExit", "-Command", "cd 'd:\bi distor\web'; npm run dev" -WindowStyle Normal

# انتظار بدء الواجهة
Start-Sleep -Seconds 5

# فتح المتصفح
Start-Process "http://localhost:3000"

Write-Host "✅ النظام يعمل الآن!" -ForegroundColor Green
Write-Host ""
Read-Host "اضغط Enter للخروج من هذه النافذة (النظام سيستمر بالعمل)"

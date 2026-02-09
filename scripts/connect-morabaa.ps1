# ==========================================
# Bi Management - الاتصال بقاعدة المربع
# ==========================================

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "   Bi Management - استيراد بيانات المربع   " -ForegroundColor Cyan  
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# معلومات الاتصال
$serverName = Read-Host "ادخل اسم السيرفر (مثال: 192.168.1.100 او .\SQLEXPRESS)"
$databaseName = Read-Host "ادخل اسم قاعدة البيانات (مثال: MorabaaDB)"
$username = "sa"
$password = Read-Host "ادخل الباسوورد" -AsSecureString

# تحويل الباسوورد
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($password)
$plainPassword = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

Write-Host ""
Write-Host "جاري الاتصال..." -ForegroundColor Yellow

# حفظ معلومات الاتصال (بدون الباسوورد) في ملف
$configPath = "D:\bi Management\config\db-connection.json"
$config = @{
    server = $serverName
    database = $databaseName
    username = $username
    lastConnected = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
} | ConvertTo-Json

# إنشاء المجلد إذا ما موجود
New-Item -ItemType Directory -Path "D:\bi Management\config" -Force | Out-Null
$config | Out-File $configPath -Encoding UTF8

Write-Host ""
Write-Host "تم حفظ إعدادات الاتصال (بدون الباسوورد)" -ForegroundColor Green
Write-Host "المسار: $configPath" -ForegroundColor Gray
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "معلومات الاتصال:" -ForegroundColor Cyan
Write-Host "  Server:   $serverName" -ForegroundColor White
Write-Host "  Database: $databaseName" -ForegroundColor White
Write-Host "  Username: $username" -ForegroundColor White
Write-Host "  Password: ********" -ForegroundColor White
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# اختبار الاتصال إذا sqlcmd موجود
$sqlcmd = Get-Command sqlcmd -ErrorAction SilentlyContinue
if ($sqlcmd) {
    Write-Host "جاري اختبار الاتصال..." -ForegroundColor Yellow
    $testQuery = "SELECT @@VERSION"
    try {
        $result = sqlcmd -S $serverName -d $databaseName -U $username -P $plainPassword -Q $testQuery -W 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ تم الاتصال بنجاح!" -ForegroundColor Green
            Write-Host $result
        } else {
            Write-Host "❌ فشل الاتصال" -ForegroundColor Red
            Write-Host $result
        }
    } catch {
        Write-Host "❌ خطأ: $_" -ForegroundColor Red
    }
} else {
    Write-Host "⚠️  sqlcmd غير موجود - نحتاج ننزل SQL Server tools" -ForegroundColor Yellow
}

# مسح الباسوورد من الذاكرة
$plainPassword = $null
[System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($BSTR)

Write-Host ""
Write-Host "اضغط أي زر للإغلاق..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

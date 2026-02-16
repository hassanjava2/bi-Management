$base = "d:\bi Management\bi-erp\backend\src"
$files = @(
  "services/backup.service.js",
  "services/approval.service.js",
  "services/audit.service.js",
  "services/warranty.service.js",
  "services/encryption.service.js",
  "services/push.service.js",
  "services/scheduler.service.js",
  "services/camera.service.js",
  "services/alert.service.js",
  "services/ai-task.service.js",
  "services/invoiceWorkflow.service.js",
  "services/ai.service.js",
  "jobs/attendance.job.js",
  "jobs/alerts.job.js",
  "routes/products.routes.js",
  "routes/approval.routes.js",
  "middleware/protection.js",
  "middleware/checkPermission.js",
  "repositories/invoice.repository.js"
)

foreach ($f in $files) {
  $path = Join-Path $base $f
  if (Test-Path $path) {
    $c = Get-Content $path -Raw
    $c = $c -replace 'console\.error', 'logger.error'
    $c = $c -replace 'console\.log', 'logger.info'
    $c = $c -replace 'console\.warn', 'logger.warn'
    Set-Content $path $c -NoNewline
    Write-Output "Updated: $f"
  }
}

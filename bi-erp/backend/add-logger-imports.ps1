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
    $content = Get-Content $path -Raw
    $hasLogger = $content -match "require\(.+logger"
    if (-not $hasLogger) {
      # Determine relative path to logger from file location
      $depth = ($f -split '/').Count - 1
      $prefix = "../" * $depth
      $loggerRequire = "const logger = require('${prefix}utils/logger');"
      
      # Add after last require
      $lines = $content -split "`n"
      $lastReqIdx = -1
      for ($i = 0; $i -lt $lines.Count; $i++) {
        if ($lines[$i] -match "require\(") { $lastReqIdx = $i }
      }
      if ($lastReqIdx -ge 0) {
        $newLines = $lines[0..$lastReqIdx] + $loggerRequire + $lines[($lastReqIdx+1)..($lines.Count-1)]
        $newContent = $newLines -join "`n"
        Set-Content $path $newContent -NoNewline
        Write-Output "Added logger to: $f"
      }
    } else {
      Write-Output "Already has logger: $f"
    }
  }
}

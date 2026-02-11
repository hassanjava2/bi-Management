#!/bin/bash
# نشر BI-ERP على السيرفر
# الاستخدام: من جذر المستودع على السيرفر
#   cd /var/www/bi-management && git pull && cd bi-erp && chmod +x deploy.sh && ./deploy.sh

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "==> Building frontend..."
cd frontend
npm install --production=false
npm run build
cd ..

echo "==> Backend (install only, pm2 restart separately if needed)..."
cd backend
npm install --production
cd ..

# نسخ الواجهة للمجلد الثابت (عدّل المسار حسب إعداد Nginx على السيرفر)
WEB_DIR="${BI_ERP_WEB_DIR:-/var/www/bi-erp-web}"
if [ -d "$WEB_DIR" ]; then
  echo "==> Copying frontend to $WEB_DIR"
  cp -r frontend/dist/* "$WEB_DIR"/
fi

# إعادة تشغيل API إن كان مسجلاً في pm2 باسم bi-erp-api
if command -v pm2 &>/dev/null; then
  pm2 restart bi-erp-api 2>/dev/null || true
fi

echo "==> BI-ERP deploy done."

#!/bin/bash
# نشر المشروع على السيرفر
# أول مرة على السيرفر: chmod +x deploy.sh
# ثم: cd /var/www/bi-management && ./deploy.sh

set -e
cd /var/www/bi-management && git pull && cd frontend && npm install && npm run build && cp -r dist/* /var/www/bi-management-web/ && pm2 restart bi-api
echo "تم النشر بنجاح."

# السيرفر والنشر — BI Management / BI-ERP

## عناوين السيرفر

| الرابط | الحالة |
|--------|--------|
| http://76.13.154.123 | شغال حالياً |
| http://erp.biiraq.com | ينتظر DNS (10–30 دقيقة بعد التعديل) |

## تسجيل الدخول (لوحة التحكم / السيرفر)

- **المستخدم:** `admin`
- **كلمة المرور:** `Admin@123`

---

## أوامر مفيدة على السيرفر

### نشر المشروع الحالي (الجذر: frontend + backend كـ bi-api)

المسار المتوقع على السيرفر: `/var/www/bi-management`

```bash
# أول مرة: صلاحيات السكربت
chmod +x deploy.sh

# النشر (سحب من Git، بناء الواجهة، إعادة تشغيل API)
cd /var/www/bi-management && ./deploy.sh
```

محتوى `deploy.sh` الحالي:

```bash
cd /var/www/bi-management && git pull && cd frontend && npm install && npm run build && cp -r dist/* /var/www/bi-management-web/ && pm2 restart bi-api
```

### إذا كان السيرفر يشغّل BI-ERP (مجلد bi-erp)

**إذا ظهر `Permission denied` عند تشغيل أي `./deploy.sh`:**
```bash
chmod +x deploy.sh
# أو داخل bi-erp:
chmod +x bi-erp/deploy.sh
```

**إذا ظهر `chmod: cannot access 'deploy.sh': No such file or directory`** (الملف غير موجود في المستودع على السيرفر)، أنشئ الملف يدوياً ثم شغّله:

```bash
cd /var/www/bi-management/bi-erp

cat > deploy.sh << 'DEPLOY_EOF'
#!/bin/bash
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"
echo "==> Building frontend..."
cd frontend && npm install --production=false && npm run build && cd ..
echo "==> Backend..."
cd backend && npm install --production && cd ..
WEB_DIR="${BI_ERP_WEB_DIR:-/var/www/bi-erp-web}"
if [ -d "$WEB_DIR" ]; then
  echo "==> Copying frontend to $WEB_DIR"
  cp -r frontend/dist/* "$WEB_DIR"/
fi
if command -v pm2 &>/dev/null; then
  pm2 restart bi-erp-api 2>/dev/null || true
fi
echo "==> BI-ERP deploy done."
DEPLOY_EOF

chmod +x deploy.sh
./deploy.sh
```

**أو نفّذ النشر خطوة بخطوة بدون سكربت:**

```bash
cd /var/www/bi-management
git pull

# Backend
cd bi-erp/backend
npm install
pm2 restart bi-erp-api   # أو الاسم الذي استخدمته في pm2

# Frontend (بناء ونسخ للمجلد الثابت)
cd ../frontend
npm install
npm run build
cp -r dist/* /var/www/bi-erp-web/   # عدّل المسار حسب إعداد Nginx
```

### أوامر PM2 مفيدة

```bash
pm2 list                 # عرض التطبيقات
pm2 logs bi-api          # سجلات API
pm2 restart bi-api       # إعادة تشغيل
pm2 restart all          # إعادة تشغيل الكل
```

### Nginx (إن وُجد)

**مهم لـ erp.biiraq.com:** يجب توجيه `/api` و WebSocket إلى **bi-erp-api** وليس bi-api، وإلا ستظهر أخطاء 404 وقطع Socket.

مثال إعداد موقع لـ BI-ERP:

```nginx
server {
    listen 80;
    server_name erp.biiraq.com;
    root /var/www/bi-erp-web;
    index index.html;
    location / {
        try_files $uri $uri/ /index.html;
    }
    location /api/ {
        proxy_pass http://127.0.0.1:3001;   # منفذ bi-erp-api (عدّله إن اختلف)
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    location /socket.io/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

تأكد من أن منفذ bi-erp-api (مثلاً 3001) يطابق ما في `PORT` أو إعداد pm2.

```bash
sudo nginx -t            # فحص التكوين
sudo systemctl reload nginx
```

---

## رفع التعديلات من جهازك إلى GitHub

المستودع: **https://github.com/hassanjava2/bi-Management**

1. بعد التعديلات محلياً:
   ```bash
   git add -A
   git commit -m "وصف التعديلات"
   git push origin main
   ```

2. إذا طلب Git اسم مستخدم وكلمة مرور، استخدم:
   - **اسم المستخدم:** حساب GitHub (مثلاً hassanjava2)
   - **كلمة المرور:** Personal Access Token (PAT) وليس كلمة مرور الحساب

3. إن ظهر خطأ 403 عند الـ push:
   - تأكد أن الـ PAT له صلاحية **repo** (قراءة/كتابة للمستودعات).
   - من GitHub: Settings → Developer settings → Personal access tokens → إنشاء أو تعديل توكن مع repo.

4. **أمان:** لا تضف الـ PAT داخل أي ملف في المشروع. بعد الانتهاء من الاستخدام يُفضّل تدوير/حذف التوكن من إعدادات GitHub.

---

## بعد النشر

- التحقق من الصحة: `GET http://76.13.154.123/api/health` (أو المسار الفعلي للـ API).
- التأكد من تسجيل الدخول والصلاحيات.
- مراجعة `docs/DEPLOYMENT-CHECKLIST.md` للتحقق الكامل.

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

```bash
sudo systemctl status nginx
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

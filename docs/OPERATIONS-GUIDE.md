# دليل التشغيل والنشر — نظام BI Smart Management

دليل واحد محدّث يوضح كيفية تشغيل النظام محلياً ونشره، ومتى يُستخدم النظام الحالي ومتى v3.

---

## ١. النظام المعتمد حاليًا (مصدر الحقيقة)

- **الاعتماد الرسمي:** النظام المعتمد للتشغيل والإنتاج هو **النظام الحالي** (Backend Node/Express + Frontend React/Vite + قاعدة SQLite عبر sql.js).
- **المسار:** مجلدات `backend/` و `frontend/` في الجذر.
- **قاعدة البيانات:** SQLite — ملف واحد (افتراضياً `data/bi_management.db` أو حسب `DATABASE_PATH` في `.env`).
- **نسخة v3 (bi-management-v3):** مشروع منفصل (Monorepo، Hono، PostgreSQL، Drizzle) — جزء من الميزات منقول فقط. **لا يُعتبر النظام المعتمد** حتى إكمال النقل وتوحيد التشغيل. انظر [توحيد النظام](#٣-توحيد-النظام-والنقل-إلى-v3) أدناه.

---

## ٢. التشغيل المحلي (النظام الحالي)

### المتطلبات
- Node.js 18+
- npm 9+

### الخطوات

1. **إعداد الـ Backend**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # عدّل .env: DATABASE_PATH, JWT_SECRET, CORS_ORIGIN، إلخ
   npm run db:init
   npm start
   ```
   الـ API يعمل على المنفذ 3000 (أو حسب `PORT` في `.env`).

2. **إعداد الـ Frontend**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   الواجهة تعمل على المنفذ 5173 (Vite).

3. **الوصول**
   - الواجهة: `http://localhost:5173`
   - API: `http://localhost:3000/api`

### تشغيل الكل من الجذر
- إن وُجد سكربت: `npm run start:all` أو `start.bat` / `start.ps1` من الجذر (حسب ما هو موثّق في README).

---

## ٣. التشغيل بـ Docker (للإنتاج)

- يوجد `docker-compose.yml` في الجذر يتضمن PostgreSQL، Redis، Backend، Frontend، AI، Ollama، Nginx.
- **ملاحظة:** تكوين Docker الحالي يستخدم PostgreSQL وربط Backend به؛ بينما النظام الحالي الافتراضي يستخدم SQLite. للتشغيل الفعلي بـ Docker يلزم:
  - إما تعديل Backend ليتصل بـ PostgreSQL عند وجود `DATABASE_URL`،
  - أو استخدام تكوين Docker مبني على SQLite (حجم واحد).
- للتفاصيل: راجع `docker-compose.yml` وملفات الـ Dockerfile في `backend/` و `frontend/`.

---

## ٤. توحيد النظام والنقل إلى v3

- **القرار الحالي:** الاعتماد على **النظام الحالي** (Backend + Frontend أعلاه) حتى إكمال نقل الميزات إلى v3 واتخاذ قرار بالاعتماد عليها.
- **عند الرغبة بالانتقال لـ v3 لاحقاً:** اتبع `bi-management-v3/README.md` و `PROGRESS/TRANSFER-VERIFY.md` و `PROGRESS/AUDIT-V3-CHECKLIST.md`، ثم حدّث هذا الدليل ليعكس أن v3 أصبح النظام المعتمد.

---

## ٥. مراجع إضافية

- التثبيت والبنية: `README.md`
- الإعدادات والـ .env: `README.md` (قسم الإعدادات)
- قائمة تحقق النشر: `docs/DEPLOYMENT-CHECKLIST.md`
- النسخ الاحتياطي والاستعادة: `docs/BACKUP-RESTORE.md`

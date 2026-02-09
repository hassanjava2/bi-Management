# بيئة قاعدة البيانات — SQLite مقابل PostgreSQL

هذا الملف يوضح الفروقات بين التصميم الموثق في نظام الأمان والتدقيق والتنفيذ الحالي.

---

## البيئة الحالية (Backend الحالي)

- **نوع القاعدة:** SQLite
- **الملف:** [backend/src/config/database.js](backend/src/config/database.js) — يستخدم `sql.js` (SQLite في الذاكرة/ملف).
- **مسار الملف:** من متغير البيئة `DATABASE_PATH` أو افتراضياً `data/bi_management.db`.
- **واجهة الاستعلام:** دوال `run`, `get`, `all` من `config/database` (لا واجهة `db.query` بنمط PostgreSQL).

---

## وثيقة التصميم (SECURITY-AND-AUDIT-SYSTEM)

- [PLANNING/SECURITY-AND-AUDIT-SYSTEM.md](PLANNING/SECURITY-AND-AUDIT-SYSTEM.md) تعتمد بناء جملة **PostgreSQL**:
  - `gen_random_uuid()`, `uuid_generate_v4()`
  - `JSONB`
  - `TIMESTAMP`, `INTERVAL`
  - **Triggers** (مثل منع التعديل المباشر للكميات)

---

## ما تم تنفيذه لـ SQLite

- جداول: `audit_logs`, `approvals`, `invoices`, `invoice_items`, `users`, `roles`, إلخ (حسب [database/schema_v3_sqlite.sql](../database/schema_v3_sqlite.sql)).
- دوال التدقيق والموافقات تستخدم `run`/`get`/`all` من `config/database`.
- لا استخدام لـ Triggers في SQLite في التنفيذ الحالي.

---

## ما لم يُنقل (أو يُنفّذ بآلية أخرى)

- **Triggers** (مثل منع التعديل المباشر للكميات على الجداول): غير مطبقة في SQLite في هذا المشروع.
- **الحل:** تنفيذ منطق "منع التعديل المباشر للكميات" في **طبقة التطبيق**:
  - في الخدمات أو مسارات الـ API التي تحدّث حقول الكمية (مثلاً `products.quantity`، حركات المخزون).
  - السماح فقط بالتحديث عبر مسارات معتمدة: فاتورة شراء/بيع، إرجاع، نقل، جرد معتمد، أو طلب موافقة `quantity_correction` معتمد.
  - أي تحديث كمية دون مرجع معتمد: رفض الطلب وتسجيل المحاولة في سجل التدقيق إن أمكن.
  - مرجع: [backend/src/middleware/protection.js](backend/src/middleware/protection.js) — `protectQuantityChange` في مسارات الأجهزة.

---

## توحيد القاعدة لاحقاً

في حال الانتقال إلى PostgreSQL (مثلاً مع نسخة v3)، يُنصح بـ:

- إعادة تطبيق الـ Triggers الموثقة في SECURITY-AND-AUDIT-SYSTEM.
- مراجعة قائمة تحقق التدقيق في [PROGRESS/AUDIT-V3-CHECKLIST.md](../PROGRESS/AUDIT-V3-CHECKLIST.md).

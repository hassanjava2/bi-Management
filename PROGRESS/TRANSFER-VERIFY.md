# قائمة النقل والتأكد — BI Management v3

> نقل الأفكار والميزات من النظام القديم (Node/Express/SQLite) إلى v3 (Monorepo/Hono/PostgreSQL) مع التأكد من اكتمال كل بند.

---

## 1. البنية والبنية التحتية

| البند | النظام القديم | v3 | الحالة |
|-------|----------------|-----|--------|
| هيكل المشروع | backend, frontend, web منفصلة | Monorepo (apps + packages) | ✅ تم |
| API | Express (Node) | Hono (apps/api) | ✅ تم |
| قاعدة البيانات | SQLite (schema_v3_sqlite.sql) | PostgreSQL + Drizzle | ✅ تم |
| التسمية | mixed | snake_case DB, kebab-case API | ✅ مطبّق |

---

## 2. الصلاحيات والأدوار

| البند | النظام القديم | v3 | الحالة |
|-------|----------------|-----|--------|
| الأدوار الـ 12 | roles في permissions_seed.sql | packages/database schema + seed | ✅ تم |
| 743 صلاحية | permissions_seed.sql | تحميل كامل عبر db:seed:full (PostgreSQL) | ✅ تم |
| role_permissions | جدول ربط | rolePermissions في Drizzle | ✅ تم |

---

## 3. المنتجات والمخزون

| البند | النظام القديم | v3 | الحالة |
|-------|----------------|-----|--------|
| التصنيفات الهرمية | categories (parent_id) | schema categories | ✅ تم |
| المنتجات + specs JSON | products | schema products | ✅ تم |
| السيريال BI-YYYY-XXXXXX | serial_numbers | schema serial_numbers + warehouse_locations | ✅ تم |
| 7 أنواع مخازن | warehouses type | warehouses.type | ✅ تم |
| حركة المخزون | inventory_movements, serial_movements | schema | ✅ تم |
| المخزون غير المسلسل | inventory | schema inventory | ✅ تم |

---

## 4. الفواتير والمبيعات

| البند | النظام القديم | v3 | الحالة |
|-------|----------------|-----|--------|
| 10+ أنواع فواتير | invoices (type) | schema invoices + invoice_items | ✅ تم |
| العملاء والموردين | customers, suppliers | schema customers, suppliers, customer_contacts | ✅ تم |
| بنود الفاتورة + مدفوعات + أقساط | invoice_items, invoice_payments, installment_schedules | schema | ✅ تم |
| المرتجعات بالألوان | returns | schema returns | ✅ تم |

---

## 5. المالية والـ HR والتوصيل

| البند | النظام القديم | v3 | الحالة |
|-------|----------------|-----|--------|
| شجرة الحسابات | accounts | schema accounts | ✅ تم |
| قيود يومية وبنود | journal_entries, journal_entry_lines | schema | ✅ تم |
| القاصات وحركاتها | cash_registers, cash_transactions | schema cash | ✅ تم |
| الحسابات البنكية والشيكات | bank_accounts, checks | schema cash | ✅ تم |
| سندات القبض/الصرف | vouchers | schema cash | ✅ تم |
| الصيانة (أوامر، قطع، سجل) | maintenance_orders, maintenance_parts, maintenance_history | schema maintenance | ✅ تم |
| بنود وأسباب المرتجع | return_items, return_reasons | schema return-items | ✅ تم |
| الموظفين والحضور | employees, attendance, departments, positions | schema hr | ✅ تم |
| الرواتب والسلف والإجازات | salaries, salary_advances, leaves | schema hr | ✅ تم |
| التوصيل (سائقين، طلبات، تتبع) | delivery_drivers, delivery_orders, delivery_tracking | schema delivery | ✅ تم |

---

## 6. الأسهم والإشعارات والنظام

| البند | النظام القديم | v3 | الحالة |
|-------|----------------|-----|--------|
| المساهمين ومعاملات الأسهم | shareholders, share_transactions | schema shareholders | ✅ تم |
| توزيع الأرباح وتفاصيله | dividends, dividend_details | schema | ✅ تم |
| الإشعارات (متعددة القنوات) | notifications | schema notifications | ✅ تم |
| إعدادات إشعارات المستخدم | notification_settings | schema | ✅ تم |
| سجل التدقيق | audit_logs | schema audit | ✅ تم |
| طلبات الموافقة | approvals | schema | ✅ تم |
| إعدادات النظام | settings | schema | ✅ تم |
| النسخ الاحتياطية | backups | schema | ✅ تم |

---

## 7. واجهة الويب والتطبيقات

| البند | النظام القديم | v3 | الحالة |
|-------|----------------|-----|--------|
| واجهة الويب | frontend (React) / web (Next) | apps/web: تخطيط، سايدبار، لوحة تحكم، تسجيل دخول، صفحات قوائم (منتجات، تصنيفات، فروع، مخازن، عملاء) متصلة بالـ API | ✅ تم |
| الموبايل | bi-management-mobile | apps/mobile | ⏳ قادم |
| Auth | JWT في backend | تسجيل دخول + JWT + middleware | ✅ تم |

---

## ملخص

- **تم نقله ومُتحقق منه:** Monorepo، API، Schema كامل (ما يعادل 87 جدول): صلاحيات/أدوار، مستخدمين، فروع، تصنيفات، منتجات، مخازن، مواقع، سيريالات وحركتها، عملاء، موردين، جهات اتصال، مخزون وحركة مخزون، فواتير وبنود ومدفوعات وأقساط، مرتجعات وبنودها وأسبابها، صيانة (أوامر، قطع، سجل)، شجرة حسابات وقيود يومية، قاصات وحسابات بنكية وشيكات وسندات قبض/صرف، موارد بشرية (أقسام، مناصب، موظفين، حضور، رواتب، سلف، إجازات)، توصيل (سائقين، طلبات، تتبع)، أسهم وشراكة (مساهمين، معاملات، أرباح)، إشعارات وإعداداتها، سجل تدقيق، موافقات، إعدادات نظام، نسخ احتياطية. مسارات API: health، auth، roles، categories، products، branches، warehouses، customers، suppliers.
- **قيد النقل لاحقاً:** تطبيق الموبايل، مزيد من صفحات الويب والربط بالـ API، CRUD كامل، تقارير، مالية، مشتريات، مرتجعات، صيانة، HR، توصيل، إشعارات، موافقات (راجع **PROGRESS/FEATURES-STATUS.md** لتفاصيل الـ 840+ ميزة وما تم وما بقي).

---

---

## 8. مسارات API

| المسار | الوصف | الحالة |
|--------|--------|--------|
| GET /api/health | صحة الخدمة | ✅ |
| GET /api/roles | قائمة الأدوار | ✅ |
| GET /api/categories | قائمة التصنيفات (مع pagination) | ✅ |
| GET /api/categories/:id | تفاصيل تصنيف | ✅ |
| POST /api/categories | إنشاء تصنيف | ✅ |
| PUT /api/categories/:id | تعديل تصنيف | ✅ |
| DELETE /api/categories/:id | تعطيل تصنيف | ✅ |
| GET /api/products | قائمة المنتجات (مع pagination) | ✅ |
| GET /api/products/:id | تفاصيل منتج | ✅ |
| POST /api/products | إنشاء منتج | ✅ |
| PUT /api/products/:id | تعديل منتج | ✅ |
| DELETE /api/products/:id | حذف منتج (أرشفة) | ✅ |
| GET /api/branches | قائمة الفروع (مع pagination) | ✅ |
| GET /api/branches/:id | تفاصيل فرع | ✅ |
| POST /api/branches | إنشاء فرع | ✅ |
| PUT /api/branches/:id | تعديل فرع | ✅ |
| DELETE /api/branches/:id | تعطيل فرع | ✅ |
| GET /api/warehouses | قائمة المخازن (مع pagination) | ✅ |
| GET /api/warehouses/:id | تفاصيل مخزن | ✅ |
| POST /api/warehouses | إنشاء مخزن | ✅ |
| PUT /api/warehouses/:id | تعديل مخزن | ✅ |
| DELETE /api/warehouses/:id | تعطيل مخزن | ✅ |
| GET /api/customers | قائمة العملاء (مع pagination) | ✅ |
| GET /api/customers/:id | تفاصيل عميل | ✅ |
| POST /api/customers | إنشاء عميل | ✅ |
| PUT /api/customers/:id | تعديل عميل | ✅ |
| DELETE /api/customers/:id | أرشفة عميل | ✅ |
| GET /api/suppliers | قائمة الموردين (مع pagination) | ✅ |
| GET /api/suppliers/:id | تفاصيل مورد | ✅ |
| POST /api/suppliers | إنشاء مورد | ✅ |
| PUT /api/suppliers/:id | تعديل مورد | ✅ |
| DELETE /api/suppliers/:id | أرشفة مورد | ✅ |
| GET /api/stats | إحصائيات (عدود + فواتير + مستخدمون + أدوار، يتطلب JWT) | ✅ |
| GET /api/invoices | قائمة الفواتير (مع pagination، يتطلب JWT) | ✅ |
| GET /api/invoices/:id | تفاصيل فاتورة مع البنود | ✅ |
| GET /api/permissions | قائمة الصلاحيات (مع pagination، يتطلب JWT) | ✅ |
| GET /api/users | قائمة المستخدمين (مع pagination، يتطلب JWT) | ✅ |
| GET /api/users/:id | تفاصيل مستخدم (بدون كلمة المرور) | ✅ |
| GET /api/accounts | قائمة الحسابات (شجرة الحسابات، مع pagination) | ✅ |
| GET /api/accounts/:id | تفاصيل حساب | ✅ |
| GET /api/journal-entries | قائمة القيود اليومية (مع pagination) | ✅ |
| GET /api/journal-entries/:id | تفاصيل قيد مع البنود | ✅ |
| GET /api/roles، categories، products، branches، warehouses، customers، suppliers، accounts، journal-entries | كلها تتطلب JWT | ✅ |
| GET /api/health/db | صحة الخدمة + اتصال قاعدة البيانات | ✅ |
| POST /api/auth/login | تسجيل الدخول (username, password) | ✅ |
| GET /api/auth/me | المستخدم الحالي (يتطلب Authorization) | ✅ |

---

## 9. تشغيل v3 مع PostgreSQL

| الخطوة | الأمر | الوصف |
|--------|--------|--------|
| 1 | `cd bi-management-v3 && docker compose up -d` | تشغيل PostgreSQL (منفذ 5433) |
| 2 | إنشاء `.env` وضبط `DATABASE_URL=postgresql://bi_v3:BiV3Secure2024@localhost:5433/bi_management_v3` | إعداد الاتصال |
| 3 | `npm run db:generate` ثم `npm run db:migrate` | إنشاء الجداول (Drizzle) |
| 4 | `npm run db:seed` | 12 دور + مستخدم admin/1111 + عينة صلاحيات |
| 5 | `npm run db:seed:full` (من مجلد v3، مع وجود مسار المشروع الرئيسي) | تحميل 743 صلاحية كاملة |
| 6 | `npm run dev:api` و `npm run dev:web` | تشغيل الـ API والواجهة |

**ملاحظة:** v3 مبني على **Hono + PostgreSQL + Drizzle** (وليس Laravel). إذا رغبت بطبقة API بلارفل مع نفس قاعدة PostgreSQL، يمكن إضافة مشروع Laravel منفصل يشير إلى نفس `DATABASE_URL`.

*آخر تحديث: 2026-02-04*

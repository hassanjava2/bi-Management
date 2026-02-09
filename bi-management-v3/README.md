# BI Management v3 — Monorepo

إعادة بناء النظام من الصفر: React 19، Hono، PostgreSQL، Drizzle، مع الحفاظ على كل الأفكار (743 صلاحية، 12 دور، 87 جدول).

## الهيكل

```
bi-management-v3/
├── apps/
│   ├── api/          # Backend (Hono) — http://127.0.0.1:3001
│   └── web/          # واجهة الويب (React 19 + Vite)
├── packages/
│   ├── database/     # Drizzle schema + migrations + seeds
│   └── shared/       # Types + constants مشتركة
├── package.json
└── turbo.json
```

## المتطلبات

- Node.js 18+
- PostgreSQL (قاعدة `bi_management_v3`)

## التثبيت والتشغيل

```bash
# من مجلد bi-management-v3
npm install

# تثبيت تبعيات كل تطبيق (إن لزم)
cd apps/api    && npm install && cd ../..
cd apps/web    && npm install && cd ../..
cd packages/database && npm install && cd ../..
cd packages/shared    && npm install && cd ../..

# تشغيل الـ API
cd apps/api && npm run dev

# تشغيل الويب (في طرف آخر)
cd apps/web && npm run dev
```

## قاعدة البيانات (PostgreSQL)

### باستخدام Docker (مُفضّل)

```bash
# من مجلد bi-management-v3
docker compose up -d

# إنشاء ملف .env في الجذر (أو في apps/api) مع:
# DATABASE_URL=postgresql://bi_v3:BiV3Secure2024@localhost:5433/bi_management_v3
```

ثم من جذر **المشروع الرئيسي** (d:\bi Management) أو من `bi-management-v3`:

```bash
cd bi-management-v3
npm run db:generate   # توليد migrations
npm run db:migrate    # تنفيذ الـ schema
npm run db:seed       # 12 دور + مستخدم admin/1111 + عينة صلاحيات
npm run db:seed:full  # تحميل الـ 743 صلاحية من database/seeds/permissions_seed.sql (يشترط وجود المسار من الجذر)
```

### بدون Docker

1. إنشاء قاعدة: `createdb bi_management_v3`
2. نسخ `.env.example` إلى `.env` وتعديل `DATABASE_URL` (منفذ 5432 عادة)
3. نفس الأوامر أعلاه: `db:generate` → `db:migrate` → `db:seed` ثم `db:seed:full` إن رغبت بالصلاحيات الكاملة

## مسارات API (أمثلة)

| المسار | الوصف |
|--------|--------|
| GET /api/health | صحة الخدمة |
| POST /api/auth/login | تسجيل الدخول (body: `{ "username", "password" }`) |
| GET /api/auth/me | المستخدم الحالي (Header: `Authorization: Bearer <token>`) |
| GET /api/roles | قائمة الأدوار |
| GET /api/categories?page=1&limit=20 | التصنيفات النشطة |
| GET /api/products?page=1&limit=20 | المنتجات |
| GET /api/branches?page=1&limit=20 | الفروع |
| GET /api/warehouses?page=1&limit=20 | المخازن |
| GET /api/customers?page=1&limit=20 | العملاء |
| GET /api/suppliers?page=1&limit=20 | الموردين |
| GET /api/stats | إحصائيات لوحة التحكم (عدود) |
| GET /api/invoices?page=1&limit=20 | الفواتير |
| GET /api/permissions?page=1&limit=50 | الصلاحيات |
| GET /api/users?page=1&limit=20 | المستخدمون |
| GET /api/health | صحة الخدمة |
| GET /api/health/db | صحة الخدمة + اتصال DB |

مستخدم افتراضي بعد التشغيل: **admin** / **1111**

## قائمة النقل والتأكد

راجع `PROGRESS/TRANSFER-VERIFY.md` في جذر المشروع الرئيسي (d:\bi Management) لتفاصيل ما تم نقله وما بقي.

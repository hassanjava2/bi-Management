# قاعدة البيانات — PostgreSQL فقط

التطبيق يعتمد على **PostgreSQL** فقط. لا يوجد دعم لـ SQLite.

## المتطلبات

- **DATABASE_URL** مطلوب في `backend/.env`. بدونها لن يعمل الخادم.

## الإعداد

1. إنشاء قاعدة بيانات في PostgreSQL:
   ```bash
   createdb bi_management
   ```

2. في ملف `backend/.env` عيّن:
   ```env
   DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/bi_management
   ```

3. تشغيل التهيئة:
   ```bash
   cd backend && node src/scripts/init-database.js
   ```
   سيتم تشغيل `database/schema_postgres.sql` وإنشاء الجداول ومستخدم المدير إن لم يوجد.

4. تشغيل الـ API:
   ```bash
   npm run dev
   ```

## الاستخدام في الكود

جميع دوال قاعدة البيانات **غير متزامنة (async)** ويجب استدعاؤها مع `await`:

- `run(sql, params)` — تنفيذ INSERT/UPDATE/DELETE
- `get(sql, params)` — صف واحد أو null
- `all(sql, params)` — مصفوفة الصفوف
- `transaction(fn)` — تنفيذ داخل transaction

استيراد من `../config/database`:

```js
const { run, get, all, transaction } = require('../config/database');

// في دالة async:
const user = await get('SELECT * FROM users WHERE id = $1', [id]);
await run('UPDATE users SET name = $1 WHERE id = $2', [name, id]);
const rows = await all('SELECT * FROM tasks');
```

(الملف `database.js` يحوّل تلقائياً `?` إلى `$1, $2, ...`).

## الملفات ذات الصلة

- `backend/src/config/database.js` — تهيئة الاتصال ودوال run/get/all/transaction.
- `database/schema_postgres.sql` — تعريف الجداول لـ PostgreSQL.
- `backend/.env.example` — مثال لـ `DATABASE_URL`.

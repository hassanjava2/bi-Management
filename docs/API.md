# 📡 BI Management - API Documentation
# توثيق واجهة برمجة التطبيقات

## 📋 المحتويات

1. [المقدمة](#المقدمة)
2. [المصادقة](#المصادقة)
3. [هيكل الاستجابة](#هيكل-الاستجابة)
4. [الأخطاء](#الأخطاء)
5. [Endpoints](#endpoints)

---

## المقدمة

### Base URL
```
http://localhost:3000/api
```

### Headers المطلوبة
```http
Content-Type: application/json
Authorization: Bearer <token>
```

### Rate Limiting
- 100 طلب لكل 15 دقيقة
- الاستجابة عند التجاوز: `429 Too Many Requests`

---

## المصادقة

### تسجيل الدخول
```http
POST /api/auth/login
```

**Request:**
```json
{
    "username": "admin",
    "password": "Admin@123"
}
```

**Response (200):**
```json
{
    "success": true,
    "data": {
        "token": "eyJhbGciOiJIUzI1NiIs...",
        "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
        "user": {
            "id": "user_xxx",
            "username": "admin",
            "full_name": "مدير النظام",
            "role": "admin",
            "security_level": 4
        }
    }
}
```

### تجديد التوكن
```http
POST /api/auth/refresh-token
```

**Request:**
```json
{
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

### تسجيل الخروج
```http
POST /api/auth/logout
Authorization: Bearer <token>
```

### المستخدم الحالي
```http
GET /api/auth/me
Authorization: Bearer <token>
```

---

## هيكل الاستجابة

### استجابة ناجحة
```json
{
    "success": true,
    "data": { ... },
    "message": "تمت العملية بنجاح"
}
```

### استجابة مع قائمة (Pagination)
```json
{
    "success": true,
    "data": [ ... ],
    "pagination": {
        "page": 1,
        "limit": 20,
        "total": 150,
        "totalPages": 8
    }
}
```

---

## الأخطاء

### أكواد الأخطاء

| الكود | المعنى |
|-------|--------|
| 400 | طلب غير صالح |
| 401 | غير مصرح |
| 403 | ممنوع |
| 404 | غير موجود |
| 422 | بيانات غير صالحة |
| 429 | كثرة الطلبات |
| 500 | خطأ في السيرفر |

### هيكل الخطأ
```json
{
    "success": false,
    "error": "ERROR_CODE",
    "message": "وصف الخطأ",
    "details": { ... }
}
```

---

## Endpoints

### 👥 المستخدمين `/api/users`

#### قائمة المستخدمين
```http
GET /api/users
Authorization: Bearer <token>
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| page | number | رقم الصفحة (default: 1) |
| limit | number | العدد (default: 20) |
| search | string | بحث بالاسم |
| role | string | فلترة بالدور |

#### إنشاء مستخدم
```http
POST /api/users
Authorization: Bearer <token>
Permission: system.users.create
```

**Request:**
```json
{
    "username": "user1",
    "email": "user1@example.com",
    "password": "Password@123",
    "full_name": "اسم المستخدم",
    "role_id": "role_salesperson",
    "phone": "07901234567"
}
```

#### تفاصيل مستخدم
```http
GET /api/users/:id
Authorization: Bearer <token>
```

#### تحديث مستخدم
```http
PUT /api/users/:id
Authorization: Bearer <token>
Permission: system.users.edit
```

#### حذف مستخدم
```http
DELETE /api/users/:id
Authorization: Bearer <token>
Permission: system.users.delete
```

---

### 📦 المنتجات `/api/products`

#### قائمة المنتجات
```http
GET /api/products
Authorization: Bearer <token>
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| page | number | رقم الصفحة |
| limit | number | العدد |
| search | string | بحث |
| category_id | string | التصنيف |
| in_stock | boolean | متوفر فقط |

#### إنشاء منتج
```http
POST /api/products
Authorization: Bearer <token>
Permission: inventory.product.create
```

**Request:**
```json
{
    "name": "اسم المنتج",
    "sku": "SKU-001",
    "barcode": "1234567890123",
    "category_id": "cat_xxx",
    "price": 100.00,
    "cost": 80.00,
    "min_stock": 10,
    "description": "وصف المنتج"
}
```

---

### 🛒 الفواتير `/api/invoice`

#### قائمة الفواتير
```http
GET /api/invoice
Authorization: Bearer <token>
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| page | number | رقم الصفحة |
| type | string | النوع (cash, credit, aqsaty, jenny) |
| from | date | من تاريخ |
| to | date | إلى تاريخ |
| customer_id | string | العميل |
| status | string | الحالة |

#### إنشاء فاتورة
```http
POST /api/invoice
Authorization: Bearer <token>
Permission: sales.invoice.create
```

**Request:**
```json
{
    "customer_id": "cust_xxx",
    "payment_type": "cash",
    "items": [
        {
            "product_id": "prod_xxx",
            "serial_id": "ser_xxx",
            "quantity": 1,
            "price": 100.00,
            "discount": 0
        }
    ],
    "discount": 0,
    "tax": 0,
    "notes": "ملاحظات"
}
```

#### فاتورة أقساط
```http
POST /api/invoice
```

**Request:**
```json
{
    "customer_id": "cust_xxx",
    "payment_type": "aqsaty",
    "items": [ ... ],
    "down_payment": 100,
    "installment_count": 6,
    "installment_amount": 50,
    "first_payment_date": "2026-03-01"
}
```

#### إلغاء فاتورة
```http
POST /api/invoice/:id/void
Authorization: Bearer <token>
Permission: sales.invoice.void
```

**Request:**
```json
{
    "reason": "سبب الإلغاء"
}
```

---

### 👥 العملاء `/api/customers`

#### قائمة العملاء
```http
GET /api/customers
Authorization: Bearer <token>
```

#### إنشاء عميل
```http
POST /api/customers
Authorization: Bearer <token>
Permission: customers.create
```

**Request:**
```json
{
    "name": "اسم العميل",
    "phone": "07901234567",
    "email": "customer@example.com",
    "address": "العنوان",
    "credit_limit": 1000,
    "notes": "ملاحظات"
}
```

#### كشف حساب العميل
```http
GET /api/customers/:id/statement
Authorization: Bearer <token>
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| from | date | من تاريخ |
| to | date | إلى تاريخ |

#### رصيد العميل
```http
GET /api/customers/:id/balance
Authorization: Bearer <token>
```

---

### 📦 المخزون `/api/inventory`

#### المخزون الحالي
```http
GET /api/inventory
Authorization: Bearer <token>
```

#### البحث بالسيريال
```http
GET /api/inventory/serial/:serial
Authorization: Bearer <token>
```

#### نقل بين المخازن
```http
POST /api/inventory/transfer
Authorization: Bearer <token>
Permission: inventory.warehouse.transfer
```

**Request:**
```json
{
    "serial_id": "ser_xxx",
    "from_warehouse_id": "wh_1",
    "to_warehouse_id": "wh_2",
    "notes": "سبب النقل"
}
```

---

### 🔄 المرتجعات `/api/returns`

#### إنشاء مرتجع
```http
POST /api/returns
Authorization: Bearer <token>
Permission: returns.create
```

**Request:**
```json
{
    "invoice_id": "inv_xxx",
    "items": [
        {
            "serial_id": "ser_xxx",
            "reason": "عيب مصنعي",
            "classification": "yellow"
        }
    ],
    "notes": "ملاحظات"
}
```

**Classifications:**
- `green` - سليم، يرجع للمخزون
- `yellow` - يحتاج فحص
- `red` - معيب، للصيانة

---

### 🔧 الصيانة `/api/maintenance`

#### إنشاء أمر صيانة
```http
POST /api/maintenance
Authorization: Bearer <token>
```

**Request:**
```json
{
    "serial_id": "ser_xxx",
    "customer_id": "cust_xxx",
    "type": "warranty",
    "problem_description": "وصف المشكلة",
    "priority": "high"
}
```

---

### 💰 المالية `/api/accounting`

#### شجرة الحسابات
```http
GET /api/accounting/accounts
Authorization: Bearer <token>
Permission: finance.accounts.view
```

#### إنشاء قيد
```http
POST /api/accounting/journal
Authorization: Bearer <token>
Permission: finance.journal.create
```

**Request:**
```json
{
    "date": "2026-02-03",
    "description": "وصف القيد",
    "lines": [
        { "account_id": "acc_1", "debit": 100, "credit": 0 },
        { "account_id": "acc_2", "debit": 0, "credit": 100 }
    ]
}
```

#### سند قبض
```http
POST /api/accounting/voucher
Authorization: Bearer <token>
Permission: finance.voucher.receipt.create
```

**Request:**
```json
{
    "type": "receipt",
    "amount": 100,
    "customer_id": "cust_xxx",
    "payment_method": "cash",
    "description": "دفعة من العميل"
}
```

---

### 🔐 الصلاحيات `/api/permissions`

#### صلاحياتي
```http
GET /api/permissions/my-permissions
Authorization: Bearer <token>
```

#### جميع الصلاحيات
```http
GET /api/permissions/all
Authorization: Bearer <token>
Permission: system.permissions.view
```

#### الأدوار
```http
GET /api/permissions/roles
Authorization: Bearer <token>
```

---

### 📋 سجل التدقيق `/api/audit`

#### جلب السجلات
```http
GET /api/audit
Authorization: Bearer <token>
Permission: system.audit.view
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| from | date | من تاريخ |
| to | date | إلى تاريخ |
| eventType | string | نوع الحدث |
| userId | string | المستخدم |
| severity | string | الخطورة |

---

### 🔔 الإشعارات `/api/notifications`

#### إشعاراتي
```http
GET /api/notifications
Authorization: Bearer <token>
```

#### تحديد كمقروء
```http
POST /api/notifications/:id/read
Authorization: Bearer <token>
```

#### تحديد الكل كمقروء
```http
POST /api/notifications/read-all
Authorization: Bearer <token>
```

---

### 📊 لوحة التحكم `/api/dashboard`

#### إحصائيات اليوم
```http
GET /api/dashboard/stats
Authorization: Bearer <token>
```

**Response:**
```json
{
    "success": true,
    "data": {
        "sales_today": 5000,
        "invoices_count": 15,
        "returns_count": 2,
        "pending_installments": 10,
        "low_stock_count": 5
    }
}
```

---

### 📈 التقارير واللوحات `/api/reports`

#### لوحة المندوب
```http
GET /api/reports/rep-dashboard
Authorization: Bearer <token>
```
**Response:** `{ success, data: { my_sales, my_invoice_count, overdue_invoices[] } }`

#### لوحة التحليلات (ويدجتات)
```http
GET /api/reports/analytics-widgets?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
Authorization: Bearer <token>
```

---

### 📦 المواد الثابتة `/api/fixed-assets`

```http
GET  /api/fixed-assets              # قائمة الأصول
POST /api/fixed-assets              # إضافة أصل (body: code, name, category, cost, is_expense_tracked)
GET  /api/fixed-assets/expense-types
GET  /api/fixed-assets/:id/expenses
POST /api/fixed-assets/:id/expenses
PATCH /api/fixed-assets/:id/assign  # body: { employee_id }
```

---

### 🧮 أونلاين حاسبة `/api/calculator`

```http
GET  /api/calculator/chat?limit=80   # رسائل المحادثة
POST /api/calculator/chat           # body: { message }
GET  /api/calculator/routes        # مسار المندوب الدوري
POST /api/calculator/routes        # إضافة زيارة
```

---

### 📊 الأسهم `/api/shares`

```http
GET /api/shares/config   # نوع النظام (ثابت القيمة/ثابت العدد)
GET /api/shares/summary  # المساهمون وإجمالي الأسهم
```

---

## 🔑 أكواد الصلاحيات المهمة

```javascript
// المبيعات
'sales.invoice.create'      // إنشاء فاتورة
'sales.invoice.edit'        // تعديل فاتورة
'sales.invoice.void'        // إلغاء فاتورة
'sales.price.override'      // تجاوز السعر
'sales.discount.apply'      // تطبيق خصم

// المخزون
'inventory.product.create'  // إنشاء منتج
'inventory.serial.view'     // عرض السيريالات
'inventory.warehouse.transfer' // نقل بين المخازن

// المالية
'finance.journal.create'    // إنشاء قيد
'finance.voucher.receipt.create' // سند قبض
'finance.voucher.payment.create' // سند صرف

// النظام
'system.users.create'       // إنشاء مستخدم
'system.permissions.assign' // تعيين صلاحيات
'system.audit.view'         // عرض سجل التدقيق
```

---

## 📝 ملاحظات

1. جميع التواريخ بصيغة ISO 8601: `YYYY-MM-DD`
2. جميع المبالغ بالدينار العراقي (IQD)
3. UUIDs تُستخدم لجميع المعرفات
4. الـ Pagination تبدأ من صفحة 1

---

*آخر تحديث: 2026-02-06*

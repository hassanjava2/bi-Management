# تحليل قاعدة بيانات المربع - Bi Management Migration

## تاريخ التحليل: 2026-02-01

---

## 📊 ملخص الجداول (98 جدول)

### 1. إدارة المنتجات (Items)
```sql
Items:
- Id, Name, ItemCode (الباركود)
- BuyPrice, BuyCurrencyId (سعر الشراء)
- SalePrice1, SalePrice2, SalePrice3 (أسعار البيع)
- SalePriceWhole, SalePricePrivate (سعر الجملة/خاص)
- profit1, profit2, profit3, profitWhole, profitPrivate (الأرباح)
- GroupId (مجموعة المنتج)
- CompanyId (الشركة المصنعة)
- Minimum (الحد الأدنى للمخزون)
- Location (موقع المخزن)
- Specs, Details (المواصفات)

Groups:
- تصنيفات المنتجات (لابتوبات، إكسسوارات، الخ)

Companies:
- الشركات المصنعة (Dell, HP, Lenovo, etc)
```

### 2. الفواتير والمبيعات (Bills)
```sql
Bills:
- Id, BillId, Date
- AccountId (الزبون/المورد)
- BranchId (الفرع)
- StoreId (المخزن)
- OperationType (نوع العملية: بيع/شراء/إرجاع)
- BillAmount1, BillAmount2 (المبلغ)
- Discount1, Discount2 (الخصم)
- Paid1, Paid2 (المدفوع)
- Remain1, Remain2 (المتبقي)
- CurrentBalance, PastBalance (الرصيد)
- Cost1, Cost2 (التكلفة)
- State (حالة الفاتورة)
- Note, Explanation (ملاحظات)

BillItems:
- Id, BillId, ItemId
- Number (الكمية)
- SinglePrice (سعر الوحدة)
- BuyPrice (سعر الشراء - مخفي!)
- Discount (الخصم)
- OperationsType
- Barcode
```

### 3. الحسابات (Accounts)
```sql
accounts:
- AccountId, Name
- AccountTypeId (نوع: زبون/مورد/موظف)
- Mobile, Email, Address, City
- IsCash (نقدي/آجل)
- OverRunBalnce (سقف الدين)
- PricesType (نوع الأسعار)
- BillCount (عدد الفواتير)
- Deleted, DisableAccount

accountTypes:
- أنواع الحسابات

AccountGroups:
- مجموعات الحسابات
```

### 4. المخازن (Stores)
```sql
Stores (3 مخازن):
- مخزن 1 (رئيسي)
- المواد التالفة
- مصاريف المواد

storeType:
- 0: عادي
- 1: تالف
- 2: مصاريف
```

### 5. حركة المخزون
```sql
ItemMovments:
- ItemId, BillId, Number
- MovmentType (دخول/خروج)
- OldQuantity (الكمية السابقة)
- DateTime, Notes
```

### 6. التحويلات والإرجاع
```sql
Transfers:
- FromAccountId, ToAccountId
- Amount, CurrencyId
- Type (نوع التحويل)
- Reason, Notes
- CurrentStatus (الحالة)
- Checked, CheckedUserId
```

---

## 🎯 متطلبات Bi Management

### المشاكل المطلوب حلها:

1. **تتبع المرتجعات:**
   - من 70 لابتوب للمصدر، 3 تضيع
   - نحتاج تتبع بالباركود + حالات واضحة

2. **إخفاء سعر الشراء:**
   - الموظفين ما يشوفون BuyPrice
   - فقط المالك يشوف الأرباح

3. **نظام الصلاحيات:**
   - مالك: كل شيء
   - محاسب: فواتير بدون أسعار شراء
   - مخزن: حركة مخزون فقط

4. **تقارير ذكية:**
   - الأرباح اليومية/الشهرية
   - المرتجعات المعلقة
   - المخزون المنخفض

---

## 🔄 خطة الترحيل

### Phase 1: الهيكل الأساسي
```
bi_users          ← Users
bi_products       ← Items + Groups + Companies
bi_accounts       ← accounts + accountTypes
bi_stores         ← Stores
```

### Phase 2: العمليات
```
bi_invoices       ← Bills + BillItems
bi_stock_moves    ← ItemMovments
bi_returns        ← جديد (تتبع المرتجعات)
```

### Phase 3: المميزات الجديدة
```
bi_return_tracking   - تتبع كل لابتوب مرتجع
bi_employee_logs     - سجل نشاط الموظفين
bi_price_history     - سجل تغيير الأسعار
bi_chat_logs         - سجل المحادثات (موجود)
```

---

## 📋 جدول المرتجعات الجديد (bi_return_tracking)

```sql
CREATE TABLE bi_return_tracking (
  id SERIAL PRIMARY KEY,
  product_id INT REFERENCES bi_products(id),
  barcode VARCHAR(100),
  
  -- معلومات الإرسال
  sent_date TIMESTAMP,
  sent_to VARCHAR(100),  -- اسم المورد
  sent_by INT,           -- الموظف
  sent_quantity INT,
  sent_reason TEXT,
  
  -- معلومات الإرجاع
  return_date TIMESTAMP,
  returned_quantity INT,
  return_status ENUM('pending', 'partial', 'complete', 'lost'),
  
  -- التتبع
  days_pending INT,
  follow_up_notes TEXT,
  last_follow_up DATE,
  
  -- التحقق
  verified_by INT,
  verified_date TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP
);
```

---

## 🔐 نظام الصلاحيات

```javascript
const PERMISSIONS = {
  OWNER: {
    view_buy_price: true,
    view_profits: true,
    manage_employees: true,
    all_reports: true,
    delete_records: true
  },
  ACCOUNTANT: {
    view_buy_price: false,  // مهم!
    view_profits: false,
    create_invoices: true,
    view_invoices: true,
    manage_accounts: true
  },
  WAREHOUSE: {
    view_buy_price: false,
    view_profits: false,
    manage_stock: true,
    view_stock: true,
    process_returns: true
  },
  SALES: {
    view_buy_price: false,
    view_profits: false,
    create_sales: true,
    view_products: true
  }
};
```

---

## 📱 واجهة المرتجعات

```
┌─────────────────────────────────────────────────┐
│  📦 تتبع المرتجعات                              │
├─────────────────────────────────────────────────┤
│  ⚠️ معلقة: 12 لابتوب (أكثر من 7 أيام)          │
│  ⏳ قيد المعالجة: 8 لابتوب                      │
│  ✅ مكتملة هذا الشهر: 45                        │
├─────────────────────────────────────────────────┤
│  [+ إرسال جديد]  [📋 تقرير]  [🔔 تنبيهات]      │
├─────────────────────────────────────────────────┤
│  SN: ABC123 | Dell Lat 5530 | 7 أيام | سيد أحمد │
│  SN: XYZ789 | HP 450 G9     | 3 أيام | التميمي  │
│  SN: QWE456 | Lenovo T14    | 12 أيام⚠️| العربي │
└─────────────────────────────────────────────────┘
```

---

## ✅ الخطوة التالية

1. إنشاء جداول Bi Management
2. بناء API للمرتجعات
3. واجهة تتبع المرتجعات
4. نظام التنبيهات
5. تقارير الأرباح (للمالك فقط)

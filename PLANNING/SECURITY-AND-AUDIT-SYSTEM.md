# 🔐 نظام الأمان وسجل التدقيق - BI Management

## 🎯 الأهداف الرئيسية

1. **سجل تدقيق شامل** - كل حركة مسجلة ومفلترة
2. **حماية الحذف** - لا حذف بدون موافقة المالك
3. **حماية الكميات** - لا تعديل يدوي للكميات
4. **حماية البيانات** - منع تسريب الأسعار والبيانات الحساسة
5. **تتبع الضمان** - متابعة مع الموردين (عين الفهد وغيرهم)
6. **أرشفة المنتجات** - المنتجات بدون حركة تُؤرشف

---

## 📋 نظام سجل التدقيق (Audit Log)

### أنواع الأحداث المسجلة

```
AUTH:
├── login                 - تسجيل دخول
├── logout                - تسجيل خروج
├── login_failed          - فشل تسجيل الدخول
├── password_changed      - تغيير كلمة المرور
├── permission_denied     - رفض صلاحية
└── suspicious_activity   - نشاط مشبوه

INVENTORY:
├── device_created        - إنشاء جهاز جديد
├── device_updated        - تحديث بيانات جهاز
├── device_transferred    - نقل بين مخازن
├── quantity_changed      - تغيير كمية (يحتاج موافقة)
├── price_changed         - تغيير سعر
├── device_sold           - بيع جهاز
├── device_returned       - إرجاع جهاز
└── device_scrapped       - شطب جهاز

INVOICES:
├── invoice_created       - إنشاء فاتورة
├── invoice_modified      - تعديل فاتورة
├── invoice_cancelled     - إلغاء فاتورة
├── invoice_printed       - طباعة فاتورة
└── payment_recorded      - تسجيل دفعة

WARRANTY:
├── warranty_claim_created   - طلب ضمان جديد
├── warranty_sent_supplier   - إرسال للمورد
├── warranty_returned        - رجوع من المورد
├── warranty_approved        - قبول الضمان
├── warranty_rejected        - رفض الضمان
└── customer_notified        - إشعار الزبون

SENSITIVE:
├── cost_price_viewed     - عرض سعر الشراء
├── report_generated      - توليد تقرير
├── data_exported         - تصدير بيانات
├── bulk_operation        - عملية جماعية
└── settings_changed      - تغيير إعدادات

APPROVAL:
├── approval_requested    - طلب موافقة
├── approval_granted      - موافقة
├── approval_denied       - رفض
└── approval_expired      - انتهاء مهلة الموافقة
```

### هيكل سجل التدقيق

```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- معلومات الحدث
    event_type VARCHAR(50) NOT NULL,
    event_category VARCHAR(30) NOT NULL,
    severity VARCHAR(20) DEFAULT 'info', -- info, warning, critical
    
    -- من قام بالعملية
    user_id UUID REFERENCES users(id),
    user_name VARCHAR(100),
    user_role VARCHAR(50),
    ip_address VARCHAR(45),
    user_agent TEXT,
    device_fingerprint VARCHAR(255),
    
    -- تفاصيل العملية
    entity_type VARCHAR(50), -- device, invoice, user, etc.
    entity_id UUID,
    entity_name VARCHAR(255),
    
    -- القيم
    old_value JSONB,
    new_value JSONB,
    changes JSONB, -- ملخص التغييرات
    
    -- السياق
    request_id UUID, -- لربط عمليات متعددة
    session_id VARCHAR(255),
    module VARCHAR(50),
    action VARCHAR(100),
    
    -- الموقع والوقت
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- للبحث
    searchable_text TEXT,
    tags TEXT[]
);

-- فهارس للبحث السريع
CREATE INDEX idx_audit_event_type ON audit_logs(event_type);
CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_date ON audit_logs(created_at);
CREATE INDEX idx_audit_severity ON audit_logs(severity);
CREATE INDEX idx_audit_category ON audit_logs(event_category);
CREATE INDEX idx_audit_search ON audit_logs USING gin(to_tsvector('arabic', searchable_text));
```

---

## 🛡️ نظام الحماية

### 1. حماية الحذف

```javascript
// القاعدة: لا حذف فعلي - فقط soft delete مع موافقة

// جدول طلبات الحذف
CREATE TABLE deletion_requests (
    id UUID PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    requested_by UUID REFERENCES users(id),
    reason TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP,
    rejection_reason TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP -- تنتهي بعد 24 ساعة إذا لم يُوافق
);

// كل الجداول تحتوي:
is_deleted BOOLEAN DEFAULT false,
deleted_at TIMESTAMP,
deleted_by UUID,
deletion_request_id UUID
```

### 2. حماية الكميات

```javascript
// القاعدة: الكميات تتغير فقط عبر:
// - فاتورة شراء (زيادة)
// - فاتورة بيع (نقصان)
// - إرجاع (زيادة/نقصان)
// - جرد معتمد من المالك
// - نقل بين مخازن

// جدول تعديلات الكمية
CREATE TABLE quantity_adjustments (
    id UUID PRIMARY KEY,
    entity_type VARCHAR(50), -- device, part, accessory
    entity_id UUID,
    
    adjustment_type VARCHAR(30) NOT NULL,
    -- purchase, sale, return, transfer, inventory_count, 
    -- damage, correction (يحتاج موافقة)
    
    quantity_before INTEGER NOT NULL,
    quantity_change INTEGER NOT NULL, -- موجب أو سالب
    quantity_after INTEGER NOT NULL,
    
    reference_type VARCHAR(50), -- invoice, transfer, approval
    reference_id UUID,
    
    requires_approval BOOLEAN DEFAULT false,
    approval_id UUID REFERENCES approvals(id),
    
    reason TEXT,
    created_by UUID,
    created_at TIMESTAMP DEFAULT NOW()
);

// Trigger لمنع التعديل المباشر
CREATE OR REPLACE FUNCTION prevent_direct_quantity_update()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.quantity != NEW.quantity THEN
        -- تحقق من وجود سجل تعديل مرتبط
        IF NOT EXISTS (
            SELECT 1 FROM quantity_adjustments 
            WHERE entity_id = NEW.id 
            AND created_at > NOW() - INTERVAL '1 second'
        ) THEN
            RAISE EXCEPTION 'Direct quantity modification not allowed. Use proper channels.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### 3. نظام الموافقات

```sql
CREATE TABLE approvals (
    id UUID PRIMARY KEY,
    
    approval_type VARCHAR(50) NOT NULL,
    -- deletion, quantity_correction, price_change, 
    -- large_discount, refund, data_export
    
    entity_type VARCHAR(50),
    entity_id UUID,
    
    requested_by UUID REFERENCES users(id),
    request_reason TEXT NOT NULL,
    request_data JSONB,
    
    status VARCHAR(20) DEFAULT 'pending',
    -- pending, approved, rejected, expired
    
    decided_by UUID REFERENCES users(id),
    decision_reason TEXT,
    decided_at TIMESTAMP,
    
    priority VARCHAR(20) DEFAULT 'normal',
    -- low, normal, high, urgent
    
    expires_at TIMESTAMP,
    notification_sent BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP DEFAULT NOW()
);
```

### 4. حماية البيانات الحساسة

```javascript
// الحقول الحساسة ومستوى الوصول المطلوب
const SENSITIVE_FIELDS = {
    'purchase_price': { level: 'owner', audit: true },
    'cost_price': { level: 'owner', audit: true },
    'profit_margin': { level: 'owner', audit: true },
    'supplier_price': { level: 'owner', audit: true },
    'customer_phone': { level: 'sales', audit: false },
    'customer_address': { level: 'delivery', audit: false },
    'employee_salary': { level: 'owner', audit: true },
};

// Middleware للتحقق من الصلاحيات
function filterSensitiveData(data, userRole, userId) {
    const filtered = { ...data };
    
    for (const [field, config] of Object.entries(SENSITIVE_FIELDS)) {
        if (!hasAccess(userRole, config.level)) {
            delete filtered[field];
            
            if (config.audit) {
                // لا نسجل لأنه لم يحاول الوصول
            }
        }
    }
    
    return filtered;
}

// تشفير البيانات الحساسة في قاعدة البيانات
const ENCRYPTED_FIELDS = [
    'purchase_price',
    'cost_price', 
    'supplier_contact',
    'customer_national_id'
];
```

### 5. كشف النشاط المشبوه

```javascript
const SUSPICIOUS_PATTERNS = [
    {
        name: 'mass_data_access',
        rule: 'أكثر من 100 سجل خلال دقيقة',
        action: 'block_and_alert'
    },
    {
        name: 'after_hours_access',
        rule: 'دخول خارج ساعات العمل (10pm - 6am)',
        action: 'alert'
    },
    {
        name: 'sensitive_data_export',
        rule: 'محاولة تصدير بيانات حساسة',
        action: 'require_approval'
    },
    {
        name: 'multiple_failed_logins',
        rule: '5 محاولات فاشلة خلال 10 دقائق',
        action: 'lock_account'
    },
    {
        name: 'unusual_location',
        rule: 'IP من موقع غير معتاد',
        action: 'require_2fa'
    },
    {
        name: 'api_abuse',
        rule: 'أكثر من 1000 طلب API بالساعة',
        action: 'rate_limit'
    }
];
```

---

## 📦 نظام تتبع الضمان

### هيكل الضمان

```sql
CREATE TABLE warranty_claims (
    id UUID PRIMARY KEY,
    claim_number VARCHAR(50) UNIQUE NOT NULL, -- WC-2025-XXXX
    
    -- الجهاز
    device_id UUID REFERENCES devices(id),
    device_serial VARCHAR(100),
    
    -- المورد
    supplier_id UUID REFERENCES suppliers(id),
    supplier_name VARCHAR(255),
    supplier_warranty_months INTEGER,
    warranty_expires_at DATE,
    
    -- الزبون
    customer_id UUID REFERENCES customers(id),
    customer_name VARCHAR(255),
    customer_phone VARCHAR(20),
    customer_address TEXT,
    
    -- المشكلة
    issue_description TEXT NOT NULL,
    issue_category VARCHAR(50),
    issue_images UUID[],
    
    -- الحالة
    status VARCHAR(30) DEFAULT 'pending',
    -- pending, sent_to_supplier, at_supplier, 
    -- returned_approved, returned_rejected,
    -- replaced, refunded, closed
    
    -- التواريخ
    sent_to_supplier_at TIMESTAMP,
    supplier_response_at TIMESTAMP,
    returned_at TIMESTAMP,
    closed_at TIMESTAMP,
    
    -- نتيجة المورد
    supplier_decision VARCHAR(30),
    -- approved, rejected, partial, replaced
    supplier_notes TEXT,
    replacement_device_id UUID,
    
    -- إشعار الزبون
    customer_notified BOOLEAN DEFAULT false,
    customer_notified_at TIMESTAMP,
    customer_notification_method VARCHAR(20),
    
    -- الكلفة
    repair_cost DECIMAL(12,2) DEFAULT 0,
    paid_by VARCHAR(20), -- supplier, customer, company
    
    created_by UUID,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- سجل تتبع الضمان
CREATE TABLE warranty_tracking (
    id UUID PRIMARY KEY,
    claim_id UUID REFERENCES warranty_claims(id),
    
    action VARCHAR(50) NOT NULL,
    action_details JSONB,
    
    performed_by UUID,
    performed_at TIMESTAMP DEFAULT NOW(),
    
    notes TEXT,
    attachments UUID[]
);
```

### سير عمل الضمان

```
[زبون يبلغ عن مشكلة]
         ↓
[تسجيل طلب ضمان + بيانات الزبون]
         ↓
[التحقق من صلاحية الضمان]
         ↓
    ┌────┴────┐
    ↓         ↓
[صالح]    [منتهي]
    ↓         ↓
[إرسال للمورد]  [إبلاغ الزبون]
    ↓
[انتظار رد المورد]
    ↓
┌───┴───┬───────┬──────┐
↓       ↓       ↓      ↓
[قبول] [رفض] [استبدال] [جزئي]
    ↓       ↓       ↓      ↓
    └───────┴───────┴──────┘
                ↓
        [إشعار الزبون]
                ↓
        [تسليم/إغلاق]
```

---

## 📁 أرشفة المنتجات

```sql
-- المنتجات المؤرشفة
CREATE TABLE archived_products (
    id UUID PRIMARY KEY,
    original_product_id UUID,
    
    -- بيانات المنتج الكاملة
    product_data JSONB NOT NULL,
    
    -- سبب الأرشفة
    archive_reason VARCHAR(50),
    -- zero_quantity, no_activity, discontinued, duplicate
    
    -- شروط الأرشفة
    last_activity_date DATE,
    days_inactive INTEGER,
    quantity_at_archive INTEGER,
    
    archived_by UUID,
    archived_at TIMESTAMP DEFAULT NOW(),
    
    -- إمكانية الاسترجاع
    can_restore BOOLEAN DEFAULT true,
    restored_at TIMESTAMP,
    restored_by UUID
);

-- دالة أرشفة تلقائية
CREATE OR REPLACE FUNCTION auto_archive_products()
RETURNS void AS $$
BEGIN
    INSERT INTO archived_products (original_product_id, product_data, archive_reason, last_activity_date, days_inactive, quantity_at_archive, archived_by)
    SELECT 
        p.id,
        to_jsonb(p),
        'no_activity',
        COALESCE(
            (SELECT MAX(created_at) FROM invoice_items WHERE product_id = p.id),
            p.created_at
        ),
        EXTRACT(DAY FROM NOW() - COALESCE(
            (SELECT MAX(created_at) FROM invoice_items WHERE product_id = p.id),
            p.created_at
        )),
        p.quantity,
        NULL -- system
    FROM products p
    WHERE p.quantity = 0
    AND NOT EXISTS (
        SELECT 1 FROM invoice_items ii 
        WHERE ii.product_id = p.id 
        AND ii.created_at > NOW() - INTERVAL '90 days'
    )
    AND p.is_archived = false;
    
    -- تحديث المنتجات كمؤرشفة
    UPDATE products SET is_archived = true, archived_at = NOW()
    WHERE id IN (SELECT original_product_id FROM archived_products WHERE archived_at > NOW() - INTERVAL '1 minute');
END;
$$ LANGUAGE plpgsql;
```

---

## 🔗 ربط الأقسام

### مخطط العلاقات

```
┌─────────────────────────────────────────────────────────────────┐
│                        BI MANAGEMENT SYSTEM                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────┐     ┌──────────┐     ┌──────────┐                │
│  │ المخزون  │────▶│ المبيعات │────▶│ التوصيل  │                │
│  └────┬─────┘     └────┬─────┘     └────┬─────┘                │
│       │                │                │                       │
│       ▼                ▼                ▼                       │
│  ┌──────────┐     ┌──────────┐     ┌──────────┐                │
│  │ المشتريات│────▶│ الحسابات │◀────│ الأقساط  │                │
│  └────┬─────┘     └────┬─────┘     └──────────┘                │
│       │                │                                        │
│       ▼                ▼                                        │
│  ┌──────────┐     ┌──────────┐     ┌──────────┐                │
│  │ الموردين │────▶│ الصيانة  │────▶│ الضمان   │                │
│  └──────────┘     └────┬─────┘     └────┬─────┘                │
│                        │                │                       │
│                        ▼                ▼                       │
│                   ┌──────────┐     ┌──────────┐                │
│                   │ الموظفين │────▶│ المهام   │                │
│                   └────┬─────┘     └──────────┘                │
│                        │                                        │
│                        ▼                                        │
│                   ┌──────────────────────────┐                  │
│                   │   سجل التدقيق (Audit)    │                  │
│                   │   نظام الموافقات         │                  │
│                   │   الإشعارات              │                  │
│                   └──────────────────────────┘                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📱 تكامل تطبيق الأندرويد

```
التطبيق يتصل بـ:
├── /api/auth/* - تسجيل الدخول
├── /api/devices/* - الأجهزة
├── /api/scan/* - مسح الباركود
├── /api/tasks/* - المهام
├── /api/chat/* - الدردشة
└── /api/notifications/* - الإشعارات

كل طلب API:
├── يمر عبر Authentication
├── يُسجل في Audit Log
├── يُفلتر البيانات الحساسة
└── يُرسل إشعارات إذا لزم
```

---

## 📊 واجهة سجل التدقيق

```
╔═══════════════════════════════════════════════════════════════╗
║  📊 سجل التدقيق - BI Management                               ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  الفلاتر:                                                     ║
║  ┌─────────────────────────────────────────────────────────┐ ║
║  │ التاريخ: [من: __/__/__] [إلى: __/__/__]               │ ║
║  │ النوع: [الكل ▼]  المستخدم: [الكل ▼]  الخطورة: [الكل ▼]│ ║
║  │ بحث: [________________________] [🔍 بحث]              │ ║
║  └─────────────────────────────────────────────────────────┘ ║
║                                                               ║
║  السجلات:                                                     ║
║  ┌─────────────────────────────────────────────────────────┐ ║
║  │ 🔴 10:45 │ أحمد │ محاولة حذف جهاز BI-2025-000123      │ ║
║  │    ↳ الحالة: مرفوض - يحتاج موافقة المالك             │ ║
║  ├─────────────────────────────────────────────────────────┤ ║
║  │ 🟡 10:42 │ محمد │ عرض تقرير الأرباح                   │ ║
║  │    ↳ تم تسجيل الوصول للبيانات الحساسة                │ ║
║  ├─────────────────────────────────────────────────────────┤ ║
║  │ 🟢 10:40 │ علي  │ إنشاء فاتورة بيع #1234             │ ║
║  │    ↳ تم بنجاح - المبلغ: 450,000                      │ ║
║  ├─────────────────────────────────────────────────────────┤ ║
║  │ 🟢 10:38 │ سارة │ إضافة جهاز جديد BI-2025-000150     │ ║
║  │    ↳ Dell Latitude 7410 - تم إنشاء الباركود          │ ║
║  └─────────────────────────────────────────────────────────┘ ║
║                                                               ║
║  [1] [2] [3] ... [50]    إجمالي: 2,450 سجل                  ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
```

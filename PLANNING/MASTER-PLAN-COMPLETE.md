# 🏢 BI Management - الخطة الشاملة للنظام
## نظام إدارة الشركات الذكي (ERP)

---

# 📋 فهرس المحتويات

1. [نظرة عامة](#نظرة-عامة)
2. [البنية التقنية](#البنية-التقنية)
3. [نظام المخزون والسيريالات](#نظام-المخزون-والسيريالات)
4. [دورة حياة الجهاز](#دورة-حياة-الجهاز)
5. [نظام الفحص والجودة](#نظام-الفحص-والجودة)
6. [نظام التجهيز الذكي](#نظام-التجهيز-الذكي)
7. [أنواع الفواتير](#أنواع-الفواتير)
8. [نظام الأقساط](#نظام-الأقساط)
9. [نظام التوصيل](#نظام-التوصيل)
10. [نظام الصيانة والدعم](#نظام-الصيانة-والدعم)
11. [نظام الموظفين](#نظام-الموظفين)
12. [نظام الذكاء الاصطناعي](#نظام-الذكاء-الاصطناعي)
13. [نظام التقارير](#نظام-التقارير)
14. [النسخ الاحتياطي](#النسخ-الاحتياطي)
15. [تطبيق الموبايل](#تطبيق-الموبايل)
16. [خطة الترحيل](#خطة-الترحيل)

---

# 🎯 نظرة عامة

## الهدف
بناء نظام ERP متكامل لإدارة شركة بيع اللابتوبات المستعملة، يشمل:
- تتبع كل جهاز بسيريال فريد من الشراء للبيع وما بعده
- إدارة المخزون بالمواقع الدقيقة
- نظام فحص وجودة متكامل
- دعم التطوير والترقية أثناء البيع
- نظام صيانة وخدمة عملاء
- تكامل مع شركات التوصيل ومنصات الأقساط
- ذكاء اصطناعي لتوزيع المهام وتحليل الأداء

## نطاق العمل
- **المنتجات**: لابتوبات مستعملة + إكسسوارات
- **المبيعات**: نقدي، آجل، أقساط (أقساطي + جني)، جملة
- **التوصيل**: شركة برايم + جني يستلم
- **الموظفين**: ~10 موظفين (فحص، تجهيز، توصيل، تنظيف، صيانة)

---

# 🔧 البنية التقنية

## التقنيات المستخدمة

### Backend
```
├── Node.js + Express.js (API الرئيسي)
├── Python + FastAPI (خدمات AI)
├── PostgreSQL (قاعدة البيانات الرئيسية)
├── Redis (Cache + Real-time)
└── Socket.io (إشعارات فورية)
```

### Frontend
```
├── React + Vite (لوحة التحكم)
├── Tailwind CSS (التصميم)
└── PWA Support (العمل أوفلاين)
```

### Mobile App
```
├── React Native أو Flutter
├── Camera Integration (تصوير)
├── Barcode/QR Scanner
└── Offline Sync
```

### Cloud Services
```
├── Supabase (Database + Storage)
├── Cloudflare R2 (Media Storage - بديل)
└── CDN للصور والفيديوهات
```

### External APIs
```
├── Prime Delivery API
├── Jenny (SuperKey) API
├── WhatsApp Business API
├── Payment Gateway
└── Website API (للموقع الرسمي)
```

---

## هيكل قاعدة البيانات الرئيسية

### جدول المنتجات (products)
```sql
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    brand VARCHAR(100),
    model VARCHAR(100),
    category_id UUID REFERENCES categories(id),
    
    -- المواصفات الأساسية
    processor VARCHAR(100),
    processor_gen VARCHAR(20),
    ram_size INTEGER,
    ram_type VARCHAR(20),
    storage_size INTEGER,
    storage_type VARCHAR(20),
    screen_size DECIMAL(4,2),
    screen_resolution VARCHAR(50),
    screen_type VARCHAR(50), -- touch, non-touch, 2K, 4K
    graphics VARCHAR(100),
    
    -- الأسعار
    base_cost DECIMAL(12,2),
    selling_price DECIMAL(12,2),
    wholesale_price DECIMAL(12,2),
    
    -- الحالة
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### جدول الأجهزة الفردية (devices)
```sql
CREATE TABLE devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    serial_number VARCHAR(100) UNIQUE NOT NULL, -- BI-2025-XXXXXX
    product_id UUID REFERENCES products(id),
    
    -- المواصفات الفعلية (قد تختلف عن المنتج الأساسي)
    actual_specs JSONB, -- المواصفات بعد الفحص
    
    -- التكلفة والسعر
    purchase_cost DECIMAL(12,2),
    additional_costs DECIMAL(12,2) DEFAULT 0, -- ترقيات، صيانة
    total_cost DECIMAL(12,2) GENERATED ALWAYS AS (purchase_cost + additional_costs) STORED,
    selling_price DECIMAL(12,2),
    
    -- الحالة
    status VARCHAR(30) NOT NULL DEFAULT 'new',
    -- new, inspecting, inspection_failed, ready_for_prep, 
    -- preparing, ready_to_sell, reserved, sold, 
    -- returned, in_repair, scrapped
    
    -- الموقع
    warehouse_id UUID REFERENCES warehouses(id),
    location_shelf VARCHAR(20),
    location_row VARCHAR(10),
    location_area VARCHAR(50),
    
    -- المسؤولية
    custody_employee_id UUID REFERENCES employees(id),
    
    -- المصدر
    supplier_id UUID REFERENCES suppliers(id),
    purchase_invoice_id UUID REFERENCES invoices(id),
    purchase_date DATE,
    
    -- البيع
    sale_invoice_id UUID REFERENCES invoices(id),
    sale_date DATE,
    customer_id UUID REFERENCES customers(id),
    
    -- الضمان
    warranty_months INTEGER DEFAULT 1,
    warranty_expires DATE,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- فهرس للبحث السريع
CREATE INDEX idx_devices_serial ON devices(serial_number);
CREATE INDEX idx_devices_status ON devices(status);
CREATE INDEX idx_devices_warehouse ON devices(warehouse_id);
CREATE INDEX idx_devices_custody ON devices(custody_employee_id);
```

### جدول سجل الجهاز (device_history)
```sql
CREATE TABLE device_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID REFERENCES devices(id),
    
    action_type VARCHAR(50) NOT NULL,
    -- purchased, inspected, specs_updated, location_changed,
    -- prep_started, prep_completed, sold, returned,
    -- sent_to_repair, received_from_repair, part_added,
    -- part_removed, part_swapped, scrapped, etc.
    
    action_details JSONB,
    
    -- المرجع
    reference_type VARCHAR(50), -- invoice, repair_order, transfer
    reference_id UUID,
    
    -- الموظف المسؤول
    employee_id UUID REFERENCES employees(id),
    
    -- الوسائط المرفقة
    media_ids UUID[], -- روابط للصور والفيديوهات
    
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_device_history_device ON device_history(device_id);
CREATE INDEX idx_device_history_action ON device_history(action_type);
CREATE INDEX idx_device_history_date ON device_history(created_at);
```

### جدول الوسائط (media)
```sql
CREATE TABLE media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    file_name VARCHAR(255),
    file_type VARCHAR(50), -- image, video
    file_size INTEGER,
    mime_type VARCHAR(100),
    
    storage_path VARCHAR(500),
    cdn_url VARCHAR(500),
    thumbnail_url VARCHAR(500),
    
    -- الربط
    entity_type VARCHAR(50), -- device, invoice, repair, inspection
    entity_id UUID,
    
    -- التصنيف
    media_category VARCHAR(50), -- inspection, packaging, defect, receipt
    
    uploaded_by UUID REFERENCES employees(id),
    created_at TIMESTAMP DEFAULT NOW()
);
```

### جدول المخازن (warehouses)
```sql
CREATE TABLE warehouses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL,
    -- main, inspection, preparation, repair_internal, 
    -- repair_external, return, defective, accessories
    
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP DEFAULT NOW()
);
```

### جدول الموردين (suppliers)
```sql
CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50), -- company, individual
    
    contact_person VARCHAR(100),
    phone VARCHAR(20),
    phone2 VARCHAR(20),
    email VARCHAR(100),
    address TEXT,
    
    -- الحساب
    balance DECIMAL(12,2) DEFAULT 0, -- رصيد (موجب = لنا، سالب = علينا)
    
    -- التقييم
    rating DECIMAL(2,1),
    notes TEXT,
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### جدول العملاء (customers)
```sql
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) DEFAULT 'retail', -- retail, wholesale
    
    phone VARCHAR(20) NOT NULL,
    phone2 VARCHAR(20),
    email VARCHAR(100),
    
    -- العناوين
    addresses JSONB, -- مصفوفة من العناوين
    default_address_index INTEGER DEFAULT 0,
    
    -- الحساب
    balance DECIMAL(12,2) DEFAULT 0, -- رصيد (موجب = لنا، سالب = علينا)
    credit_limit DECIMAL(12,2) DEFAULT 0,
    
    -- الولاء
    total_purchases DECIMAL(12,2) DEFAULT 0,
    purchase_count INTEGER DEFAULT 0,
    
    notes TEXT,
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### جدول الفواتير (invoices)
```sql
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    
    type VARCHAR(50) NOT NULL,
    -- purchase, purchase_return, sale, sale_return,
    -- exchange_same, exchange_different, trade_in,
    -- repair_send, repair_receive, internal_transfer,
    -- scrap, gift, consignment, installment
    
    -- الأطراف
    supplier_id UUID REFERENCES suppliers(id),
    customer_id UUID REFERENCES customers(id),
    
    -- للأقساط
    installment_platform VARCHAR(50), -- aqsaty, jenny
    platform_order_id VARCHAR(100),
    
    -- المبالغ
    subtotal DECIMAL(12,2),
    discount_amount DECIMAL(12,2) DEFAULT 0,
    discount_percent DECIMAL(5,2) DEFAULT 0,
    tax_amount DECIMAL(12,2) DEFAULT 0,
    shipping_cost DECIMAL(12,2) DEFAULT 0,
    total DECIMAL(12,2),
    
    -- للأقساط
    down_payment DECIMAL(12,2) DEFAULT 0,
    platform_fee DECIMAL(12,2) DEFAULT 0,
    expected_amount DECIMAL(12,2), -- المبلغ المتوقع استلامه
    
    -- الدفع
    payment_method VARCHAR(50), -- cash, credit, installment, transfer
    payment_status VARCHAR(30) DEFAULT 'pending',
    -- pending, partial, paid, refunded
    paid_amount DECIMAL(12,2) DEFAULT 0,
    
    -- الحالة
    status VARCHAR(30) DEFAULT 'draft',
    -- draft, confirmed, processing, shipped, delivered, 
    -- completed, cancelled, returned
    
    -- التوصيل
    delivery_company VARCHAR(50),
    tracking_number VARCHAR(100),
    delivery_status VARCHAR(30),
    delivery_date DATE,
    
    -- العناوين
    shipping_address JSONB,
    
    notes TEXT,
    internal_notes TEXT,
    
    created_by UUID REFERENCES employees(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### جدول بنود الفاتورة (invoice_items)
```sql
CREATE TABLE invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    
    device_id UUID REFERENCES devices(id),
    product_id UUID REFERENCES products(id),
    
    description VARCHAR(255),
    
    quantity INTEGER DEFAULT 1,
    unit_price DECIMAL(12,2),
    discount DECIMAL(12,2) DEFAULT 0,
    total DECIMAL(12,2),
    
    -- للترقيات والسحب
    upgrades JSONB, -- [{type: 'ram', from: 8, to: 16, cost: 50000}]
    pulled_parts JSONB, -- [{type: 'ram', size: 8, returned_to_stock: true}]
    
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT NOW()
);
```

### جدول القطع والإكسسوارات (parts)
```sql
CREATE TABLE parts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku VARCHAR(50) UNIQUE,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(50), -- ram, ssd, hdd, charger, battery, screen, keyboard, etc.
    
    -- المواصفات
    specs JSONB, -- {size: 16, type: 'DDR4', speed: 3200}
    
    -- المخزون
    quantity INTEGER DEFAULT 0,
    min_quantity INTEGER DEFAULT 5, -- للتنبيه
    
    -- الأسعار
    cost_price DECIMAL(12,2),
    selling_price DECIMAL(12,2),
    
    -- الموقع
    warehouse_id UUID REFERENCES warehouses(id),
    location VARCHAR(50),
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### جدول الإكسسوارات القياسية (standard_accessories)
```sql
CREATE TABLE standard_accessories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    
    -- المخزون
    quantity INTEGER DEFAULT 0,
    min_quantity INTEGER DEFAULT 20,
    
    -- التكلفة
    unit_cost DECIMAL(10,2),
    
    -- الاستخدام
    included_with_laptops BOOLEAN DEFAULT true, -- يُعطى مع كل لابتوب
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- الإكسسوارات الافتراضية
-- جنطة خط أحمر
-- ماوس خاكي واير (أو وايرلس هدية)
-- باد ماوس
-- وسادة
```

### جدول الموظفين (employees)
```sql
CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(100),
    
    department VARCHAR(50),
    -- inspection, preparation, delivery, cleaning, 
    -- maintenance, sales, accounting, management
    
    position VARCHAR(50),
    
    -- الدوام
    work_start_time TIME,
    work_end_time TIME,
    work_days INTEGER[], -- أيام العمل (0-6)
    
    -- الراتب
    salary DECIMAL(12,2),
    salary_type VARCHAR(20), -- monthly, daily, hourly
    
    -- الصندوق
    cash_box_balance DECIMAL(12,2) DEFAULT 0,
    
    -- الحالة
    is_active BOOLEAN DEFAULT true,
    hire_date DATE,
    
    created_at TIMESTAMP DEFAULT NOW()
);
```

### جدول المهام (tasks)
```sql
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    title VARCHAR(255) NOT NULL,
    description TEXT,
    
    type VARCHAR(50),
    -- inspection, preparation, delivery, cleaning,
    -- maintenance, follow_up, general
    
    priority VARCHAR(20) DEFAULT 'normal',
    -- urgent, high, normal, low
    
    -- الربط
    device_id UUID REFERENCES devices(id),
    invoice_id UUID REFERENCES invoices(id),
    customer_id UUID REFERENCES customers(id),
    
    -- التعيين
    assigned_to UUID REFERENCES employees(id),
    assigned_by UUID REFERENCES employees(id),
    assigned_at TIMESTAMP,
    
    -- المواعيد
    due_date TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    
    -- الحالة
    status VARCHAR(30) DEFAULT 'pending',
    -- pending, in_progress, completed, cancelled, overdue
    
    -- التقييم
    completion_notes TEXT,
    rating INTEGER, -- 1-5
    
    -- مصدر المهمة
    source VARCHAR(30), -- manual, ai_generated, system
    
    created_at TIMESTAMP DEFAULT NOW()
);
```

### جدول الإشعارات (notifications)
```sql
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    recipient_id UUID REFERENCES employees(id),
    
    type VARCHAR(50) NOT NULL,
    -- task_assigned, order_received, stock_low,
    -- delivery_update, payment_received, etc.
    
    priority VARCHAR(20) DEFAULT 'normal',
    -- urgent, important, normal
    
    title VARCHAR(255),
    message TEXT,
    
    -- الربط
    entity_type VARCHAR(50),
    entity_id UUID,
    action_url VARCHAR(255),
    
    -- الحالة
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT NOW()
);
```

### جدول الدردشة (chat_messages)
```sql
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    channel_type VARCHAR(30) NOT NULL,
    -- work, off_work, private_ai, task_discussion
    
    channel_id VARCHAR(100), -- للقنوات الخاصة
    
    sender_id UUID REFERENCES employees(id),
    
    message TEXT,
    message_type VARCHAR(20) DEFAULT 'text',
    -- text, image, file, voice, system
    
    -- للمهام المولدة من الرسائل
    generated_task_id UUID REFERENCES tasks(id),
    
    -- التحليل
    ai_analyzed BOOLEAN DEFAULT false,
    ai_sentiment VARCHAR(20),
    ai_topics TEXT[],
    
    is_deleted BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP DEFAULT NOW()
);
```

### جدول سندات القبض والدفع (vouchers)
```sql
CREATE TABLE vouchers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    voucher_number VARCHAR(50) UNIQUE NOT NULL,
    
    type VARCHAR(20) NOT NULL, -- receipt (قبض), payment (دفع)
    
    amount DECIMAL(12,2) NOT NULL,
    
    -- الأطراف
    from_account VARCHAR(100), -- صندوق، بنك، عميل، مورد
    to_account VARCHAR(100),
    
    customer_id UUID REFERENCES customers(id),
    supplier_id UUID REFERENCES suppliers(id),
    employee_id UUID REFERENCES employees(id), -- الصندوق
    
    -- المرجع
    reference_type VARCHAR(50), -- invoice, salary, expense
    reference_id UUID,
    
    description TEXT,
    
    -- للأقساط
    installment_platform VARCHAR(50),
    platform_transfer_date DATE,
    
    created_by UUID REFERENCES employees(id),
    created_at TIMESTAMP DEFAULT NOW()
);
```

### جدول المصاريف (expenses)
```sql
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    category VARCHAR(50) NOT NULL,
    -- rent, utilities, salaries, supplies, maintenance,
    -- transport, marketing, other
    
    description TEXT,
    amount DECIMAL(12,2) NOT NULL,
    
    expense_date DATE DEFAULT CURRENT_DATE,
    
    -- الدفع
    paid_from VARCHAR(50), -- cash_box, bank
    employee_id UUID REFERENCES employees(id), -- من صندوق من
    
    receipt_image_id UUID REFERENCES media(id),
    
    is_personal BOOLEAN DEFAULT false, -- مصروف شخصي
    
    created_by UUID REFERENCES employees(id),
    created_at TIMESTAMP DEFAULT NOW()
);
```

### جدول أوامر الصيانة (repair_orders)
```sql
CREATE TABLE repair_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(50) UNIQUE NOT NULL,
    
    type VARCHAR(30) NOT NULL,
    -- internal (داخلي), supplier (للمورد), external (مركز خارجي),
    -- customer (صيانة زبون)
    
    device_id UUID REFERENCES devices(id),
    
    -- لصيانة الزبون
    customer_id UUID REFERENCES customers(id),
    customer_device_serial VARCHAR(100),
    customer_device_details JSONB,
    
    -- المشكلة
    issue_description TEXT,
    issue_images UUID[], -- صور الخلل
    
    -- الوجهة
    repair_center_id UUID REFERENCES suppliers(id), -- المركز أو المورد
    
    -- التكاليف
    estimated_cost DECIMAL(12,2),
    actual_cost DECIMAL(12,2),
    parts_cost DECIMAL(12,2) DEFAULT 0,
    labor_cost DECIMAL(12,2) DEFAULT 0,
    
    -- للزبون
    charge_to_customer BOOLEAN DEFAULT true,
    customer_charge DECIMAL(12,2),
    is_warranty BOOLEAN DEFAULT false, -- ضمن الضمان
    
    -- الحالة
    status VARCHAR(30) DEFAULT 'pending',
    -- pending, sent, in_repair, completed, received, 
    -- delivered_to_customer, cancelled
    
    -- المواعيد
    sent_date DATE,
    expected_return_date DATE,
    actual_return_date DATE,
    
    -- عند الإرجاع
    return_notes TEXT,
    return_condition JSONB, -- حالة الجهاز عند الرجوع
    discrepancies JSONB, -- اختلافات (ناقص رام، الخ)
    
    created_by UUID REFERENCES employees(id),
    created_at TIMESTAMP DEFAULT NOW()
);
```

### جدول الغرامات والمكافآت (employee_adjustments)
```sql
CREATE TABLE employee_adjustments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    employee_id UUID REFERENCES employees(id),
    
    type VARCHAR(20) NOT NULL, -- fine (غرامة), bonus (مكافأة)
    
    amount DECIMAL(12,2) NOT NULL,
    
    reason VARCHAR(50),
    -- late_arrival, early_leave, task_incomplete, 
    -- excellent_performance, target_achieved, etc.
    
    description TEXT,
    
    -- المرجع
    reference_type VARCHAR(50), -- task, attendance, manual
    reference_id UUID,
    
    -- التطبيق
    applied_to_salary BOOLEAN DEFAULT false,
    salary_month DATE, -- الشهر الي ينخصم/ينضاف منه
    
    created_by UUID REFERENCES employees(id),
    created_at TIMESTAMP DEFAULT NOW()
);
```

### جدول الحضور (attendance)
```sql
CREATE TABLE attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    employee_id UUID REFERENCES employees(id),
    date DATE DEFAULT CURRENT_DATE,
    
    check_in TIMESTAMP,
    check_out TIMESTAMP,
    
    status VARCHAR(20) DEFAULT 'present',
    -- present, absent, late, half_day, vacation
    
    late_minutes INTEGER DEFAULT 0,
    early_leave_minutes INTEGER DEFAULT 0,
    overtime_minutes INTEGER DEFAULT 0,
    
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(employee_id, date)
);
```

---

# 📦 نظام المخزون والسيريالات

## توليد السيريال

```
صيغة السيريال: BI-YYYY-XXXXXX
مثال: BI-2025-000001

BI = رمز الشركة
YYYY = السنة
XXXXXX = رقم تسلسلي (6 أرقام)
```

## أنواع المخازن

| المخزن | الوصف | الأجهزة فيه |
|--------|-------|-------------|
| **المخزن الرئيسي** | الأجهزة الجاهزة للبيع | ready_to_sell |
| **مخزن الفحص** | الأجهزة الجديدة بانتظار الفحص | new, inspecting |
| **مخزن التجهيز** | الأجهزة قيد التجهيز | preparing |
| **مخزن الإرجاع للمورد** | بانتظار الإرجاع | return_to_supplier |
| **مخزن صيانة المورد** | مرسلة للمورد للصيانة | sent_to_supplier |
| **مخزن صيانة خارجي** | مرسلة لمركز صيانة | sent_to_repair |
| **مخزن المعيب** | أجهزة تالفة/مشطوبة | defective, scrapped |
| **مخزن الإكسسوارات** | قطع الغيار والإكسسوارات | - |
| **مخزن صيانة الزبائن** | أجهزة زبائن للصيانة | customer_repair |

## تتبع الموقع

```
كل جهاز له موقع دقيق:
├── المخزن (warehouse_id)
├── المنطقة (location_area): مثل "القسم A"
├── الرف (location_shelf): مثل "رف 3"
└── الصف (location_row): مثل "صف 2"

عند المسح:
├── الموظف يمسح الباركود
├── يتسجل الجهاز بذمته
├── عند إرجاعه يمسح مرة ثانية
└── يختار الموقع الجديد أو يُحدّث تلقائياً
```

## نظام الذمة (Custody)

```
كل جهاز يُمسح = يتسجل بذمة الماسح
├── تاريخ ووقت الاستلام
├── سبب الاستلام (فحص، تجهيز، تصوير، إلخ)
└── عند الإرجاع يتحرر من ذمته

تقرير الذمم:
├── أجهزة بذمة كل موظف
├── مدة البقاء بالذمة
└── تنبيه للأجهزة المتأخرة
```

---

# 🔄 دورة حياة الجهاز

## المراحل الرئيسية

```
[شراء] → [فحص] → [تجهيز] → [جاهز] → [بيع] → [توصيل] → [ما بعد البيع]
   ↓         ↓                              ↓
[إرجاع]  [صيانة]                      [استبدال/إرجاع]
```

## تفاصيل كل مرحلة

### 1. الشراء
```
عند استلام وجبة من المورد:
├── إنشاء فاتورة شراء
├── إدخال عدد الأجهزة والمواصفات المتوقعة
├── توليد سيريال لكل جهاز تلقائياً
├── طباعة ملصقات الباركود
├── الأجهزة تدخل "مخزن الفحص"
└── الحالة: new
```

### 2. الفحص
```
الفاحص يستلم الأجهزة:
├── يمسح السيريال → يتسجل بذمته
├── يفحص المواصفات الفعلية:
│   ├── المعالج والجيل
│   ├── الرام (الحجم والنوع)
│   ├── الهارد (الحجم والنوع)
│   ├── الشاشة (الحجم، اللمس، الدقة)
│   ├── البطارية
│   ├── الكيبورد
│   └── المظهر الخارجي
├── يسجل الاختلافات
├── يلتقط صور للجهاز
└── يحدد الحالة:
    ├── مطابق → ready_for_prep
    ├── أفضل → تعديل السعر + إشعار
    ├── أقل → تعديل + إشعار للمدير
    └── معيب → return_to_supplier أو defective
```

### 3. التجهيز
```
المجهز يستلم الجهاز:
├── يمسح السيريال
├── يبدأ العمل:
│   ├── فرمتة + تنصيب ويندوز
│   ├── تحديثات النظام
│   ├── تنصيب البرامج المطلوبة
│   ├── فحص نهائي
│   └── تنظيف
├── النظام يحسب الوقت المتوقع
├── عند الانتهاء:
│   ├── يضع ملصق الشركة
│   └── ينقل للمخزن الرئيسي
└── الحالة: ready_to_sell
```

### 4. البيع
```
عند البيع:
├── اختيار الجهاز بالسيريال
├── اختيار نوع البيع:
│   ├── نقدي
│   ├── آجل
│   ├── أقساط (أقساطي/جني)
│   └── جملة
├── إضافة ترقيات (اختياري):
│   ├── رام إضافي
│   ├── تغيير هارد
│   └── سحب القطعة القديمة للمخزون
├── إضافة الإكسسوارات:
│   ├── جنطة خط أحمر
│   ├── ماوس
│   ├── باد ماوس
│   └── وسادة
├── طباعة الفاتورة
└── الحالة: sold
```

### 5. التوصيل
```
بعد البيع:
├── تجهيز الطلب:
│   ├── تصوير الجهاز مع السيريال
│   ├── تصوير فيديو التغليف
│   └── حفظ بأرشيف الجهاز
├── تسليم لشركة التوصيل:
│   ├── برايم (نرسل نحن)
│   └── جني (هم يستلمون)
├── تتبع الشحنة
├── تأكيد التوصيل
└── إشعار باستلام الزبون
```

### 6. ما بعد البيع
```
خلال فترة الضمان:
├── استبدال فوري (أول أسبوع)
├── صيانة مجانية (شغل يد)
├── قطع الغيار على الزبون
└── متابعة رضا العميل

في حالة الإرجاع/الاستبدال:
├── استلام الجهاز
├── فحص
├── تسجيل بالأرشيف
└── إعادة للمخزون أو للصيانة
```

---

# ✅ نظام الفحص والجودة

## نموذج الفحص

```
╔═══════════════════════════════════════════════════════════════╗
║  ✅ فحص الجهاز: BI-2025-001234                               ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  المواصفات المتوقعة (من فاتورة الشراء):                       ║
║  ─────────────────────────────────────────────────────────   ║
║  Dell Latitude 7410 | i7-11th | 32GB | 512GB | 15.6" Touch 2K║
║                                                               ║
║  المواصفات الفعلية:                                          ║
║  ─────────────────────────────────────────────────────────   ║
║  المعالج:  [i7-1165G7 ▼] ✅                                  ║
║  الجيل:    [11 ▼] ✅                                         ║
║  الرام:    [16 ▼] GB  ⚠️ متوقع 32                           ║
║  الهارد:   [512 ▼] GB [SSD ▼] ✅                             ║
║  الشاشة:   [15.6 ▼] [Touch ▼] [2K ▼] ✅                      ║
║                                                               ║
║  الحالة الفيزيائية:                                          ║
║  ─────────────────────────────────────────────────────────   ║
║  الشاشة:    ○ ممتاز  ● جيد  ○ متوسط  ○ سيء                  ║
║  الكيبورد:  ● ممتاز  ○ جيد  ○ متوسط  ○ سيء                  ║
║  الهيكل:    ○ ممتاز  ● جيد  ○ متوسط  ○ سيء                  ║
║  البطارية:  [ 85 ]% صحة                                      ║
║                                                               ║
║  ⚠️ الاختلافات المكتشفة:                                     ║
║  ─────────────────────────────────────────────────────────   ║
║  │ المواصفة │ متوقع │ فعلي │ الإجراء                       │ ║
║  ├──────────┼───────┼──────┼─────────────────────────────┤   ║
║  │ الرام    │ 32GB  │ 16GB │ ○ قبول ● طلب تعويض ○ إرجاع │   ║
║  └──────────────────────────────────────────────────────┘   ║
║                                                               ║
║  📷 الصور: [التقاط صورة] (3 صور مرفقة)                       ║
║  📝 ملاحظات: [خدش بسيط في الغطاء الخلفي           ]          ║
║                                                               ║
║  النتيجة: ○ مطابق  ● قبول مع ملاحظات  ○ إرجاع للمورد        ║
║                                                               ║
║  [ 💾 حفظ الفحص ]                                            ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
```

## التعامل مع الاختلافات

### الجهاز أفضل من المتوقع
```
مثال: طلبنا 2K وصلت 4K

الإجراءات:
├── تحديث المواصفات الفعلية
├── إشعار للمدير
├── اقتراح سعر بيع أعلى
└── تصنيف كموديل جديد (اختياري)
```

### الجهاز أقل من المتوقع
```
مثال: طلبنا رام 32 وصلت 16

الخيارات:
├── قبول + تعديل السعر
├── طلب تعويض من المورد (رام 16 إضافي)
├── إرجاع للمورد
└── ترقية من مخزوننا + خصم من المورد
```

### الجهاز معيب
```
├── توثيق العيب بالصور
├── إرجاع للمورد
├── متابعة حتى الاستبدال أو الاسترداد
└── تسجيل بسجل المورد (للتقييم)
```

---

# ⚙️ نظام التجهيز الذكي

## توزيع الطلبات التلقائي

```
عند وصول طلب جديد:
├── النظام يحدد المجهزين المتاحين
├── يوزع بالتساوي حسب:
│   ├── عدد الطلبات الحالية
│   ├── متوسط وقت الإنجاز
│   └── التخصص (إن وجد)
├── يُرسل إشعار للمجهز
└── يبدأ عداد الوقت
```

## العمل على أجهزة متعددة

```
المجهز يقدر يشتغل على 5-10 أجهزة بنفس الوقت:

مثال:
├── جهاز 1: تنصيب ويندوز (45 دقيقة انتظار)
├── جهاز 2: تحميل تحديثات (30 دقيقة)
├── جهاز 3: تنصيب برامج (20 دقيقة)
├── جهاز 4: فحص نهائي (يدوي)
└── جهاز 5: تنظيف (يدوي)

النظام يتتبع كل جهاز بشكل منفصل
```

## تقدير وقت التجهيز

```
النظام يتعلم من البيانات السابقة:

الوقت المتوقع = مجموع:
├── فرمتة + ويندوز: ~45 دقيقة
├── تحديثات: ~30 دقيقة
├── Office: ~15 دقيقة
├── برامج أساسية: ~10 دقيقة
├── برامج إضافية: ~20 دقيقة (حسب الطلب)
├── فحص نهائي: ~10 دقيقة
└── تنظيف: ~5 دقيقة
─────────────────────────
المجموع: ~135 دقيقة

مع الخبرة، النظام يعدل التقديرات
```

## شاشة المجهز

```
╔═══════════════════════════════════════════════════════════════╗
║  ⚙️ لوحة التجهيز - أحمد                                      ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  📊 الأجهزة قيد العمل: 6/10                                  ║
║                                                               ║
║  ┌─────────────────────────────────────────────────────────┐ ║
║  │ الجهاز         │ المرحلة      │ التقدم │ الوقت المتبقي │ ║
║  ├─────────────────┼──────────────┼────────┼───────────────┤ ║
║  │ BI-2025-001234 │ تنصيب ويندوز │ 45%    │ ~25 دقيقة    │ ║
║  │ BI-2025-001235 │ تحديثات      │ 80%    │ ~6 دقيقة     │ ║
║  │ BI-2025-001236 │ برامج        │ 30%    │ ~15 دقيقة    │ ║
║  │ BI-2025-001237 │ فحص نهائي   │ يدوي   │ انتظار       │ ║
║  │ BI-2025-001238 │ جاهز ❌      │ 100%   │ نقل للمخزن   │ ║
║  │ BI-2025-001239 │ انتظار       │ 0%     │ -            │ ║
║  └─────────────────────────────────────────────────────────┘ ║
║                                                               ║
║  🆕 طلب جديد: BI-2025-001240 (Dell Latitude)                 ║
║  البرامج المطلوبة: Office, Chrome, Zoom, Photoshop          ║
║  الوقت المتوقع: ~150 دقيقة                                   ║
║  [ ✅ قبول ] [ ❌ رفض مؤقت ]                                 ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
```

---

# 📄 أنواع الفواتير

## 1. فواتير الشراء

### فاتورة شراء عادية
```
├── من: مورد
├── المحتوى: أجهزة/قطع غيار
├── النتيجة: زيادة المخزون + دين للمورد
└── توليد سيريالات للأجهزة
```

### فاتورة شراء من زبون
```
├── من: زبون (يبيعنا جهازه المستعمل)
├── المحتوى: جهاز واحد عادةً
├── النتيجة: زيادة المخزون + دفع للزبون
└── فحص الجهاز قبل الشراء
```

### فاتورة إرجاع شراء
```
├── إلى: المورد
├── السبب: عيب، اختلاف مواصفات، إلخ
├── النتيجة: نقص المخزون + تقليل الدين
└── تتبع حتى استلام البديل أو المبلغ
```

## 2. فواتير البيع

### فاتورة بيع نقدي
```
├── إلى: زبون
├── الدفع: فوري كامل
├── النتيجة: نقص المخزون + إيراد
└── الضمان يبدأ من تاريخ الفاتورة
```

### فاتورة بيع آجل
```
├── إلى: زبون (حساب)
├── الدفع: لاحقاً
├── النتيجة: نقص المخزون + دين على الزبون
└── تتبع المديونية
```

### فاتورة بيع جملة
```
├── إلى: تاجر
├── السعر: سعر الجملة
├── الكمية: متعددة عادةً
└── شروط خاصة
```

### فاتورة أقساط
```
├── المنصة: أقساطي أو جني
├── السعر: مرفوع حسب النسب
├── التحصيل: من المنصة بعد أسبوع
└── تتبع التحويلات
```

### فاتورة إرجاع بيع
```
├── من: زبون
├── السبب: عيب، عدم رضا، إلخ
├── النتيجة: زيادة المخزون + رد المبلغ
└── فحص الجهاز المرتجع
```

## 3. فواتير الاستبدال

### استبدال بنفس الموديل
```
├── الزبون يرجع جهاز معيب
├── نعطيه نفس الموديل
├── لا فرق بالسعر
├── الجهاز المرتجع: للفحص والصيانة
└── تتبع الجهازين بالتوصيل
```

### استبدال بموديل مختلف
```
├── الزبون يرجع جهاز
├── يختار موديل آخر
├── فرق السعر: يدفع أو نرد
└── توثيق كامل
```

## 4. فواتير شراء + بيع (Trade-In)
```
├── الزبون يبيعنا جهازه القديم
├── نبيعه جهاز جديد
├── خصم قيمة جهازه من السعر
├── فاتورتين مرتبطتين:
│   ├── فاتورة شراء (منه)
│   └── فاتورة بيع (له)
└── الفرق يدفعه أو نرده
```

## 5. فواتير الصيانة

### إرسال صيانة للمورد
```
├── جهاز معيب من المخزون
├── إرسال للمورد
├── تتبع الحالة
├── عند الإرجاع: فحص وتوثيق
└── تسجيل أي اختلافات
```

### إرسال صيانة لمركز خارجي
```
├── جهاز يحتاج صيانة متخصصة
├── إرسال لمركز صيانة
├── تكلفة الصيانة
├── تتبع وتوثيق
└── إضافة التكلفة للجهاز
```

### صيانة زبون
```
├── زبون يجيب جهازه للصيانة
├── تسجيل المشكلة + صور
├── تحديد:
│   ├── ضمن الضمان → مجاني (شغل يد)
│   └── خارج الضمان → أجور + قطع غيار
├── إرسال لمركز إذا لزم
├── متابعة وتسليم
└── توثيق كامل
```

## 6. فواتير أخرى

### نقل داخلي
```
├── بين المخازن
├── لا تأثير مالي
└── توثيق الحركة فقط
```

### شطب/تالف
```
├── جهاز لا يصلح
├── خروج من المخزون
├── تسجيل كخسارة
└── توثيق السبب
```

### هدية/ترويج
```
├── جهاز أو إكسسوار هدية
├── خروج من المخزون
├── بدون إيراد
└── لأغراض تسويقية
```

### أمانة (Consignment)
```
├── جهاز عند طرف ثالث للعرض
├── يبقى ملكنا
├── عند البيع: نستلم حصتنا
└── تتبع خاص
```

---

# 💳 نظام الأقساط

## منصة أقساطي

### المعلومات الأساسية
```
├── نوع: عقد مع مصرفين
├── المقدمة: 11.5% (اختياري)
├── نسبة الرفع: 15%
├── التوصيل: نرسل لبرايم
├── المقدمة: يدفعها الزبون لشركة التوصيل
├── التحويل: بعد ~أسبوع (ماستر كارد تلقائي)
└── API: غير متوفر (يدوي)
```

### حساب السعر - مع مقدمة
```
السعر الأصلي:        500,000
+ 15%:               + 75,000
─────────────────────────────
السعر على المنصة:    575,000
المقدمة (11.5%):     66,125 → لشركة التوصيل
باقي الأقساط:        508,875

نستلم:
├── المقدمة من التوصيل: 66,125
├── من المنصة:          508,875
└── المجموع:            575,000 ✅
```

### حساب السعر - بدون مقدمة
```
السعر الأصلي:        500,000
+ قيمة المقدمة:      + 57,500 (11.5%)
─────────────────────────────
السعر الجديد:        557,500
+ 15%:               + 83,625
─────────────────────────────
السعر النهائي:       641,125

نستلم:
├── من المنصة:          641,125
└── الربح الإضافي:      141,125 ✅
```

## منصة جني (SuperKey)

### المعلومات الأساسية
```
├── نوع: تطبيق + API
├── المقدمة: لا يوجد
├── نسبة الرفع: 11.5%
├── الاستلام: جني يجي يستلم
├── التحويل: بعد أسبوع من التوصيل
├── نسبة جني: ~5% (تحتاج تأكيد)
└── API: متوفر ✅
```

### حساب السعر
```
السعر الأصلي:        500,000
+ 11.5%:             + 57,500
─────────────────────────────
السعر على المنصة:    557,500

نسبة جني (~5%):      - 27,875
─────────────────────────────
نستلم:               529,625
الربح:               29,625 ✅
```

### تكامل API
```
الميزات المتاحة:
├── رفع المنتجات تلقائياً
├── تحديث المخزون
├── استلام الطلبات
├── تحديث الحالات
└── تتبع التحويلات

عند إضافة منتج جديد:
├── النظام يحسب السعر (+11.5%)
├── يرفع للمنصة تلقائياً
└── يتزامن المخزون

عند طلب جديد:
├── إشعار فوري
├── إنشاء طلب بالنظام
└── جاهز للتجهيز
```

## تتبع تحويلات الأقساط

```
╔═══════════════════════════════════════════════════════════════╗
║  💳 تحويلات الأقساط المنتظرة                                  ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  ⏳ هذا الأسبوع:                                             ║
║  ┌─────────────────────────────────────────────────────────┐ ║
║  │ التاريخ │ المنصة  │ المبلغ المتوقع │ الحالة            │ ║
║  ├─────────┼─────────┼────────────────┼───────────────────┤ ║
║  │ 03/02   │ أقساطي  │ 1,150,000      │ ⏳ منتظر         │ ║
║  │ 04/02   │ جني     │ 850,000        │ ⏳ منتظر         │ ║
║  │ 06/02   │ أقساطي  │ 1,350,000      │ ⏳ منتظر         │ ║
║  └─────────────────────────────────────────────────────────┘ ║
║                                                               ║
║  عند وصول التحويل:                                           ║
║  [ أدخل المبلغ الواصل: [_________] ] [ ✅ تأكيد ]           ║
║                                                               ║
║  📊 ملخص الشهر:                                              ║
║  ├── أقساطي: 14,500,000 (تم استلام: 12,000,000)             ║
║  └── جني:    9,800,000 (تم استلام: 8,200,000)               ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
```

---

# 🚚 نظام التوصيل

## شركة برايم (Prime)

### الاستخدام
```
├── مبيعات نقدية/آجلة
├── مبيعات أقساطي
├── الاستبدالات (إرسال + استلام)
└── إرجاعات
```

### التكامل
```
├── API للتتبع (إذا متوفر)
├── إدخال رقم التتبع يدوياً
├── تحديث الحالة
└── تأكيد التسليم
```

### رسوم التوصيل
```
├── حسب المنطقة
├── تُضاف للفاتورة أو نتحملها
└── تتبع كمصروف
```

## جني (يستلمون)

### الاستخدام
```
├── مبيعات عبر منصة جني فقط
└── هم يجون يستلمون الطلب
```

### العملية
```
├── طلب جديد من المنصة
├── نجهز الطلب
├── مندوب جني يستلم
├── يوصل للزبون
├── بعد أسبوع: التحويل
└── تحديث بالنظام
```

## تتبع الاستبدالات

```
عند استبدال:
├── جهاز رايح (البديل للزبون)
│   ├── سيريال الجهاز الجديد
│   ├── تاريخ الإرسال
│   └── رقم التتبع
│
└── جهاز راجع (المعيب من الزبون)
    ├── سيريال الجهاز القديم
    ├── تاريخ الاستلام المتوقع
    └── حالة التتبع

التنبيهات:
├── الجهاز الراجع تأخر > 3 أيام
├── اختلاف بالجهاز المستلم
└── فقدان بالتوصيل
```

## شاشة التوصيل

```
╔═══════════════════════════════════════════════════════════════╗
║  🚚 متابعة التوصيل                                           ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  📦 الشحنات النشطة:                                          ║
║  ┌─────────────────────────────────────────────────────────┐ ║
║  │ # │ رقم التتبع │ الزبون  │ المنطقة │ الحالة    │ منذ  │ ║
║  ├───┼────────────┼─────────┼─────────┼───────────┼──────┤ ║
║  │ 1 │ PR-12345   │ أحمد    │ بغداد   │ بالطريق  │ 1 يوم│ ║
║  │ 2 │ PR-12346   │ محمد    │ البصرة  │ وصل      │ 2 يوم│ ║
║  │ 3 │ JNY-789    │ علي     │ أربيل   │ جني استلم│ 3 ساعة║
║  └─────────────────────────────────────────────────────────┘ ║
║                                                               ║
║  🔄 استبدالات بانتظار الإرجاع:                               ║
║  ┌─────────────────────────────────────────────────────────┐ ║
║  │ # │ الزبون │ الجهاز الراجع  │ أُرسل البديل │ الحالة   │ ║
║  ├───┼────────┼────────────────┼──────────────┼──────────┤ ║
║  │ 1 │ سمير  │ BI-2025-000456 │ ✅ 28/01     │ ⏳ منتظر │ ║
║  │ 2 │ كريم  │ BI-2025-000789 │ ✅ 25/01     │ ⚠️ متأخر│ ║
║  └─────────────────────────────────────────────────────────┘ ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
```

---

# 🔧 نظام الصيانة والدعم

## أنواع الصيانة

### 1. صيانة داخلية
```
├── صيانة بسيطة بالمحل
├── تغيير قطع
├── فرمتة وتنصيب
└── لا تكلفة خارجية
```

### 2. صيانة المورد
```
├── جهاز معيب من الوجبة
├── إرسال للمورد
├── تتبع حتى الرجوع
├── فحص عند الاستلام
└── توثيق أي نقص
```

### 3. صيانة خارجية
```
├── مشاكل متخصصة (شاشة، مذربورد)
├── إرسال لمركز صيانة
├── تكلفة تُضاف للجهاز
└── توثيق كامل
```

### 4. صيانة الزبائن
```
├── زبون يجيب جهازه
├── تسجيل المشكلة + صور
├── فحص الملصق:
│   ├── موجود → شغل يد مجاني
│   └── غير موجود → أجور كاملة
├── قطع الغيار على الزبون
└── متابعة وتسليم
```

## سير عمل صيانة الزبون

```
[استلام الجهاز]
     ↓
[تسجيل البيانات + صور]
     ↓
[فحص أولي + تشخيص]
     ↓
[تحديد التكلفة + موافقة الزبون]
     ↓
   ┌─────────────────┐
   ↓                 ↓
[صيانة داخلية]  [إرسال لمركز]
   ↓                 ↓
   ↓            [استلام + فحص]
   ↓                 ↓
   └────────┬────────┘
            ↓
     [إشعار الزبون]
            ↓
     [تسليم + دفع]
            ↓
     [ضمان أسبوع]
```

## نموذج استلام صيانة

```
╔═══════════════════════════════════════════════════════════════╗
║  🔧 استلام جهاز للصيانة                                      ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  👤 بيانات الزبون:                                           ║
║  الاسم: [ سمير أحمد                 ]                        ║
║  الهاتف: [ 07xxxxxxxxx              ]                        ║
║                                                               ║
║  💻 بيانات الجهاز:                                           ║
║  السيريال: [ BI-2025-000123 ] أو [ سيريال خارجي ]           ║
║  الموديل: [ Dell Latitude 7410     ]                         ║
║                                                               ║
║  ☑️ الجهاز عليه ملصقنا (ضمان شغل يد)                        ║
║                                                               ║
║  🔍 المشكلة:                                                  ║
║  [ الشاشة لا تعمل - ضربة                                    ]║
║  [                                                           ]║
║                                                               ║
║  📷 صور الجهاز والعيب: [التقاط] (2 صور)                      ║
║                                                               ║
║  💰 التكلفة المتوقعة:                                        ║
║  أجور الفحص: [ 10,000 ] (تُخصم من الصيانة)                  ║
║  تقدير الصيانة: [ سيُحدد بعد الفحص ]                        ║
║                                                               ║
║  📋 الإيصال:                                                  ║
║  ☑️ طباعة إيصال استلام للزبون                                ║
║                                                               ║
║  [ 💾 حفظ ]                                                   ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
```

---

# 👥 نظام الموظفين

## الأقسام

| القسم | المهام | الموظفين |
|-------|--------|----------|
| **الفحص** | فحص الأجهزة الجديدة، توثيق المواصفات | 1-2 |
| **التجهيز** | فرمتة، تنصيب، تجهيز للبيع | 2-3 |
| **المبيعات** | البيع، خدمة العملاء | 1-2 |
| **التوصيل** | تسليم الطلبات | 1 |
| **التنظيف** | نظافة المحل والأجهزة | 1 |
| **الصيانة** | صيانة داخلية | 1 |
| **المحاسبة** | الحسابات والتقارير | 1 |
| **الإدارة** | إدارة عامة | 1 |

## نظام الحضور

```
تسجيل الحضور:
├── بصمة / رمز / تطبيق
├── وقت الدخول والخروج
├── حساب التأخير
├── حساب الإضافي
└── تقرير شهري
```

## نظام المهام

### توزيع المهام
```
المهام تُنشأ من:
├── يدوياً (المدير)
├── تلقائياً (النظام)
│   ├── طلب جديد → مهمة تجهيز
│   ├── جهاز جديد → مهمة فحص
│   └── موعد تنظيف → مهمة تنظيف
└── من AI (تحليل الدردشة)
```

### تتبع الإنجاز
```
كل مهمة:
├── وقت البدء
├── وقت الانتهاء
├── الجودة (تقييم)
└── ملاحظات

التقارير:
├── مهام كل موظف
├── نسبة الإنجاز
├── متوسط الوقت
└── التقييم العام
```

## نظام الغرامات والمكافآت

### الغرامات التلقائية
```
├── تأخير > 15 دقيقة = خصم
├── مهمة غير مكتملة = تحذير → غرامة
├── خطأ متكرر = غرامة
└── غياب بدون إذن = خصم يوم
```

### المكافآت التلقائية
```
├── إنجاز كل المهام بالوقت = مكافأة
├── تقييم ممتاز = مكافأة
├── اقتراح مفيد = مكافأة
└── تحقيق هدف المبيعات = نسبة
```

### شاشة الموظف

```
╔═══════════════════════════════════════════════════════════════╗
║  👤 ملف الموظف: أحمد محمد                                    ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  القسم: التجهيز | الراتب: 500,000                            ║
║                                                               ║
║  📊 إحصائيات الشهر:                                          ║
║  ├── أيام العمل: 24/26                                       ║
║  ├── ساعات التأخير: 2.5                                      ║
║  ├── المهام المنجزة: 145                                     ║
║  ├── متوسط التقييم: 4.2/5                                    ║
║  └── الأجهزة المجهزة: 89                                     ║
║                                                               ║
║  💰 الحساب:                                                   ║
║  ├── الراتب الأساسي: 500,000                                 ║
║  ├── الغرامات: -25,000 (تأخير 5 مرات)                       ║
║  ├── المكافآت: +50,000 (إنجاز ممتاز)                        ║
║  └── الصافي: 525,000                                         ║
║                                                               ║
║  📋 المهام الحالية: 6                                        ║
║  ⏳ المتأخرة: 0                                               ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
```

## نظام الصناديق

```
كل موظف له صندوق:
├── سند قبض → يزيد الصندوق
├── سند دفع → ينقص الصندوق
└── تقرير يومي بالحركات

صندوق المدير:
├── الصندوق الرئيسي
├── تحويلات من/إلى الموظفين
└── المصاريف الكبيرة
```

---

# 🤖 نظام الذكاء الاصطناعي

## 1. دردشة العمل الذكية

### الميزات
```
├── دردشة موثقة ومخزنة
├── AI يحلل المحادثات
├── يكتشف المشاكل والاقتراحات
├── يولد مهام تلقائياً
└── يتعلم من التفاعلات
```

### مثال
```
الموظف: "الطابعة معلقة من أمس"

AI يحلل:
├── الموضوع: مشكلة تقنية
├── الأولوية: متوسطة
├── الإجراء: إنشاء مهمة صيانة
└── التعيين: فني الصيانة

→ مهمة جديدة: "إصلاح الطابعة"
```

## 2. مساعد AI الخاص

### لكل موظف
```
├── يسأل عن أي شي
├── يحصل على إجابات فورية
├── يطلب مساعدة بالمهام
└── يقترح حلول للمشاكل
```

### أمثلة
```
موظف: "شلون أسوي فاتورة استبدال؟"
AI: "اتبع الخطوات التالية..."

موظف: "الزبون يشتكي من بطء الجهاز"
AI: "جرب الحلول التالية: 1. فحص الرام 2. فحص الهارد..."
```

## 3. مساعد المدير

### الميزات
```
├── أوامر صوتية أو نصية
├── توزيع مهام تلقائي
├── تقارير فورية
├── تنبيهات ذكية
└── اقتراحات وقرارات
```

### أمثلة
```
المدير: "وزع طلبات اليوم على المجهزين"
AI: → يوزع 15 طلب على 3 مجهزين بالتساوي

المدير: "شنو وضع المبيعات هالأسبوع؟"
AI: → "المبيعات 45 جهاز بقيمة 22 مليون، أعلى من الأسبوع الماضي بـ 15%"

المدير: "ذكرني أتصل بالمورد باچر"
AI: → يضيف تذكير للغد الساعة 10 صباحاً
```

## 4. تحليل الأداء

### التقارير الذكية
```
AI يحلل:
├── أداء كل موظف
├── أنماط العمل
├── المشاكل المتكررة
├── فرص التحسين
└── توقعات المبيعات
```

### التنبيهات الذكية
```
├── موظف أداؤه انخفض → تنبيه للمدير
├── منتج مبيعاته عالية → اقتراح زيادة المخزون
├── زبون متكرر → اقتراح خصم ولاء
└── مشكلة متكررة → اقتراح حل جذري
```

## 5. الدردشة خارج العمل

```
قناة منفصلة للكلام الشخصي:
├── غير مراقبة من AI
├── لا تولد مهام
├── للتواصل الاجتماعي فقط
└── تبقى موثقة للرجوع
```

---

# 📊 نظام التقارير

## التقارير المالية

### 1. تقرير الأرباح والخسائر
```
الفترة: يناير 2025

الإيرادات:
├── مبيعات نقدية:      85,000,000
├── مبيعات آجلة:       12,000,000
├── مبيعات أقساط:      24,300,000
├── مبيعات جملة:       15,000,000
├── خدمات صيانة:        2,500,000
└── المجموع:          138,800,000

تكلفة البضاعة المباعة:
├── تكلفة الأجهزة:     98,000,000
├── قطع غيار مباعة:     3,500,000
└── المجموع:          101,500,000

الربح الإجمالي:        37,300,000

المصاريف التشغيلية:
├── رواتب:              6,000,000
├── إيجار:              2,000,000
├── كهرباء ومياه:         500,000
├── توصيل:              1,200,000
├── صيانة وتنظيف:         300,000
├── تسويق:                800,000
└── متفرقات:              500,000
المجموع:               11,300,000

صافي الربح:            26,000,000
```

### 2. تقرير التدفق النقدي
```
الفترة: يناير 2025

الرصيد الافتتاحي:      15,000,000

التدفقات الداخلة:
├── مبيعات نقدية:      85,000,000
├── تحصيل ذمم:         18,000,000
├── تحويلات أقساط:     20,200,000
└── المجموع:          123,200,000

التدفقات الخارجة:
├── مشتريات:           75,000,000
├── مصاريف تشغيل:      11,300,000
├── سداد موردين:       22,000,000
└── المجموع:          108,300,000

صافي التدفق:           14,900,000
الرصيد الختامي:        29,900,000
```

### 3. تقرير الذمم
```
ذمم العملاء (لنا):
├── إجمالي الذمم:      25,000,000
├── أقل من 30 يوم:     18,000,000
├── 30-60 يوم:          5,000,000
├── 60-90 يوم:          1,500,000
└── أكثر من 90 يوم:       500,000 ⚠️

ذمم الموردين (علينا):
├── إجمالي الذمم:      35,000,000
├── مستحقة هذا الأسبوع: 12,000,000
└── متأخرة:             3,000,000 ⚠️
```

## تقارير المخزون

### 1. تقرير المخزون الحالي
```
╔═══════════════════════════════════════════════════════════════╗
║  📦 ملخص المخزون                                             ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  📊 الأجهزة:                                                  ║
║  ├── جاهزة للبيع:        145                                 ║
║  ├── قيد الفحص:           12                                 ║
║  ├── قيد التجهيز:         23                                 ║
║  ├── محجوزة:               8                                 ║
║  ├── بالصيانة:            15                                 ║
║  └── المجموع:            203                                 ║
║                                                               ║
║  💰 القيمة:                                                   ║
║  ├── تكلفة المخزون:    98,500,000                            ║
║  └── قيمة البيع:      156,000,000                            ║
║                                                               ║
║  ⚠️ تنبيهات:                                                 ║
║  ├── رام 8GB DDR4: المخزون 3 (الحد الأدنى: 10)              ║
║  └── شواحن Dell: المخزون 2 (الحد الأدنى: 5)                 ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
```

### 2. تقرير حركة المخزون
```
الفترة: يناير 2025

الأجهزة:
├── رصيد أول الشهر:     180
├── مشتريات:           + 85
├── مبيعات:            - 62
├── إرجاعات مبيعات:    + 3
├── إرجاعات للمورد:    - 5
├── شطب:               - 2
└── رصيد آخر الشهر:     199
```

## تقارير المبيعات

### 1. تقرير المبيعات اليومي
```
التاريخ: 01/02/2025

المبيعات:
├── عدد الفواتير: 8
├── عدد الأجهزة: 12
└── القيمة: 6,500,000

حسب نوع البيع:
├── نقدي: 4 فواتير - 3,200,000
├── آجل: 1 فاتورة - 800,000
├── أقساطي: 2 فاتورة - 1,800,000
└── جني: 1 فاتورة - 700,000

أعلى مبيعات:
├── Dell Latitude 7410: 3 أجهزة
└── HP EliteBook 840: 2 أجهزة
```

### 2. تقرير أداء الموظفين
```
الفترة: يناير 2025

التجهيز:
├── أحمد: 89 جهاز (متوسط 3.7/يوم)
├── محمد: 76 جهاز (متوسط 3.2/يوم)
└── علي: 82 جهاز (متوسط 3.4/يوم)

المبيعات:
├── حسين: 35 فاتورة - 18,500,000
└── كريم: 28 فاتورة - 15,200,000

الحضور:
├── أعلى التزام: أحمد (98%)
└── أقل التزام: علي (85%)
```

## تقارير خاصة

### 1. تقرير الأقساط
```
الفترة: يناير 2025

أقساطي:
├── عدد الفواتير: 25
├── القيمة الإجمالية: 14,500,000
├── تم تحويله: 12,000,000
├── بانتظار: 2,500,000
└── الربح: 1,950,000

جني:
├── عدد الفواتير: 18
├── القيمة الإجمالية: 9,800,000
├── تم تحويله: 8,200,000
├── بانتظار: 1,600,000
└── الربح (بعد خصم 5%): 980,000
```

### 2. تقرير الصيانة
```
الفترة: يناير 2025

صيانة داخلية: 23 جهاز
├── مكتملة: 20
├── قيد العمل: 3
└── متوسط الوقت: 2 يوم

صيانة للمورد: 8 أجهزة
├── مرتجعة: 5
├── بالانتظار: 3
└── متوسط الوقت: 12 يوم

صيانة زبائن: 15 طلب
├── مكتملة: 12
├── قيد العمل: 3
├── إيرادات: 2,500,000
└── رضا العملاء: 4.5/5
```

---

# 💾 النسخ الاحتياطي

## استراتيجية النسخ

### التخزين السحابي (Supabase)
```
├── قاعدة البيانات الرئيسية
├── مزامنة فورية
├── نسخة تلقائية يومية
└── استرجاع لأي نقطة زمنية
```

### النسخ المحلي
```
├── نسخة يومية على جهاز مخول
├── التشفير: AES-256
├── الأجهزة المخولة فقط
└── رمز تحقق للسحب
```

### التخزين الوسائط (Cloudflare R2)
```
├── الصور والفيديوهات
├── CDN للوصول السريع
├── نسخ احتياطي منفصل
└── تكلفة منخفضة
```

## جدول النسخ

```
يومياً:
├── قاعدة البيانات الكاملة
├── الإعدادات
└── السجلات

أسبوعياً:
├── الوسائط الجديدة
└── التقارير المؤرشفة

شهرياً:
├── نسخة كاملة شاملة
└── حفظ خارجي (اختياري)
```

## الاسترجاع

```
في حالة الطوارئ:
├── استرجاع من السحابة (دقائق)
├── استرجاع من النسخة المحلية (ساعة)
└── استرجاع جزئي (جداول محددة)
```

---

# 📱 تطبيق الموبايل

## الميزات الرئيسية

### 1. ماسح الباركود
```
├── مسح سيريال الجهاز
├── عرض معلومات فورية
├── تسجيل الذمة
└── تحديث الموقع
```

### 2. التصوير
```
├── صور الفحص
├── صور العيوب
├── فيديو التغليف
├── رفع تلقائي للأرشيف
└── ربط بالسيريال
```

### 3. المهام
```
├── عرض المهام المعينة
├── بدء/إنهاء المهمة
├── إضافة ملاحظات
└── إشعارات فورية
```

### 4. الدردشة
```
├── دردشة العمل
├── دردشة خاصة
├── مساعد AI
└── إرسال صور/ملفات
```

### 5. للمدير
```
├── لوحة تحكم مختصرة
├── الموافقات السريعة
├── أوامر صوتية
└── تقارير فورية
```

## العمل أوفلاين

```
├── حفظ البيانات محلياً
├── تسجيل العمليات
├── مزامنة عند الاتصال
└── تنبيه للعمليات المعلقة
```

---

# 🔄 خطة الترحيل

## المرحلة 1: التحضير
```
المدة: أسبوع

├── تنصيب النظام الجديد
├── إعداد المستخدمين والصلاحيات
├── تدريب الموظفين
├── اختبار العمليات الأساسية
└── لا تغيير بالعمل الحالي
```

## المرحلة 2: إدخال المخزون الجديد
```
المدة: 2-4 أسابيع

├── كل جهاز جديد يدخل بالنظام الجديد
├── فحص + سيريال + ملصق
├── المخزون القديم يبقى كما هو
├── المبيعات من القديم: فاتورة بدون سيريال
└── المبيعات من الجديد: فاتورة كاملة
```

## المرحلة 3: ترحيل المخزون القديم
```
المدة: 2-3 أسابيع

├── تخصيص وقت يومي للجرد
├── فريق صغير (2-3 موظفين)
├── إدخال جهاز جهاز
├── فحص سريع + سيريال
└── الأولوية للأجهزة الأكثر طلباً
```

## المرحلة 4: التشغيل الكامل
```
├── كل العمليات بالنظام الجديد
├── إيقاف النظام القديم
├── مراقبة ومعالجة المشاكل
└── تحسين مستمر
```

## التعامل مع البيع أثناء الترحيل

### جهاز بدون سيريال (قديم)
```
├── فاتورة عادية بدون سيريال
├── اختيار المنتج من القائمة
├── لا تتبع بعد البيع
└── يُسجل كـ "مخزون قديم"
```

### جهاز بسيريال (جديد)
```
├── مسح السيريال
├── فاتورة كاملة
├── تتبع كامل
└── أرشيف شامل
```

---

# 📋 ملخص الميزات

## الميزات الأساسية ✅
- [x] تتبع الأجهزة بسيريال فريد
- [x] دورة حياة كاملة للجهاز
- [x] نظام فحص وجودة
- [x] أنواع فواتير متعددة
- [x] نظام أقساط (أقساطي + جني)
- [x] تكامل مع التوصيل
- [x] نظام صيانة شامل
- [x] إدارة الموظفين
- [x] تقارير مالية ومخزون
- [x] نسخ احتياطي

## الميزات الذكية ✅
- [x] توزيع مهام تلقائي
- [x] تقدير وقت التجهيز
- [x] دردشة ذكية مع AI
- [x] مساعد AI للموظفين
- [x] أوامر صوتية للمدير
- [x] غرامات ومكافآت تلقائية
- [x] تنبيهات ذكية
- [x] تحليل الأداء

## التكاملات ✅
- [x] API جني (SuperKey)
- [x] شركة التوصيل (برايم)
- [x] تطبيق موبايل
- [x] ماسح باركود
- [x] طابعة ملصقات
- [x] تخزين سحابي

---

# 🚀 الخطوات التالية

1. **مراجعة الخطة** - التأكد من شمولية كل المتطلبات
2. **تحديد الأولويات** - ما الذي يُبنى أولاً
3. **اختيار الفريق** - مطورين، مصممين
4. **تحديد الميزانية** - التكاليف المتوقعة
5. **البدء بالتطوير** - MVP أولاً

---

*آخر تحديث: فبراير 2025*
*الإصدار: 1.0*

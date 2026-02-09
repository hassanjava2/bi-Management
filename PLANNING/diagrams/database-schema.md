# 🗄️ Database Schema - بنية قاعدة البيانات

> **آخر تحديث:** 2026-02-01

---

## 📊 نظرة عامة

```
┌─────────────────────────────────────────────────────────────┐
│                    BI Database Schema                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐    │
│  │  Products   │────►│  Inventory  │────►│  Movements  │    │
│  └─────────────┘     └─────────────┘     └─────────────┘    │
│         │                   │                               │
│         │            ┌──────┴──────┐                        │
│         │            │             │                        │
│         ▼            ▼             ▼                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │  Returns    │  │  Orders     │  │  Invoices   │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
│         │                │                │                 │
│         ▼                ▼                ▼                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │  Suppliers  │  │  Customers  │  │  Employees  │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 📋 الجداول

### 1. المنتجات (Products)

```sql
CREATE TABLE bi_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- المعلومات الأساسية
    name VARCHAR(255) NOT NULL,
    name_ar VARCHAR(255),
    barcode VARCHAR(100) UNIQUE,
    serial_number VARCHAR(100),
    sku VARCHAR(50),
    
    -- التصنيف
    category_id UUID REFERENCES bi_categories(id),
    brand_id UUID REFERENCES bi_brands(id),
    
    -- الأسعار 🔒
    buy_price DECIMAL(15,2),           -- سري
    buy_currency VARCHAR(3) DEFAULT 'IQD',
    
    -- أسعار البيع
    sell_price_1 DECIMAL(15,2),        -- سعر التجزئة
    sell_price_2 DECIMAL(15,2),        -- سعر 2
    sell_price_3 DECIMAL(15,2),        -- سعر 3
    wholesale_price DECIMAL(15,2),     -- سعر الجملة
    sell_currency VARCHAR(3) DEFAULT 'IQD',
    
    -- الربح 🔒
    profit_margin DECIMAL(15,2),       -- سري
    profit_percentage DECIMAL(5,2),    -- سري
    
    -- المواصفات
    specs JSONB,
    description TEXT,
    description_ar TEXT,
    
    -- الصور
    images TEXT[],
    thumbnail VARCHAR(500),
    
    -- المخزون
    min_stock INTEGER DEFAULT 0,
    
    -- الحالة
    status VARCHAR(20) DEFAULT 'active',  -- active, inactive, discontinued
    is_featured BOOLEAN DEFAULT false,
    
    -- التتبع
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES bi_users(id),
    
    -- للتزامن
    sync_id VARCHAR(100),
    last_synced TIMESTAMP
);

-- Indexes
CREATE INDEX idx_products_barcode ON bi_products(barcode);
CREATE INDEX idx_products_category ON bi_products(category_id);
CREATE INDEX idx_products_brand ON bi_products(brand_id);
CREATE INDEX idx_products_status ON bi_products(status);
```

---

### 2. التصنيفات (Categories)

```sql
CREATE TABLE bi_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    name_ar VARCHAR(100),
    slug VARCHAR(100) UNIQUE,
    parent_id UUID REFERENCES bi_categories(id),
    icon VARCHAR(100),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

### 3. الماركات (Brands)

```sql
CREATE TABLE bi_brands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    logo VARCHAR(500),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

### 4. المخزون (Inventory)

```sql
CREATE TABLE bi_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES bi_products(id) NOT NULL,
    warehouse_id UUID REFERENCES bi_warehouses(id) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    reserved_quantity INTEGER DEFAULT 0,  -- محجوز للطلبات
    available_quantity INTEGER GENERATED ALWAYS AS (quantity - reserved_quantity) STORED,
    last_counted TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(product_id, warehouse_id)
);

CREATE INDEX idx_inventory_product ON bi_inventory(product_id);
CREATE INDEX idx_inventory_warehouse ON bi_inventory(warehouse_id);
```

---

### 5. المخازن (Warehouses)

```sql
CREATE TABLE bi_warehouses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) DEFAULT 'main',  -- main, damaged, returns
    location VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- إدخال المخازن الافتراضية
INSERT INTO bi_warehouses (name, type) VALUES
    ('المخزن الرئيسي', 'main'),
    ('المواد التالفة', 'damaged'),
    ('مرتجعات قيد المعالجة', 'returns');
```

---

### 6. حركة المخزون (Stock Movements)

```sql
CREATE TABLE bi_stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES bi_products(id) NOT NULL,
    warehouse_id UUID REFERENCES bi_warehouses(id) NOT NULL,
    
    movement_type VARCHAR(20) NOT NULL,  -- in, out, transfer, adjustment
    quantity INTEGER NOT NULL,
    
    -- المرجع
    reference_type VARCHAR(50),  -- purchase, sale, return, adjustment
    reference_id UUID,
    
    -- قبل/بعد
    quantity_before INTEGER,
    quantity_after INTEGER,
    
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES bi_users(id)
);

CREATE INDEX idx_movements_product ON bi_stock_movements(product_id);
CREATE INDEX idx_movements_date ON bi_stock_movements(created_at);
```

---

### 7. المرتجعات (Returns) ⭐

```sql
CREATE TABLE bi_returns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    return_number VARCHAR(50) UNIQUE,  -- RTN-2024-001
    
    -- المورد
    supplier_id UUID REFERENCES bi_suppliers(id),
    supplier_name VARCHAR(255),  -- نسخة للتاريخ
    
    -- التواريخ
    sent_date TIMESTAMP NOT NULL DEFAULT NOW(),
    expected_return_date TIMESTAMP,
    actual_return_date TIMESTAMP,
    
    -- الحالة
    status VARCHAR(30) DEFAULT 'pending',
    -- pending, in_repair, repaired, replaced, rejected, returned, lost
    
    -- التفاصيل
    reason TEXT,
    notes TEXT,
    
    -- الموظف
    sent_by UUID REFERENCES bi_users(id),
    received_by UUID REFERENCES bi_users(id),
    
    -- صور
    images_before TEXT[],
    images_after TEXT[],
    
    -- الإحصائيات
    total_items INTEGER DEFAULT 0,
    returned_items INTEGER DEFAULT 0,
    lost_items INTEGER DEFAULT 0,
    
    -- التنبيهات
    alert_level INTEGER DEFAULT 0,  -- 0=normal, 1=warning, 2=critical
    last_follow_up TIMESTAMP,
    follow_up_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_returns_status ON bi_returns(status);
CREATE INDEX idx_returns_supplier ON bi_returns(supplier_id);
CREATE INDEX idx_returns_sent_date ON bi_returns(sent_date);
```

---

### 8. عناصر المرتجعات (Return Items)

```sql
CREATE TABLE bi_return_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    return_id UUID REFERENCES bi_returns(id) NOT NULL,
    product_id UUID REFERENCES bi_products(id) NOT NULL,
    
    serial_number VARCHAR(100),
    barcode VARCHAR(100),
    
    quantity INTEGER DEFAULT 1,
    
    -- السبب
    problem_description TEXT,
    
    -- النتيجة
    item_status VARCHAR(30) DEFAULT 'pending',
    -- pending, repaired, replaced, rejected, lost
    
    result_notes TEXT,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_return_items_return ON bi_return_items(return_id);
CREATE INDEX idx_return_items_product ON bi_return_items(product_id);
```

---

### 9. متابعات المرتجعات (Return Follow-ups)

```sql
CREATE TABLE bi_return_follow_ups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    return_id UUID REFERENCES bi_returns(id) NOT NULL,
    
    action_type VARCHAR(50),  -- call, message, visit, email
    contact_person VARCHAR(255),
    
    notes TEXT,
    response TEXT,
    
    next_action_date TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES bi_users(id)
);
```

---

### 10. الموردين (Suppliers) 🔒

```sql
CREATE TABLE bi_suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    company_name VARCHAR(255),
    
    -- الاتصال
    phone VARCHAR(20),
    phone_2 VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    city VARCHAR(100),
    
    -- التصنيف
    type VARCHAR(50),  -- main, secondary, repair
    
    -- التقييم
    rating DECIMAL(2,1) DEFAULT 0,  -- 0-5
    avg_repair_days INTEGER,
    
    -- مالي 🔒
    balance DECIMAL(15,2) DEFAULT 0,  -- الرصيد
    credit_limit DECIMAL(15,2),
    payment_terms VARCHAR(100),
    
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- الموردين الرئيسيين
INSERT INTO bi_suppliers (name, company_name, type) VALUES
    ('سيد أحمد', 'العربي للحاسبات', 'main'),
    ('سليم التميمي', 'التميمي', 'main'),
    ('أبو منتظر', 'العالمية للحاسبات', 'main'),
    ('وكيل الديوانية', NULL, 'secondary');
```

---

### 11. المستخدمين (Users)

```sql
CREATE TABLE bi_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    avatar VARCHAR(500),
    
    role VARCHAR(30) DEFAULT 'staff',  -- owner, admin, accountant, warehouse, sales
    permissions JSONB,
    
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

---

### 12. الموظفين (Employees) 🔒

```sql
CREATE TABLE bi_employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES bi_users(id),
    
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    
    position VARCHAR(100),
    department VARCHAR(100),
    
    -- الراتب 🔒
    salary DECIMAL(15,2),
    salary_currency VARCHAR(3) DEFAULT 'IQD',
    
    start_date DATE,
    end_date DATE,
    
    is_active BOOLEAN DEFAULT true,
    
    -- القصة الشخصية 🔒 (للمالك فقط)
    private_notes TEXT,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

---

### 13. الطلبات (Orders) - من الموقع

```sql
CREATE TABLE bi_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(50) UNIQUE,  -- ORD-2024-001
    
    -- الزبون
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    customer_email VARCHAR(255),
    
    -- العنوان
    shipping_address TEXT,
    city VARCHAR(100),
    governorate VARCHAR(100),
    
    -- المبالغ
    subtotal DECIMAL(15,2),
    discount DECIMAL(15,2) DEFAULT 0,
    shipping_cost DECIMAL(15,2) DEFAULT 0,
    total DECIMAL(15,2),
    currency VARCHAR(3) DEFAULT 'IQD',
    
    -- الحالة
    status VARCHAR(30) DEFAULT 'pending',
    -- pending, confirmed, processing, shipped, delivered, cancelled
    
    payment_method VARCHAR(50) DEFAULT 'cod',  -- cod = cash on delivery
    payment_status VARCHAR(30) DEFAULT 'pending',
    
    notes TEXT,
    
    -- المصدر
    source VARCHAR(50) DEFAULT 'website',  -- website, phone, walk-in
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

---

### 14. عناصر الطلب (Order Items)

```sql
CREATE TABLE bi_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES bi_orders(id) NOT NULL,
    product_id UUID REFERENCES bi_products(id) NOT NULL,
    
    product_name VARCHAR(255),  -- نسخة للتاريخ
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(15,2) NOT NULL,
    total_price DECIMAL(15,2) NOT NULL,
    
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

### 15. سجل المحادثات (Chat Logs)

```sql
CREATE TABLE bi_chat_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    user_id UUID REFERENCES bi_users(id),
    session_id VARCHAR(100),
    
    role VARCHAR(20),  -- user, assistant
    content TEXT NOT NULL,
    
    metadata JSONB,
    
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_chat_logs_user ON bi_chat_logs(user_id);
CREATE INDEX idx_chat_logs_session ON bi_chat_logs(session_id);
CREATE INDEX idx_chat_logs_date ON bi_chat_logs(created_at);
```

---

### 16. سجل التدقيق (Audit Logs)

```sql
CREATE TABLE bi_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    user_id UUID REFERENCES bi_users(id),
    action VARCHAR(100) NOT NULL,
    
    entity_type VARCHAR(100),
    entity_id UUID,
    
    old_values JSONB,
    new_values JSONB,
    
    ip_address VARCHAR(45),
    user_agent TEXT,
    
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_user ON bi_audit_logs(user_id);
CREATE INDEX idx_audit_entity ON bi_audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_date ON bi_audit_logs(created_at);
```

---

## 🔐 Views للصلاحيات

```sql
-- View للمنتجات بدون أسعار الشراء (للموظفين)
CREATE VIEW v_products_public AS
SELECT 
    id, name, name_ar, barcode, serial_number,
    category_id, brand_id,
    sell_price_1, sell_price_2, sell_price_3, wholesale_price,
    specs, description, images, thumbnail,
    min_stock, status, is_featured
FROM bi_products;

-- View للمنتجات مع الأرباح (للمالك فقط)
CREATE VIEW v_products_with_profit AS
SELECT 
    *,
    (sell_price_1 - buy_price) as profit_amount,
    ROUND((sell_price_1 - buy_price) / buy_price * 100, 2) as profit_pct
FROM bi_products;
```

---

## 📊 إحصائيات مفيدة

```sql
-- المرتجعات المعلقة
CREATE VIEW v_pending_returns AS
SELECT 
    r.*,
    s.name as supplier_name,
    EXTRACT(DAY FROM NOW() - r.sent_date) as days_pending,
    CASE 
        WHEN EXTRACT(DAY FROM NOW() - r.sent_date) > 14 THEN 'critical'
        WHEN EXTRACT(DAY FROM NOW() - r.sent_date) > 7 THEN 'warning'
        ELSE 'normal'
    END as alert_status
FROM bi_returns r
LEFT JOIN bi_suppliers s ON r.supplier_id = s.id
WHERE r.status IN ('pending', 'in_repair')
ORDER BY r.sent_date;

-- المخزون المنخفض
CREATE VIEW v_low_stock AS
SELECT 
    p.id, p.name, p.barcode, p.min_stock,
    COALESCE(SUM(i.quantity), 0) as current_stock
FROM bi_products p
LEFT JOIN bi_inventory i ON p.id = i.product_id
GROUP BY p.id
HAVING COALESCE(SUM(i.quantity), 0) <= p.min_stock;
```

---

*آخر تحديث: 2026-02-01*

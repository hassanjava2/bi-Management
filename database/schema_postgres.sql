-- BI Management - PostgreSQL Schema
-- نفس البنية لـ schema_v3_sqlite مع تعديلات متوافقة مع PostgreSQL

-- ============================================
-- CORE: Users, Roles, Permissions
-- ============================================

CREATE TABLE IF NOT EXISTS roles (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    name_ar TEXT,
    description TEXT,
    security_level INTEGER DEFAULT 0,
    is_system INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    color TEXT,
    icon TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS permissions (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    name_ar TEXT,
    name_en TEXT,
    module TEXT,
    feature TEXT,
    action TEXT,
    description TEXT,
    is_sensitive INTEGER DEFAULT 0,
    requires_2fa INTEGER DEFAULT 0,
    requires_approval INTEGER DEFAULT 0,
    security_level INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS role_permissions (
    id TEXT PRIMARY KEY,
    role_id TEXT NOT NULL,
    permission_id TEXT NOT NULL,
    granted_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    granted_by TEXT
);

CREATE TABLE IF NOT EXISTS departments (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    name_en TEXT,
    description TEXT,
    manager_id TEXT,
    parent_id TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS positions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE,
    email TEXT UNIQUE,
    password_hash TEXT NOT NULL,
    full_name TEXT,
    phone TEXT,
    role TEXT DEFAULT 'employee',
    role_id TEXT,
    security_level INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    employee_code TEXT,
    department_id TEXT,
    position_id TEXT,
    salary_encrypted TEXT,
    hire_date TIMESTAMPTZ,
    created_by TEXT,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMPTZ,
    last_login_at TIMESTAMPTZ,
    last_login TIMESTAMPTZ,
    total_points INTEGER DEFAULT 0,
    monthly_points INTEGER DEFAULT 0,
    current_level INTEGER DEFAULT 1,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_permissions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    permission_id TEXT NOT NULL,
    is_granted INTEGER DEFAULT 1,
    granted_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    granted_by TEXT,
    expires_at TIMESTAMPTZ,
    reason TEXT
);

CREATE TABLE IF NOT EXISTS permission_history (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    role_id TEXT,
    permission_id TEXT,
    action TEXT,
    old_value TEXT,
    new_value TEXT,
    changed_by TEXT,
    changed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    reason TEXT,
    ip_address TEXT
);

CREATE TABLE IF NOT EXISTS user_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token_hash TEXT,
    ip_address TEXT,
    expires_at TIMESTAMPTZ,
    is_active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
);

-- ============================================
-- PRODUCTS & INVENTORY
-- ============================================

CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT,
    name_ar TEXT
);

CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    code TEXT,
    sku TEXT,
    barcode TEXT,
    name TEXT NOT NULL,
    name_ar TEXT,
    description TEXT,
    category_id TEXT,
    brand TEXT,
    model TEXT,
    cost_price DOUBLE PRECISION DEFAULT 0,
    selling_price DOUBLE PRECISION DEFAULT 0,
    wholesale_price DOUBLE PRECISION DEFAULT 0,
    min_price DOUBLE PRECISION DEFAULT 0,
    track_by_serial INTEGER DEFAULT 0,
    quantity INTEGER DEFAULT 0,
    min_quantity INTEGER DEFAULT 0,
    unit TEXT DEFAULT 'piece',
    warranty_months INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    is_deleted INTEGER DEFAULT 0,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT
);

CREATE TABLE IF NOT EXISTS warehouses (
    id TEXT PRIMARY KEY,
    code TEXT,
    name TEXT NOT NULL,
    type TEXT DEFAULT 'main',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS serial_numbers (
    id TEXT PRIMARY KEY,
    serial_number TEXT,
    product_id TEXT,
    purchase_cost DOUBLE PRECISION DEFAULT 0,
    supplier_id TEXT,
    status TEXT DEFAULT 'available',
    warehouse_id TEXT DEFAULT 'main',
    is_deleted INTEGER DEFAULT 0,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS serial_number_history (
    id TEXT PRIMARY KEY,
    device_id TEXT,
    event_type TEXT,
    event_details TEXT,
    performed_by TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS devices (
    id TEXT PRIMARY KEY,
    serial_number TEXT,
    product_id TEXT,
    product_name TEXT,
    brand TEXT,
    model TEXT,
    processor TEXT,
    ram_size TEXT,
    storage_size TEXT,
    status TEXT DEFAULT 'new',
    warehouse_id TEXT DEFAULT 'main',
    location_shelf TEXT,
    location_row TEXT,
    custody_employee TEXT,
    purchase_cost DOUBLE PRECISION DEFAULT 0,
    supplier_id TEXT,
    is_deleted INTEGER DEFAULT 0,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT
);

CREATE TABLE IF NOT EXISTS device_history (
    id TEXT PRIMARY KEY,
    device_id TEXT,
    event_type TEXT,
    event_details TEXT,
    performed_by TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS inventory_movements (
    id TEXT PRIMARY KEY,
    product_id TEXT,
    warehouse_id TEXT,
    type TEXT,
    movement_type TEXT,
    quantity INTEGER DEFAULT 0,
    before_quantity INTEGER DEFAULT 0,
    after_quantity INTEGER DEFAULT 0,
    reason TEXT,
    notes TEXT,
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- CUSTOMERS & SUPPLIERS
-- ============================================

CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    code TEXT,
    name TEXT NOT NULL,
    type TEXT DEFAULT 'retail',
    phone TEXT,
    phone2 TEXT,
    email TEXT,
    addresses TEXT,
    balance DOUBLE PRECISION DEFAULT 0,
    credit_limit DOUBLE PRECISION DEFAULT 0,
    loyalty_level TEXT DEFAULT 'bronze',
    notes TEXT,
    is_active INTEGER DEFAULT 1,
    is_blocked INTEGER DEFAULT 0,
    blocked_reason TEXT,
    is_deleted INTEGER DEFAULT 0,
    deleted_at TIMESTAMPTZ,
    last_purchase_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT
);

CREATE TABLE IF NOT EXISTS suppliers (
    id TEXT PRIMARY KEY,
    code TEXT,
    name TEXT NOT NULL,
    name_ar TEXT,
    type TEXT DEFAULT 'company',
    contact_person TEXT,
    phone TEXT,
    phone2 TEXT,
    email TEXT,
    website TEXT,
    address TEXT,
    city TEXT,
    country TEXT,
    notes TEXT,
    rating DOUBLE PRECISION DEFAULT 0,
    total_purchases DOUBLE PRECISION DEFAULT 0,
    balance DOUBLE PRECISION DEFAULT 0,
    pending_returns INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    is_deleted INTEGER DEFAULT 0,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- INVOICES & PAYMENTS
-- ============================================

CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY,
    invoice_number TEXT,
    type TEXT DEFAULT 'sale',
    payment_type TEXT,
    status TEXT DEFAULT 'draft',
    payment_status TEXT DEFAULT 'pending',
    customer_id TEXT,
    supplier_id TEXT,
    subtotal DOUBLE PRECISION DEFAULT 0,
    discount_amount DOUBLE PRECISION DEFAULT 0,
    tax_amount DOUBLE PRECISION DEFAULT 0,
    total DOUBLE PRECISION DEFAULT 0,
    paid_amount DOUBLE PRECISION DEFAULT 0,
    remaining_amount DOUBLE PRECISION DEFAULT 0,
    payment_method TEXT,
    notes TEXT,
    discount_percent DOUBLE PRECISION DEFAULT 0,
    shipping_cost DOUBLE PRECISION DEFAULT 0,
    sub_type TEXT,
    due_date TIMESTAMPTZ,
    auditor_id TEXT,
    audited_at TIMESTAMPTZ,
    preparer_id TEXT,
    prepared_at TIMESTAMPTZ,
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    is_deleted INTEGER DEFAULT 0,
    deleted_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    cancelled_reason TEXT,
    voided_at TIMESTAMPTZ,
    void_reason TEXT
);

CREATE TABLE IF NOT EXISTS invoice_items (
    id TEXT PRIMARY KEY,
    invoice_id TEXT NOT NULL,
    product_id TEXT,
    product_name TEXT,
    serial_number TEXT,
    quantity INTEGER DEFAULT 1,
    unit_price DOUBLE PRECISION DEFAULT 0,
    cost_price DOUBLE PRECISION DEFAULT 0,
    discount DOUBLE PRECISION DEFAULT 0,
    total DOUBLE PRECISION DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS invoice_payments (
    id TEXT PRIMARY KEY,
    invoice_id TEXT NOT NULL,
    amount DOUBLE PRECISION DEFAULT 0,
    payment_method TEXT,
    notes TEXT,
    received_by TEXT,
    received_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS invoice_workflow_log (
    id TEXT PRIMARY KEY,
    invoice_id TEXT NOT NULL,
    event TEXT,
    user_id TEXT,
    role TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pending_invoice_reminders (
    id TEXT PRIMARY KEY,
    invoice_id TEXT NOT NULL,
    remind_at TIMESTAMPTZ,
    remind_count INTEGER DEFAULT 0,
    notify_creator INTEGER DEFAULT 1,
    notify_supervisor INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS invoice_expenses (
    id TEXT PRIMARY KEY,
    invoice_id TEXT NOT NULL,
    expense_type TEXT,
    amount DOUBLE PRECISION DEFAULT 0,
    currency TEXT DEFAULT 'IQD',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- RETURNS
-- ============================================

CREATE TABLE IF NOT EXISTS returns (
    id TEXT PRIMARY KEY,
    return_number TEXT,
    type TEXT,
    original_invoice_id TEXT,
    customer_id TEXT,
    supplier_id TEXT,
    classification TEXT,
    reason_category TEXT,
    reason_details TEXT,
    status TEXT DEFAULT 'pending',
    notes TEXT,
    images TEXT,
    destination_warehouse_id TEXT,
    processed_at TIMESTAMPTZ,
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS return_items (
    id TEXT PRIMARY KEY,
    return_id TEXT NOT NULL,
    product_id TEXT,
    serial_id TEXT,
    serial_number TEXT,
    quantity INTEGER DEFAULT 1,
    unit_price DOUBLE PRECISION DEFAULT 0,
    item_classification TEXT,
    condition_notes TEXT,
    decision TEXT
);

-- ============================================
-- ACCOUNTING & FINANCE
-- ============================================

CREATE TABLE IF NOT EXISTS vouchers (
    id TEXT PRIMARY KEY,
    voucher_number TEXT,
    type TEXT DEFAULT 'receipt',
    amount DOUBLE PRECISION DEFAULT 0,
    currency TEXT DEFAULT 'IQD',
    customer_id TEXT,
    supplier_id TEXT,
    employee_id TEXT,
    from_account_id TEXT,
    to_account_id TEXT,
    reference_type TEXT,
    reference_id TEXT,
    payment_method TEXT,
    description TEXT,
    notes TEXT,
    is_deleted INTEGER DEFAULT 0,
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT DEFAULT 'asset'
);

CREATE TABLE IF NOT EXISTS cash_registers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    balance DOUBLE PRECISION DEFAULT 0,
    responsible_user_id TEXT,
    is_active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS cash_transactions (
    id TEXT PRIMARY KEY,
    cash_register_id TEXT NOT NULL,
    type TEXT DEFAULT 'in',
    amount DOUBLE PRECISION DEFAULT 0,
    description TEXT,
    reference_type TEXT,
    reference_id TEXT,
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS journal_entries (
    id TEXT PRIMARY KEY,
    entry_number TEXT,
    entry_date TIMESTAMPTZ,
    description TEXT,
    total_debit DOUBLE PRECISION DEFAULT 0,
    total_credit DOUBLE PRECISION DEFAULT 0,
    status TEXT DEFAULT 'draft',
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS journal_entry_lines (
    id TEXT PRIMARY KEY,
    journal_entry_id TEXT NOT NULL,
    account_id TEXT,
    debit DOUBLE PRECISION DEFAULT 0,
    credit DOUBLE PRECISION DEFAULT 0,
    description TEXT
);

-- ============================================
-- TASKS & ATTENDANCE
-- ============================================

CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    assigned_to TEXT,
    assigned_by TEXT,
    department_id TEXT,
    priority TEXT DEFAULT 'medium',
    status TEXT DEFAULT 'pending',
    category TEXT,
    source TEXT,
    source_reference TEXT,
    due_date TIMESTAMPTZ,
    estimated_minutes INTEGER,
    actual_minutes INTEGER,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    delay_reason TEXT,
    attachments TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS task_comments (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,
    user_id TEXT,
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS task_templates (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    title TEXT,
    description TEXT,
    priority TEXT DEFAULT 'medium',
    estimated_minutes INTEGER,
    recurrence TEXT,
    day_of_week TEXT,
    day_of_month TEXT,
    is_active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS attendance (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    date DATE NOT NULL,
    check_in TIMESTAMPTZ,
    check_out TIMESTAMPTZ,
    check_in_location TEXT,
    check_out_location TEXT,
    check_in_method TEXT DEFAULT 'manual',
    check_out_method TEXT,
    status TEXT DEFAULT 'present',
    late_minutes INTEGER DEFAULT 0,
    work_minutes INTEGER DEFAULT 0,
    overtime_minutes INTEGER DEFAULT 0,
    notes TEXT,
    approved_by TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vacations (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT DEFAULT 'annual',
    start_date DATE,
    end_date DATE,
    reason TEXT,
    status TEXT DEFAULT 'pending',
    approved_by TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- NOTIFICATIONS & AUDIT
-- ============================================

CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    recipient_id TEXT,
    recipient_type TEXT DEFAULT 'user',
    type TEXT DEFAULT 'info',
    priority TEXT DEFAULT 'normal',
    title TEXT,
    message TEXT,
    entity_type TEXT,
    entity_id TEXT,
    action_url TEXT,
    data TEXT,
    is_read INTEGER DEFAULT 0,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    event_type TEXT,
    event_category TEXT,
    severity TEXT DEFAULT 'info',
    user_id TEXT,
    user_name TEXT,
    user_role TEXT,
    ip_address TEXT,
    user_agent TEXT,
    device_fingerprint TEXT,
    entity_type TEXT,
    entity_id TEXT,
    entity_name TEXT,
    old_value TEXT,
    new_value TEXT,
    changes TEXT,
    request_id TEXT,
    session_id TEXT,
    module TEXT,
    action TEXT,
    metadata TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS security_events (
    id TEXT PRIMARY KEY,
    event_type TEXT,
    severity TEXT DEFAULT 'low',
    user_id TEXT,
    details TEXT,
    resolved INTEGER DEFAULT 0,
    resolved_by TEXT,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS approvals (
    id TEXT PRIMARY KEY,
    approval_number TEXT,
    type TEXT,
    entity_type TEXT,
    entity_id TEXT,
    requested_by TEXT,
    requester_name TEXT,
    request_reason TEXT,
    request_data TEXT,
    status TEXT DEFAULT 'pending',
    priority TEXT DEFAULT 'normal',
    expires_at TIMESTAMPTZ,
    decided_by TEXT,
    decision_reason TEXT,
    decided_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS alert_rules (
    id TEXT PRIMARY KEY,
    code TEXT,
    name TEXT,
    description TEXT,
    is_enabled INTEGER DEFAULT 1,
    threshold TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- WARRANTY & DELIVERY
-- ============================================

CREATE TABLE IF NOT EXISTS warranty_claims (
    id TEXT PRIMARY KEY,
    claim_number TEXT,
    device_id TEXT,
    device_serial TEXT,
    supplier_id TEXT,
    supplier_name TEXT,
    customer_id TEXT,
    customer_name TEXT,
    customer_phone TEXT,
    customer_address TEXT,
    issue_description TEXT,
    issue_category TEXT,
    status TEXT DEFAULT 'pending',
    sent_to_supplier_at TIMESTAMPTZ,
    supplier_received_at TIMESTAMPTZ,
    supplier_response_at TIMESTAMPTZ,
    supplier_decision TEXT,
    supplier_notes TEXT,
    repair_cost DOUBLE PRECISION DEFAULT 0,
    parts_cost DOUBLE PRECISION DEFAULT 0,
    replacement_device_id TEXT,
    paid_by TEXT,
    returned_at TIMESTAMPTZ,
    customer_notified INTEGER DEFAULT 0,
    customer_notified_at TIMESTAMPTZ,
    customer_notification_method TEXT,
    customer_notification_notes TEXT,
    closed_at TIMESTAMPTZ,
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS warranty_tracking (
    id TEXT PRIMARY KEY,
    claim_id TEXT NOT NULL,
    action TEXT,
    action_details TEXT,
    performed_by TEXT,
    performed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS deliveries (
    id TEXT PRIMARY KEY,
    tracking_number TEXT,
    invoice_id TEXT,
    customer_id TEXT,
    customer_name TEXT,
    address TEXT,
    notes TEXT,
    scheduled_date TIMESTAMPTZ,
    delivered_date TIMESTAMPTZ,
    status TEXT DEFAULT 'pending',
    driver_id TEXT,
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- GOALS & TRAINING
-- ============================================

CREATE TABLE IF NOT EXISTS point_transactions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    points INTEGER DEFAULT 0,
    reason TEXT,
    description TEXT,
    admin_note TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rewards (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    points_required INTEGER DEFAULT 0,
    quantity INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reward_redemptions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    reward_id TEXT NOT NULL,
    points_spent INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS monthly_points_archive (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    month TEXT,
    year TEXT,
    points INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS training_plans (
    id TEXT PRIMARY KEY,
    position_id TEXT,
    name TEXT NOT NULL,
    description TEXT,
    duration_days INTEGER DEFAULT 30,
    tasks TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS employee_training (
    id TEXT PRIMARY KEY,
    employee_id TEXT NOT NULL,
    plan_id TEXT,
    started_at TIMESTAMPTZ,
    progress INTEGER DEFAULT 0,
    current_day INTEGER DEFAULT 1,
    status TEXT DEFAULT 'active',
    completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS training_progress (
    id TEXT PRIMARY KEY,
    training_id TEXT NOT NULL,
    task_index INTEGER,
    completed INTEGER DEFAULT 0,
    completed_at TIMESTAMPTZ,
    score DOUBLE PRECISION,
    notes TEXT
);

-- ============================================
-- BOT & SYSTEM
-- ============================================

CREATE TABLE IF NOT EXISTS bot_logs (
    id TEXT PRIMARY KEY,
    action TEXT,
    data TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bot_suggestions (
    id TEXT PRIMARY KEY,
    type TEXT,
    target TEXT,
    suggestion TEXT,
    priority TEXT DEFAULT 'medium',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bot_fixes (
    id TEXT PRIMARY KEY,
    type TEXT,
    target TEXT,
    fix_sql TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS backups (
    id TEXT PRIMARY KEY,
    filename TEXT,
    file_path TEXT,
    file_size INTEGER,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cameras (
    id TEXT PRIMARY KEY,
    name TEXT,
    rtsp_url TEXT,
    location TEXT,
    detection_config TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS camera_detections (
    id TEXT PRIMARY KEY,
    camera_id TEXT,
    detection_type TEXT,
    severity TEXT,
    location TEXT,
    image_path TEXT,
    task_created INTEGER DEFAULT 0,
    task_id TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS device_tokens (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token TEXT NOT NULL,
    device_type TEXT
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_supplier ON invoices(supplier_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_type ON invoices(type);
CREATE INDEX IF NOT EXISTS idx_invoices_created ON invoices(created_at);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_serial_numbers_product ON serial_numbers(product_id);
CREATE INDEX IF NOT EXISTS idx_serial_numbers_status ON serial_numbers(status);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_suppliers_phone ON suppliers(phone);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_attendance_user_date ON attendance(user_id, date);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_category ON audit_logs(event_category);
CREATE INDEX IF NOT EXISTS idx_vouchers_type ON vouchers(type);
CREATE INDEX IF NOT EXISTS idx_vouchers_customer ON vouchers(customer_id);
CREATE INDEX IF NOT EXISTS idx_returns_status ON returns(status);
CREATE INDEX IF NOT EXISTS idx_warranty_status ON warranty_claims(status);
CREATE INDEX IF NOT EXISTS idx_approvals_status ON approvals(status);
CREATE INDEX IF NOT EXISTS idx_deliveries_status ON deliveries(status);
CREATE INDEX IF NOT EXISTS idx_invoice_expenses_invoice ON invoice_expenses(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoices_sub_type ON invoices(sub_type);
CREATE INDEX IF NOT EXISTS idx_invoices_payment_method ON invoices(payment_method);
CREATE INDEX IF NOT EXISTS idx_devices_status ON devices(status);
CREATE INDEX IF NOT EXISTS idx_devices_warehouse ON devices(warehouse_id);

-- Default warehouses
INSERT INTO warehouses (id, code, name, type) VALUES ('main', 'WH-MAIN', 'المخزن الرئيسي', 'main') ON CONFLICT (id) DO NOTHING;
INSERT INTO warehouses (id, code, name, type) VALUES ('inspection', 'WH-INSP', 'مخزن الفحص', 'inspection') ON CONFLICT (id) DO NOTHING;
INSERT INTO warehouses (id, code, name, type) VALUES ('preparation', 'WH-PREP', 'مخزن التجهيز', 'preparation') ON CONFLICT (id) DO NOTHING;
INSERT INTO warehouses (id, code, name, type) VALUES ('repair', 'WH-REP', 'مخزن الصيانة', 'repair') ON CONFLICT (id) DO NOTHING;
INSERT INTO warehouses (id, code, name, type) VALUES ('returns', 'WH-RET', 'مخزن المرتجعات', 'returns') ON CONFLICT (id) DO NOTHING;
INSERT INTO warehouses (id, code, name, type) VALUES ('defective', 'WH-DEF', 'مخزن التالف', 'defective') ON CONFLICT (id) DO NOTHING;
INSERT INTO warehouses (id, code, name, type) VALUES ('accessories', 'WH-ACC', 'مخزن الإكسسوارات', 'accessories') ON CONFLICT (id) DO NOTHING;

-- Default cash register
INSERT INTO cash_registers (id, name, balance, is_active) VALUES ('main', 'الصندوق الرئيسي', 0, 1) ON CONFLICT (id) DO NOTHING;

-- Default settings
INSERT INTO settings (key, value) VALUES ('company_name', 'BI Management') ON CONFLICT (key) DO NOTHING;
INSERT INTO settings (key, value) VALUES ('currency', 'IQD') ON CONFLICT (key) DO NOTHING;
INSERT INTO settings (key, value) VALUES ('work_start_time', '08:00') ON CONFLICT (key) DO NOTHING;
INSERT INTO settings (key, value) VALUES ('work_end_time', '16:00') ON CONFLICT (key) DO NOTHING;
INSERT INTO settings (key, value) VALUES ('late_threshold_minutes', '15') ON CONFLICT (key) DO NOTHING;

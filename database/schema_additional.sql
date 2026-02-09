-- Additional schema - indexes and seeds
-- This file is loaded after schema_v3_sqlite.sql

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
INSERT OR IGNORE INTO warehouses (id, code, name, type) VALUES ('main', 'WH-MAIN', 'المخزن الرئيسي', 'main');
INSERT OR IGNORE INTO warehouses (id, code, name, type) VALUES ('inspection', 'WH-INSP', 'مخزن الفحص', 'inspection');
INSERT OR IGNORE INTO warehouses (id, code, name, type) VALUES ('preparation', 'WH-PREP', 'مخزن التجهيز', 'preparation');
INSERT OR IGNORE INTO warehouses (id, code, name, type) VALUES ('repair', 'WH-REP', 'مخزن الصيانة', 'repair');
INSERT OR IGNORE INTO warehouses (id, code, name, type) VALUES ('returns', 'WH-RET', 'مخزن المرتجعات', 'returns');
INSERT OR IGNORE INTO warehouses (id, code, name, type) VALUES ('defective', 'WH-DEF', 'مخزن التالف', 'defective');
INSERT OR IGNORE INTO warehouses (id, code, name, type) VALUES ('accessories', 'WH-ACC', 'مخزن الإكسسوارات', 'accessories');

-- Default cash register
INSERT OR IGNORE INTO cash_registers (id, name, balance, is_active) VALUES ('main', 'الصندوق الرئيسي', 0, 1);

-- Default settings
INSERT OR IGNORE INTO settings (key, value) VALUES ('company_name', 'BI Management');
INSERT OR IGNORE INTO settings (key, value) VALUES ('currency', 'IQD');
INSERT OR IGNORE INTO settings (key, value) VALUES ('work_start_time', '08:00');
INSERT OR IGNORE INTO settings (key, value) VALUES ('work_end_time', '16:00');
INSERT OR IGNORE INTO settings (key, value) VALUES ('late_threshold_minutes', '15');

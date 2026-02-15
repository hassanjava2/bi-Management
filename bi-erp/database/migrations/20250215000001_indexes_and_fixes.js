/**
 * Add performance indexes and fix column types
 * Safe to run on existing data — only adds indexes if missing
 */

async function up(pool) {
    const indexes = [
        // Invoices — most queried table
        'CREATE INDEX IF NOT EXISTS idx_invoices_type ON invoices(type)',
        'CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status)',
        'CREATE INDEX IF NOT EXISTS idx_invoices_payment_status ON invoices(payment_status)',
        'CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id)',
        'CREATE INDEX IF NOT EXISTS idx_invoices_supplier_id ON invoices(supplier_id)',
        'CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at)',
        'CREATE INDEX IF NOT EXISTS idx_invoices_is_deleted ON invoices(is_deleted)',
        'CREATE INDEX IF NOT EXISTS idx_invoices_type_status ON invoices(type, status, is_deleted)',

        // Invoice items
        'CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id)',
        'CREATE INDEX IF NOT EXISTS idx_invoice_items_product_id ON invoice_items(product_id)',

        // Invoice payments
        'CREATE INDEX IF NOT EXISTS idx_invoice_payments_invoice_id ON invoice_payments(invoice_id)',

        // Products
        'CREATE INDEX IF NOT EXISTS idx_products_name ON products(name)',
        'CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id)',
        'CREATE INDEX IF NOT EXISTS idx_products_is_deleted ON products(is_deleted)',
        'CREATE INDEX IF NOT EXISTS idx_products_quantity ON products(quantity)',

        // Customers
        'CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name)',
        'CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone)',
        'CREATE INDEX IF NOT EXISTS idx_customers_is_deleted ON customers(is_deleted)',
        'CREATE INDEX IF NOT EXISTS idx_customers_balance ON customers(balance)',

        // Suppliers
        'CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name)',
        'CREATE INDEX IF NOT EXISTS idx_suppliers_is_deleted ON suppliers(is_deleted)',

        // Notifications
        'CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id)',
        'CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read)',
        'CREATE INDEX IF NOT EXISTS idx_notifications_recipient_read ON notifications(recipient_id, is_read)',

        // Inventory movements
        'CREATE INDEX IF NOT EXISTS idx_inventory_movements_product ON inventory_movements(product_id)',
        'CREATE INDEX IF NOT EXISTS idx_inventory_movements_type ON inventory_movements(type)',
        'CREATE INDEX IF NOT EXISTS idx_inventory_movements_reason ON inventory_movements(reason)',

        // Audit log
        'CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id)',
        'CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action)',
        'CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at)',

        // Users
        'CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active)',
        'CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)',
    ];

    let created = 0;
    for (const sql of indexes) {
        try {
            await pool.query(sql);
            created++;
        } catch (e) {
            // Table might not exist yet — skip silently
            if (!e.message.includes('does not exist')) {
                console.warn(`  [!] Index warning: ${e.message}`);
            }
        }
    }
    console.log(`  [+] Created/verified ${created}/${indexes.length} indexes`);
}

async function down(pool) {
    // Not dropping indexes on rollback — they're safe to keep
    console.log('  [i] Indexes are not dropped on rollback');
}

module.exports = { up, down };

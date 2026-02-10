/**
 * ERP core: categories, products, warehouses, inventory_movements, customers, suppliers,
 * invoices, invoice_items, invoice_payments, returns, return_items, vouchers, warranty_claims
 */

async function up(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS categories (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(200),
      name_ar VARCHAR(200),
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS products (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      code VARCHAR(100),
      sku VARCHAR(100),
      barcode VARCHAR(100),
      name VARCHAR(255) NOT NULL,
      name_ar VARCHAR(255),
      description TEXT,
      category_id UUID REFERENCES categories(id),
      brand VARCHAR(100),
      model VARCHAR(100),
      cost_price NUMERIC(18,2) DEFAULT 0,
      selling_price NUMERIC(18,2) DEFAULT 0,
      wholesale_price NUMERIC(18,2) DEFAULT 0,
      min_price NUMERIC(18,2) DEFAULT 0,
      track_by_serial BOOLEAN DEFAULT FALSE,
      quantity INTEGER DEFAULT 0,
      min_quantity INTEGER DEFAULT 0,
      unit VARCHAR(50) DEFAULT 'piece',
      warranty_months INTEGER DEFAULT 0,
      is_active BOOLEAN DEFAULT TRUE,
      is_deleted BOOLEAN DEFAULT FALSE,
      deleted_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      created_by UUID
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS warehouses (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      code VARCHAR(50),
      name VARCHAR(200) NOT NULL,
      type VARCHAR(50) DEFAULT 'main',
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS inventory_movements (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      product_id UUID REFERENCES products(id),
      warehouse_id UUID REFERENCES warehouses(id),
      type VARCHAR(50),
      movement_type VARCHAR(50),
      quantity INTEGER DEFAULT 0,
      before_quantity INTEGER DEFAULT 0,
      after_quantity INTEGER DEFAULT 0,
      reason TEXT,
      notes TEXT,
      created_by UUID,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS customers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      code VARCHAR(50),
      name VARCHAR(255) NOT NULL,
      type VARCHAR(50) DEFAULT 'retail',
      phone VARCHAR(50),
      phone2 VARCHAR(50),
      email VARCHAR(255),
      addresses TEXT,
      balance NUMERIC(18,2) DEFAULT 0,
      credit_limit NUMERIC(18,2) DEFAULT 0,
      loyalty_level VARCHAR(50) DEFAULT 'bronze',
      notes TEXT,
      is_active BOOLEAN DEFAULT TRUE,
      is_blocked BOOLEAN DEFAULT FALSE,
      blocked_reason TEXT,
      is_deleted BOOLEAN DEFAULT FALSE,
      deleted_at TIMESTAMPTZ,
      last_purchase_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      created_by UUID
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS suppliers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      code VARCHAR(50),
      name VARCHAR(255) NOT NULL,
      name_ar VARCHAR(255),
      type VARCHAR(50) DEFAULT 'company',
      contact_person VARCHAR(200),
      phone VARCHAR(50),
      phone2 VARCHAR(50),
      email VARCHAR(255),
      website VARCHAR(255),
      address TEXT,
      city VARCHAR(100),
      country VARCHAR(100),
      notes TEXT,
      rating NUMERIC(5,2) DEFAULT 0,
      total_purchases NUMERIC(18,2) DEFAULT 0,
      balance NUMERIC(18,2) DEFAULT 0,
      pending_returns INTEGER DEFAULT 0,
      is_active BOOLEAN DEFAULT TRUE,
      is_deleted BOOLEAN DEFAULT FALSE,
      deleted_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS invoices (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      invoice_number VARCHAR(100),
      type VARCHAR(50) DEFAULT 'sale',
      payment_type VARCHAR(50),
      status VARCHAR(50) DEFAULT 'draft',
      payment_status VARCHAR(50) DEFAULT 'pending',
      customer_id UUID REFERENCES customers(id),
      supplier_id UUID REFERENCES suppliers(id),
      subtotal NUMERIC(18,2) DEFAULT 0,
      discount_amount NUMERIC(18,2) DEFAULT 0,
      tax_amount NUMERIC(18,2) DEFAULT 0,
      total NUMERIC(18,2) DEFAULT 0,
      paid_amount NUMERIC(18,2) DEFAULT 0,
      remaining_amount NUMERIC(18,2) DEFAULT 0,
      payment_method VARCHAR(50),
      notes TEXT,
      discount_percent NUMERIC(5,2) DEFAULT 0,
      shipping_cost NUMERIC(18,2) DEFAULT 0,
      due_date TIMESTAMPTZ,
      created_by UUID,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      is_deleted BOOLEAN DEFAULT FALSE,
      deleted_at TIMESTAMPTZ,
      cancelled_at TIMESTAMPTZ,
      cancelled_reason TEXT
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS invoice_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
      product_id UUID REFERENCES products(id),
      product_name VARCHAR(255),
      serial_number VARCHAR(100),
      quantity INTEGER DEFAULT 1,
      unit_price NUMERIC(18,2) DEFAULT 0,
      cost_price NUMERIC(18,2) DEFAULT 0,
      discount NUMERIC(18,2) DEFAULT 0,
      total NUMERIC(18,2) DEFAULT 0,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS invoice_payments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
      amount NUMERIC(18,2) DEFAULT 0,
      payment_method VARCHAR(50),
      notes TEXT,
      received_by UUID,
      received_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS returns (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      return_number VARCHAR(100),
      type VARCHAR(50),
      original_invoice_id UUID REFERENCES invoices(id),
      customer_id UUID REFERENCES customers(id),
      supplier_id UUID REFERENCES suppliers(id),
      status VARCHAR(50) DEFAULT 'pending',
      reason_details TEXT,
      notes TEXT,
      created_by UUID,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS return_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      return_id UUID NOT NULL REFERENCES returns(id) ON DELETE CASCADE,
      product_id UUID REFERENCES products(id),
      quantity INTEGER DEFAULT 1,
      unit_price NUMERIC(18,2) DEFAULT 0,
      notes TEXT
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS vouchers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      voucher_number VARCHAR(100),
      type VARCHAR(50) DEFAULT 'receipt',
      amount NUMERIC(18,2) DEFAULT 0,
      currency VARCHAR(10) DEFAULT 'IQD',
      customer_id UUID REFERENCES customers(id),
      supplier_id UUID REFERENCES suppliers(id),
      notes TEXT,
      created_by UUID,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS warranty_claims (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      claim_number VARCHAR(100),
      product_id UUID REFERENCES products(id),
      customer_id UUID REFERENCES customers(id),
      status VARCHAR(50) DEFAULT 'pending',
      description TEXT,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id)`);
}

async function down(pool) {
  await pool.query('DROP TABLE IF EXISTS warranty_claims');
  await pool.query('DROP TABLE IF EXISTS vouchers');
  await pool.query('DROP TABLE IF EXISTS return_items');
  await pool.query('DROP TABLE IF EXISTS returns');
  await pool.query('DROP TABLE IF EXISTS invoice_payments');
  await pool.query('DROP TABLE IF EXISTS invoice_items');
  await pool.query('DROP TABLE IF EXISTS invoices');
  await pool.query('DROP TABLE IF EXISTS inventory_movements');
  await pool.query('DROP TABLE IF EXISTS suppliers');
  await pool.query('DROP TABLE IF EXISTS customers');
  await pool.query('DROP TABLE IF EXISTS products');
  await pool.query('DROP TABLE IF EXISTS warehouses');
  await pool.query('DROP TABLE IF EXISTS categories');
}

module.exports = { up, down };

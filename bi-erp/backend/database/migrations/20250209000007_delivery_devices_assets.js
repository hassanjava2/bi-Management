/**
 * Delivery, serial numbers, devices, fixed assets, bot logs, employee skills, shareholders, approvals, etc.
 */

async function up(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS deliveries (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tracking_number VARCHAR(100),
      invoice_id UUID,
      customer_id UUID,
      address TEXT,
      notes TEXT,
      scheduled_date TIMESTAMPTZ,
      status VARCHAR(50) DEFAULT 'pending',
      status_notes TEXT,
      driver_id UUID,
      created_by UUID,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS devices (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      serial_number VARCHAR(100),
      product_id UUID,
      product_name VARCHAR(255),
      brand VARCHAR(100),
      model VARCHAR(100),
      actual_specs TEXT,
      selling_price NUMERIC(18,2) DEFAULT 0,
      purchase_cost NUMERIC(18,2) DEFAULT 0,
      status VARCHAR(50) DEFAULT 'new',
      warehouse_id UUID,
      location_area VARCHAR(100),
      location_shelf VARCHAR(100),
      location_row VARCHAR(100),
      supplier_id UUID,
      customer_id UUID,
      custody_user_id UUID,
      custody_since TIMESTAMPTZ,
      custody_reason TEXT,
      notes TEXT,
      is_deleted BOOLEAN DEFAULT FALSE,
      deleted_at TIMESTAMPTZ,
      created_by UUID,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS device_history (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      device_id UUID,
      event_type VARCHAR(100),
      event_details TEXT,
      old_values TEXT,
      new_values TEXT,
      performed_by UUID,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS serial_numbers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      serial_number VARCHAR(200),
      product_id UUID,
      purchase_cost NUMERIC(18,2) DEFAULT 0,
      supplier_id UUID,
      status VARCHAR(50) DEFAULT 'available',
      warehouse_id UUID,
      is_deleted BOOLEAN DEFAULT FALSE,
      deleted_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      created_by UUID
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS fixed_assets (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      code VARCHAR(100),
      name VARCHAR(255) NOT NULL,
      category VARCHAR(100),
      purchase_invoice_id UUID,
      cost NUMERIC(18,2) DEFAULT 0,
      is_expense_tracked BOOLEAN DEFAULT FALSE,
      assigned_employee_id UUID,
      assigned_at TIMESTAMPTZ,
      custody_status VARCHAR(50),
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS fixed_asset_expense_types (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(200) NOT NULL
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS fixed_asset_expenses (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      asset_id UUID REFERENCES fixed_assets(id),
      type_id UUID,
      amount NUMERIC(18,2) DEFAULT 0,
      expense_date DATE,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS shareholders (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      code VARCHAR(50),
      name VARCHAR(255) NOT NULL,
      phone VARCHAR(50),
      share_percentage NUMERIC(8,4) DEFAULT 0,
      share_value NUMERIC(18,2) DEFAULT 0,
      monthly_profit NUMERIC(18,2) DEFAULT 0,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS share_distributions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      period VARCHAR(50),
      total_profit NUMERIC(18,2) DEFAULT 0,
      distributed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      distributed_by UUID,
      notes TEXT
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS share_distribution_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      distribution_id UUID,
      shareholder_id UUID,
      percentage NUMERIC(8,4) DEFAULT 0,
      amount NUMERIC(18,2) DEFAULT 0
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS approvals (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      approval_number VARCHAR(100),
      type VARCHAR(100),
      entity_type VARCHAR(100),
      entity_id UUID,
      requested_by UUID,
      requester_name VARCHAR(200),
      request_reason TEXT,
      request_data TEXT,
      status VARCHAR(50) DEFAULT 'pending',
      priority VARCHAR(50) DEFAULT 'normal',
      expires_at TIMESTAMPTZ,
      decided_by UUID,
      decision_reason TEXT,
      decided_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS employee_skills (
      user_id UUID PRIMARY KEY,
      inspection INTEGER DEFAULT 50,
      preparation INTEGER DEFAULT 50,
      sales INTEGER DEFAULT 50,
      delivery INTEGER DEFAULT 50,
      cleaning INTEGER DEFAULT 50,
      maintenance INTEGER DEFAULT 50,
      accounting INTEGER DEFAULT 50,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ai_distribution_approvals (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      task_title TEXT,
      task_title_ar TEXT,
      task_def TEXT,
      suggested_user_id UUID,
      suggested_score NUMERIC,
      status VARCHAR(50) DEFAULT 'pending',
      approved_by UUID,
      created_task_id UUID,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ai_distribution_log (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      task_id UUID,
      assigned_to UUID,
      method VARCHAR(50),
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS bot_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      action VARCHAR(200),
      data TEXT,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS bot_suggestions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      type VARCHAR(100),
      component VARCHAR(200),
      suggestion TEXT NOT NULL,
      priority VARCHAR(50) DEFAULT 'medium',
      status VARCHAR(50) DEFAULT 'pending',
      applied_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS vacations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL,
      type VARCHAR(50) DEFAULT 'annual',
      start_date DATE,
      end_date DATE,
      reason TEXT,
      status VARCHAR(50) DEFAULT 'pending',
      approved_by UUID,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS invoice_workflow_log (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      invoice_id UUID NOT NULL,
      event VARCHAR(100),
      user_id UUID,
      role VARCHAR(50),
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS pending_invoice_reminders (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      invoice_id UUID NOT NULL,
      remind_at TIMESTAMPTZ,
      remind_count INTEGER DEFAULT 0,
      notify_creator BOOLEAN DEFAULT TRUE,
      notify_supervisor BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS alert_rules (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      code VARCHAR(100),
      name VARCHAR(200),
      description TEXT,
      is_enabled BOOLEAN DEFAULT TRUE,
      threshold TEXT,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

async function down(pool) {
  const tables = [
    'alert_rules', 'pending_invoice_reminders', 'invoice_workflow_log', 'vacations',
    'bot_suggestions', 'bot_logs', 'ai_distribution_log', 'ai_distribution_approvals',
    'employee_skills', 'approvals', 'share_distribution_items', 'share_distributions',
    'shareholders', 'fixed_asset_expenses', 'fixed_asset_expense_types', 'fixed_assets',
    'serial_numbers', 'device_history', 'devices', 'deliveries'
  ];
  for (const t of tables) {
    await pool.query(`DROP TABLE IF EXISTS ${t}`);
  }
}

module.exports = { up, down };

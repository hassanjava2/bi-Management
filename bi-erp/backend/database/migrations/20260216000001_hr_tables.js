/**
 * HR Enhancement: leaves, salary_advances, payroll, work_schedules
 * + new user columns for employee data
 */

async function up(pool) {
    // ── Leaves ──
    await pool.query(`
    CREATE TABLE IF NOT EXISTS leaves (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      leave_type VARCHAR(30) NOT NULL DEFAULT 'annual',
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      days INTEGER NOT NULL DEFAULT 1,
      reason TEXT,
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      approved_by UUID REFERENCES users(id),
      approved_at TIMESTAMPTZ,
      rejection_reason TEXT,
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_by UUID
    )
  `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_leaves_user ON leaves(user_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_leaves_status ON leaves(status)`);

    // ── Salary Advances ──
    await pool.query(`
    CREATE TABLE IF NOT EXISTS salary_advances (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      amount DECIMAL(15,2) NOT NULL,
      reason TEXT,
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      approved_by UUID REFERENCES users(id),
      approved_at TIMESTAMPTZ,
      deduction_months INTEGER DEFAULT 1,
      monthly_deduction DECIMAL(15,2),
      remaining_amount DECIMAL(15,2),
      paid_date DATE,
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_by UUID
    )
  `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_advances_user ON salary_advances(user_id)`);

    // ── Payroll ──
    await pool.query(`
    CREATE TABLE IF NOT EXISTS payroll (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      period VARCHAR(20) NOT NULL,
      base_salary DECIMAL(15,2) NOT NULL DEFAULT 0,
      bonuses DECIMAL(15,2) DEFAULT 0,
      deductions DECIMAL(15,2) DEFAULT 0,
      advance_deduction DECIMAL(15,2) DEFAULT 0,
      overtime_amount DECIMAL(15,2) DEFAULT 0,
      net_salary DECIMAL(15,2) NOT NULL DEFAULT 0,
      status VARCHAR(20) NOT NULL DEFAULT 'draft',
      paid_date DATE,
      payment_method VARCHAR(30),
      notes TEXT,
      working_days INTEGER DEFAULT 0,
      absent_days INTEGER DEFAULT 0,
      late_days INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_by UUID
    )
  `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_payroll_user ON payroll(user_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_payroll_period ON payroll(period)`);
    await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_payroll_user_period ON payroll(user_id, period)`);

    // ── Work Schedules ──
    await pool.query(`
    CREATE TABLE IF NOT EXISTS work_schedules (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(100) NOT NULL,
      name_en VARCHAR(100),
      start_time TIME NOT NULL DEFAULT '08:00',
      end_time TIME NOT NULL DEFAULT '17:00',
      break_minutes INTEGER DEFAULT 60,
      working_days VARCHAR(30) DEFAULT '0,1,2,3,4',
      is_default BOOLEAN DEFAULT FALSE,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

    // ── New user columns ──
    const addCol = async (col, type) => {
        try { await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS ${col} ${type}`); } catch (_) { }
    };
    await addCol('employment_type', "VARCHAR(30) DEFAULT 'full_time'");
    await addCol('salary', 'DECIMAL(15,2)');
    await addCol('salary_currency', "VARCHAR(10) DEFAULT 'IQD'");
    await addCol('national_id', 'VARCHAR(30)');
    await addCol('address', 'TEXT');
    await addCol('emergency_contact', 'VARCHAR(100)');
    await addCol('birth_date', 'DATE');
    await addCol('gender', 'VARCHAR(10)');
    await addCol('work_schedule_id', 'UUID REFERENCES work_schedules(id)');
    await addCol('notes', 'TEXT');

    // ── Insert default work schedule ──
    await pool.query(`
    INSERT INTO work_schedules (name, name_en, start_time, end_time, break_minutes, working_days, is_default)
    SELECT 'الدوام الرسمي', 'Official Schedule', '08:00', '17:00', 60, '0,1,2,3,4', TRUE
    WHERE NOT EXISTS (SELECT 1 FROM work_schedules WHERE is_default = TRUE)
  `);

    // ── Enhance positions table ──
    await addCol('description', 'TEXT');
    // Note: positions table already exists, just ensure it has enough columns
    try { await pool.query(`ALTER TABLE positions ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(id)`); } catch (_) { }
    try { await pool.query(`ALTER TABLE positions ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE`); } catch (_) { }
}

async function down(pool) {
    await pool.query('DROP TABLE IF EXISTS payroll');
    await pool.query('DROP TABLE IF EXISTS salary_advances');
    await pool.query('DROP TABLE IF EXISTS leaves');
    await pool.query('DROP TABLE IF EXISTS work_schedules');
}

module.exports = { up, down };

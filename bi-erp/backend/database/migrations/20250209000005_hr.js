/**
 * HR: attendance, tasks, task_comments, point_transactions, notifications
 */

async function up(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS attendance (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      date DATE NOT NULL,
      check_in TIMESTAMPTZ,
      check_out TIMESTAMPTZ,
      check_in_location TEXT,
      check_out_location TEXT,
      check_in_method VARCHAR(50) DEFAULT 'manual',
      check_out_method VARCHAR(50),
      status VARCHAR(50) DEFAULT 'present',
      late_minutes INTEGER DEFAULT 0,
      work_minutes INTEGER DEFAULT 0,
      overtime_minutes INTEGER DEFAULT 0,
      notes TEXT,
      approved_by UUID,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, date)
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tasks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title VARCHAR(500) NOT NULL,
      description TEXT,
      assigned_to UUID REFERENCES users(id),
      assigned_by UUID REFERENCES users(id),
      department_id UUID REFERENCES departments(id),
      priority VARCHAR(50) DEFAULT 'medium',
      status VARCHAR(50) DEFAULT 'pending',
      category VARCHAR(100),
      source VARCHAR(50),
      source_reference TEXT,
      due_date TIMESTAMPTZ,
      estimated_minutes INTEGER,
      actual_minutes INTEGER,
      started_at TIMESTAMPTZ,
      completed_at TIMESTAMPTZ,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS task_comments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      user_id UUID REFERENCES users(id),
      comment TEXT,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS point_transactions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      points INTEGER DEFAULT 0,
      reason VARCHAR(200),
      description TEXT,
      admin_note TEXT,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      recipient_id UUID NOT NULL,
      recipient_type VARCHAR(50) DEFAULT 'user',
      type VARCHAR(50) DEFAULT 'info',
      priority VARCHAR(50) DEFAULT 'normal',
      title VARCHAR(255),
      message TEXT,
      entity_type VARCHAR(100),
      entity_id UUID,
      action_url TEXT,
      data TEXT,
      is_read BOOLEAN DEFAULT FALSE,
      read_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_attendance_user_date ON attendance(user_id, date)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_point_transactions_user ON point_transactions(user_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id)`);
}

async function down(pool) {
  await pool.query('DROP TABLE IF EXISTS notifications');
  await pool.query('DROP TABLE IF EXISTS point_transactions');
  await pool.query('DROP TABLE IF EXISTS task_comments');
  await pool.query('DROP TABLE IF EXISTS tasks');
  await pool.query('DROP TABLE IF EXISTS attendance');
}

module.exports = { up, down };

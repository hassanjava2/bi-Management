/**
 * AI conversations and camera-related tables (optional)
 */

async function up(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ai_conversations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      message TEXT NOT NULL,
      response TEXT,
      conversation_id VARCHAR(255),
      blocked BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_ai_conversations_user ON ai_conversations(user_id)`);
}

async function down(pool) {
  await pool.query('DROP TABLE IF EXISTS ai_conversations');
}

module.exports = { up, down };

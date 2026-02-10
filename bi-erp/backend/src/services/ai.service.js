/**
 * BI ERP - AI Service (chat with optional external engine)
 */
const { run, get, all } = require('../config/database');
const { generateId } = require('../utils/helpers');

const AI_ENGINE_URL = process.env.AI_ENGINE_URL || '';

async function chat(userId, message, userInfo = {}, conversationId = null) {
  const convId = conversationId || generateId();
  let response = '';
  let suggestions = [];

  if (AI_ENGINE_URL) {
    try {
      const userInfoEncoded = Buffer.from(JSON.stringify(userInfo)).toString('base64');
      const res = await fetch(`${AI_ENGINE_URL}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-Info': userInfoEncoded },
        body: JSON.stringify({ user_id: userId, message, conversation_id: convId, user_info: userInfo }),
      });
      if (res.ok) {
        const data = await res.json();
        response = data.response || '';
        suggestions = data.suggestions || [];
        await run(
          'INSERT INTO ai_conversations (id, user_id, message, response, conversation_id) VALUES (?, ?, ?, ?, ?)',
          [generateId(), userId, message, response, convId]
        );
        return { response, conversation_id: convId, suggestions, blocked: false };
      }
    } catch (e) {
      console.warn('[AI] Engine error:', e.message);
    }
  }

  response = 'مرحباً. خدمة الذكاء الاصطناعي يمكن ربطها عبر AI_ENGINE_URL. جرب لاحقاً أو راجع الإعدادات.';
  suggestions = ['إعداد محرك AI', 'المحاولة لاحقاً'];
  try {
    await run(
      'INSERT INTO ai_conversations (id, user_id, message, response, conversation_id) VALUES (?, ?, ?, ?, ?)',
      [generateId(), userId, message, response, convId]
    );
  } catch (_) {}
  return { response, conversation_id: convId, suggestions, blocked: false };
}

module.exports = { chat };

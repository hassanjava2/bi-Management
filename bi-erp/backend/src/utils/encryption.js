/**
 * BI ERP - Simple encryption/hash for token storage (no sensitive secrets)
 */

const crypto = require('crypto');

const ALGO = 'sha256';
const ENCODING = 'hex';

function hashToken(token) {
  return crypto.createHash(ALGO).update(token).digest(ENCODING);
}

/** Optional: simple encrypt/decrypt for salary etc. - use env ENCRYPTION_KEY */
function encrypt(text) {
  if (!text) return null;
  const key = process.env.ENCRYPTION_KEY || 'dev-key-32-bytes-long-enough!!';
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key.slice(0, 32).padEnd(32)), iv);
  let enc = cipher.update(String(text), 'utf8', 'hex');
  enc += cipher.final('hex');
  return iv.toString('hex') + ':' + enc;
}

function decrypt(encrypted) {
  if (!encrypted) return null;
  try {
    const key = process.env.ENCRYPTION_KEY || 'dev-key-32-bytes-long-enough!!';
    const [ivHex, enc] = encrypted.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key.slice(0, 32).padEnd(32)), iv);
    let dec = decipher.update(enc, 'hex', 'utf8');
    dec += decipher.final('utf8');
    return dec;
  } catch {
    return null;
  }
}

module.exports = { hashToken, encrypt, decrypt };

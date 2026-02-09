/**
 * BI Management - Encryption Utilities
 * أدوات التشفير AES-256-GCM (أكثر أماناً)
 */

const crypto = require('crypto');

// التحقق من وجود مفتاح التشفير في الإنتاج
const MASTER_KEY = process.env.MASTER_ENCRYPTION_KEY;
if (!MASTER_KEY && process.env.NODE_ENV === 'production') {
    console.error('CRITICAL: MASTER_ENCRYPTION_KEY environment variable is required in production!');
    process.exit(1);
}

// مفتاح مؤقت للتطوير فقط (32 bytes for AES-256)
const DEV_KEY = crypto.scryptSync('dev-encryption-key', 'salt', 32);
const ENCRYPTION_KEY = MASTER_KEY ? Buffer.from(MASTER_KEY, 'hex') : DEV_KEY;

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

/**
 * Encrypt text using AES-256-GCM
 */
function encrypt(plaintext) {
    if (!plaintext) return null;
    try {
        const iv = crypto.randomBytes(IV_LENGTH);
        const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
        
        let encrypted = cipher.update(plaintext.toString(), 'utf8', 'hex');
        encrypted += cipher.final('hex');
        
        const tag = cipher.getAuthTag();
        
        // IV + Tag + Encrypted data
        return iv.toString('hex') + tag.toString('hex') + encrypted;
    } catch (error) {
        console.error('Encryption error:', error.message);
        return null;
    }
}

/**
 * Decrypt text
 */
function decrypt(ciphertext) {
    if (!ciphertext) return null;
    try {
        // Extract IV, Tag, and encrypted data
        const iv = Buffer.from(ciphertext.slice(0, IV_LENGTH * 2), 'hex');
        const tag = Buffer.from(ciphertext.slice(IV_LENGTH * 2, (IV_LENGTH + TAG_LENGTH) * 2), 'hex');
        const encrypted = ciphertext.slice((IV_LENGTH + TAG_LENGTH) * 2);
        
        const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
        decipher.setAuthTag(tag);
        
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        return decrypted || null;
    } catch (error) {
        console.error('Decryption error:', error.message);
        return null;
    }
}

/**
 * Hash sensitive data (one-way) using SHA-256
 */
function hash(text) {
    if (!text) return null;
    return crypto.createHash('sha256').update(text.toString()).digest('hex');
}

/**
 * Generate secure random token
 */
function generateSecureToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
}

module.exports = {
    encrypt,
    decrypt,
    hash,
    generateSecureToken
};

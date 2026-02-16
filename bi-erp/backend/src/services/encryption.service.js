/**
 * BI Management - Encryption Service
 * خدمة التشفير للبيانات الحساسة
 */

const crypto = require('crypto');
const logger = require('../utils/logger');

class EncryptionService {
    constructor() {
        // Master Key من environment (32 bytes = 256 bits)
        this.masterKey = this._getKey();
        this.algorithm = 'aes-256-gcm';
    }

    /**
     * الحصول على مفتاح التشفير
     */
    _getKey() {
        const key = process.env.MASTER_ENCRYPTION_KEY;

        if (!key) {
            // توليد مفتاح مؤقت للتطوير (غير آمن للإنتاج!)
            logger.warn('[!] WARNING: Using auto-generated encryption key. Set MASTER_ENCRYPTION_KEY in .env for production!');
            return crypto.scryptSync('bi-management-default-key', 'salt', 32);
        }

        // إذا كان المفتاح hex string
        if (key.length === 64) {
            return Buffer.from(key, 'hex');
        }

        // إذا كان المفتاح نص عادي، نشتق منه مفتاح
        return crypto.scryptSync(key, 'bi-management-salt', 32);
    }

    /**
     * تشفير نص
     * @param {string} plaintext - النص المراد تشفيره
     * @returns {object} - كائن يحتوي على البيانات المشفرة
     */
    encrypt(plaintext) {
        if (!plaintext) return null;

        try {
            const iv = crypto.randomBytes(16);
            const cipher = crypto.createCipheriv(this.algorithm, this.masterKey, iv);

            let encrypted = cipher.update(String(plaintext), 'utf8', 'hex');
            encrypted += cipher.final('hex');

            const authTag = cipher.getAuthTag();

            return {
                v: 1, // version
                iv: iv.toString('hex'),
                data: encrypted,
                tag: authTag.toString('hex')
            };
        } catch (error) {
            logger.error('[Encryption] Encrypt error:', error.message);
            throw new Error('فشل في التشفير');
        }
    }

    /**
     * فك التشفير
     * @param {object} encryptedObj - الكائن المشفر
     * @returns {string} - النص الأصلي
     */
    decrypt(encryptedObj) {
        if (!encryptedObj) return null;

        try {
            const decipher = crypto.createDecipheriv(
                this.algorithm,
                this.masterKey,
                Buffer.from(encryptedObj.iv, 'hex')
            );

            decipher.setAuthTag(Buffer.from(encryptedObj.tag, 'hex'));

            let decrypted = decipher.update(encryptedObj.data, 'hex', 'utf8');
            decrypted += decipher.final('utf8');

            return decrypted;
        } catch (error) {
            logger.error('[Encryption] Decrypt error:', error.message);
            throw new Error('فشل في فك التشفير');
        }
    }

    /**
     * تشفير حقل لحفظه في Database
     * @param {any} value - القيمة المراد تشفيرها
     * @returns {string} - JSON string للحفظ
     */
    encryptField(value) {
        if (value === null || value === undefined) return null;

        const encrypted = this.encrypt(String(value));
        return JSON.stringify(encrypted);
    }

    /**
     * فك تشفير حقل من Database
     * @param {string} encryptedValue - القيمة المشفرة (JSON string)
     * @returns {string} - القيمة الأصلية
     */
    decryptField(encryptedValue) {
        if (!encryptedValue) return null;

        try {
            // فحص إذا كانت القيمة مشفرة أصلاً
            if (typeof encryptedValue === 'string' && encryptedValue.startsWith('{')) {
                const obj = JSON.parse(encryptedValue);
                if (obj.v && obj.iv && obj.data && obj.tag) {
                    return this.decrypt(obj);
                }
            }
            // إذا لم تكن مشفرة، أرجعها كما هي
            return encryptedValue;
        } catch (error) {
            // إذا فشل، قد تكون غير مشفرة
            return encryptedValue;
        }
    }

    /**
     * تشفير كائن كامل
     * @param {object} obj - الكائن المراد تشفيره
     * @param {array} fields - الحقول المراد تشفيرها
     * @returns {object} - الكائن مع الحقول المشفرة
     */
    encryptObject(obj, fields) {
        const result = { ...obj };

        for (const field of fields) {
            if (result[field] !== undefined && result[field] !== null) {
                result[field] = this.encryptField(result[field]);
            }
        }

        return result;
    }

    /**
     * فك تشفير كائن كامل
     * @param {object} obj - الكائن المشفر
     * @param {array} fields - الحقول المراد فك تشفيرها
     * @returns {object} - الكائن مع الحقول مفكوكة
     */
    decryptObject(obj, fields) {
        const result = { ...obj };

        for (const field of fields) {
            if (result[field]) {
                result[field] = this.decryptField(result[field]);
            }
        }

        return result;
    }

    /**
     * Hash لكلمة المرور (one-way)
     * @param {string} password - كلمة المرور
     * @returns {string} - الـ hash
     */
    hashPassword(password) {
        const bcrypt = require('bcryptjs');
        return bcrypt.hashSync(password, 12);
    }

    /**
     * التحقق من كلمة المرور
     * @param {string} password - كلمة المرور المدخلة
     * @param {string} hash - الـ hash المحفوظ
     * @returns {boolean}
     */
    verifyPassword(password, hash) {
        const bcrypt = require('bcryptjs');
        const logger = require('../utils/logger');
        return bcrypt.compareSync(password, hash);
    }

    /**
     * توليد مفتاح عشوائي
     * @param {number} bytes - عدد البايتات
     * @returns {string} - المفتاح بصيغة hex
     */
    generateKey(bytes = 32) {
        return crypto.randomBytes(bytes).toString('hex');
    }

    /**
     * توليد Token عشوائي
     * @param {number} length - طول الـ token
     * @returns {string}
     */
    generateToken(length = 32) {
        return crypto.randomBytes(length).toString('base64url');
    }

    /**
     * Hash سريع (للمقارنة)
     * @param {string} data - البيانات
     * @returns {string}
     */
    hash(data) {
        return crypto.createHash('sha256').update(data).digest('hex');
    }

    /**
     * HMAC للتوقيع
     * @param {string} data - البيانات
     * @param {string} secret - المفتاح السري
     * @returns {string}
     */
    hmac(data, secret = null) {
        const key = secret || this.masterKey;
        return crypto.createHmac('sha256', key).update(data).digest('hex');
    }

    /**
     * التحقق من HMAC
     * @param {string} data - البيانات
     * @param {string} signature - التوقيع
     * @param {string} secret - المفتاح السري
     * @returns {boolean}
     */
    verifyHmac(data, signature, secret = null) {
        const expected = this.hmac(data, secret);
        return crypto.timingSafeEqual(
            Buffer.from(signature, 'hex'),
            Buffer.from(expected, 'hex')
        );
    }
}

// Singleton
const encryptionService = new EncryptionService();

// الحقول الحساسة التي يجب تشفيرها
const SENSITIVE_FIELDS = {
    users: ['salary', 'bank_account', 'national_id'],
    payroll: ['basic_salary', 'allowances', 'deductions', 'net_salary', 'bank_account'],
    employees: ['salary', 'bank_info']
};

module.exports = {
    EncryptionService,
    encryptionService,
    SENSITIVE_FIELDS
};

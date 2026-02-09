/**
 * Bi Management - Audit Middleware
 * وسيط تسجيل العمليات
 */

const { auditService } = require('../services/audit.service');

/**
 * Middleware لتسجيل العمليات تلقائياً
 */
function auditMiddleware(action, tableName) {
    return async (req, res, next) => {
        // حفظ الوقت الأصلي
        const startTime = Date.now();
        
        // حفظ الـ send الأصلي
        const originalSend = res.send;
        
        res.send = function(data) {
            res.send = originalSend;
            
            // تسجيل العملية بعد الاستجابة
            const duration = Date.now() - startTime;
            
            try {
                const logData = {
                    user_id: req.user?.id,
                    action,
                    table_name: tableName,
                    record_id: req.params?.id || null,
                    old_values: req.oldRecord ? JSON.stringify(req.oldRecord) : null,
                    new_values: req.body ? JSON.stringify(req.body) : null,
                    ip_address: req.ip || req.connection?.remoteAddress,
                    user_agent: req.headers['user-agent'],
                    duration_ms: duration,
                    status_code: res.statusCode
                };
                
                // تسجيل بشكل غير متزامن (لا ننتظره)
                auditService.log(logData).catch(err => {
                    console.error('[Audit] Failed to log:', err.message);
                });
            } catch (err) {
                console.error('[Audit] Error in middleware:', err.message);
            }
            
            return res.send(data);
        };
        
        next();
    };
}

/**
 * تحميل السجل القديم قبل التحديث
 */
function loadOldRecord(tableName, idField = 'id') {
    return async (req, res, next) => {
        try {
            if (req.params[idField]) {
                const db = require('../config/database').getDb();
                const query = `SELECT * FROM ${tableName} WHERE id = ?`;
                const result = db.exec(query, [req.params[idField]]);
                
                if (result.length > 0 && result[0].values.length > 0) {
                    const columns = result[0].columns;
                    const values = result[0].values[0];
                    req.oldRecord = {};
                    columns.forEach((col, i) => {
                        req.oldRecord[col] = values[i];
                    });
                }
            }
        } catch (err) {
            console.error('[Audit] Failed to load old record:', err.message);
        }
        next();
    };
}

/**
 * تسجيل الوصول للبيانات الحساسة
 */
function auditSensitiveAccess(dataType) {
    return async (req, res, next) => {
        try {
            await auditService.log({
                user_id: req.user?.id,
                action: 'VIEW_SENSITIVE',
                table_name: dataType,
                record_id: req.params?.id || null,
                ip_address: req.ip || req.connection?.remoteAddress,
                user_agent: req.headers['user-agent'],
                details: JSON.stringify({
                    path: req.path,
                    method: req.method,
                    query: req.query
                })
            });
        } catch (err) {
            console.error('[Audit] Failed to log sensitive access:', err.message);
        }
        next();
    };
}

/**
 * تسجيل محاولات تسجيل الدخول
 */
function auditLogin(success) {
    return async (req, res, next) => {
        // يتم استدعاؤه بعد محاولة تسجيل الدخول
        const originalSend = res.send;
        
        res.send = function(data) {
            res.send = originalSend;
            
            try {
                const logData = {
                    user_id: req.user?.id || null,
                    action: success ? 'LOGIN_SUCCESS' : 'LOGIN_FAILED',
                    table_name: 'auth',
                    ip_address: req.ip || req.connection?.remoteAddress,
                    user_agent: req.headers['user-agent'],
                    details: JSON.stringify({
                        email: req.body?.email,
                        success: res.statusCode < 400
                    })
                };
                
                auditService.log(logData).catch(err => {
                    console.error('[Audit] Failed to log login:', err.message);
                });
            } catch (err) {
                console.error('[Audit] Error logging login:', err.message);
            }
            
            return res.send(data);
        };
        
        next();
    };
}

module.exports = {
    auditMiddleware,
    loadOldRecord,
    auditSensitiveAccess,
    auditLogin
};

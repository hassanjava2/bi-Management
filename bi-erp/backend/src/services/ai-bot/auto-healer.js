/**
 * Auto Healer Module
 * اكتشاف وإصلاح الأخطاء تلقائياً
 */

const fs = require('fs');
const path = require('path');
const { run, get, all } = require('../../config/database');
const { generateId, now } = require('../../utils/helpers');

class AutoHealer {
    constructor(bot) {
        this.bot = bot;
        this.healingRules = this._initHealingRules();
    }
    
    /**
     * قواعد الإصلاح
     */
    _initHealingRules() {
        return [
            {
                name: 'missing_tables',
                check: () => this._checkMissingTables(),
                fix: (issues) => this._fixMissingTables(issues)
            },
            {
                name: 'orphan_records',
                check: () => this._checkOrphanRecords(),
                fix: (issues) => this._fixOrphanRecords(issues)
            },
            {
                name: 'invalid_status',
                check: () => this._checkInvalidStatuses(),
                fix: (issues) => this._fixInvalidStatuses(issues)
            },
            {
                name: 'duplicate_data',
                check: () => this._checkDuplicates(),
                fix: (issues) => this._fixDuplicates(issues)
            },
            {
                name: 'null_required_fields',
                check: () => this._checkNullRequiredFields(),
                fix: (issues) => this._fixNullRequiredFields(issues)
            },
            {
                name: 'stale_sessions',
                check: () => this._checkStaleSessions(),
                fix: (issues) => this._fixStaleSessions(issues)
            },
            {
                name: 'inconsistent_totals',
                check: () => this._checkInconsistentTotals(),
                fix: (issues) => this._fixInconsistentTotals(issues)
            }
        ];
    }
    
    /**
     * فحص وإصلاح
     */
    async checkAndHeal() {
        this.bot.log('🔧 Running auto-healer...');
        
        const results = {
            errorsFound: 0,
            errorsFixed: 0,
            fixes: []
        };
        
        for (const rule of this.healingRules) {
            try {
                const issues = await rule.check();
                
                if (issues && issues.length > 0) {
                    results.errorsFound += issues.length;
                    this.bot.log(`Found ${issues.length} issues in ${rule.name}`, 'warn');
                    
                    if (this.bot.config.autoFix) {
                        const fixed = await rule.fix(issues);
                        results.errorsFixed += fixed;
                        results.fixes.push({
                            rule: rule.name,
                            found: issues.length,
                            fixed
                        });
                        
                        // Log fix
                        this._logFix(rule.name, issues.length, fixed);
                    }
                }
            } catch (error) {
                this.bot.log(`Error in ${rule.name}: ${error.message}`, 'error');
            }
        }
        
        if (results.errorsFound === 0) {
            this.bot.log('✅ No issues found');
        } else {
            this.bot.log(`🔧 Fixed ${results.errorsFixed}/${results.errorsFound} issues`);
        }
        
        return results;
    }
    
    /**
     * فحص الجداول المفقودة
     */
    async _checkMissingTables() {
        const requiredTables = [
            'users', 'roles', 'permissions', 'products', 'categories',
            'customers', 'suppliers', 'invoices', 'invoice_items',
            'inventory', 'serial_numbers', 'tasks', 'notifications',
            'attendance', 'audit_logs', 'settings'
        ];
        
        const issues = [];
        
        for (const table of requiredTables) {
            const exists = await get(`
                SELECT table_name FROM information_schema.tables WHERE table_schema='public' 
                WHERE type='table' AND name=?
            `, [table]);
            
            if (!exists) {
                issues.push({ table, type: 'missing_table' });
            }
        }
        
        return issues;
    }
    
    /**
     * إصلاح الجداول المفقودة
     */
    async _fixMissingTables(issues) {
        let fixed = 0;
        
        for (const issue of issues) {
            try {
                // Create basic structure for missing tables
                const createStatements = {
                    'settings': `
                        CREATE TABLE IF NOT EXISTS settings (
                            key TEXT PRIMARY KEY,
                            value TEXT
                        )
                    `,
                    'categories': `
                        CREATE TABLE IF NOT EXISTS categories (
                            id TEXT PRIMARY KEY,
                            name TEXT NOT NULL,
                            parent_id TEXT,
                            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
                        )
                    `
                };
                
                if (createStatements[issue.table]) {
                    await run(createStatements[issue.table]);
                    fixed++;
                }
            } catch (error) {
                this.bot.log(`Could not create table ${issue.table}: ${error.message}`, 'error');
            }
        }
        
        return fixed;
    }
    
    /**
     * فحص السجلات اليتيمة
     */
    async _checkOrphanRecords() {
        const issues = [];
        
        try {
            // Invoice items without invoice
            const orphanItems = await all(`
                SELECT ii.id FROM invoice_items ii
                LEFT JOIN invoices i ON ii.invoice_id = i.id
                WHERE i.id IS NULL
            `);
            
            if (orphanItems?.length > 0) {
                issues.push({
                    type: 'orphan_invoice_items',
                    count: orphanItems.length,
                    ids: orphanItems.map(i => i.id)
                });
            }
            
            // Notifications for non-existent users
            const orphanNotifications = await all(`
                SELECT n.id FROM notifications n
                LEFT JOIN users u ON n.user_id = u.id
                WHERE u.id IS NULL AND n.user_id IS NOT NULL
            `);
            
            if (orphanNotifications?.length > 0) {
                issues.push({
                    type: 'orphan_notifications',
                    count: orphanNotifications.length,
                    ids: orphanNotifications.map(n => n.id)
                });
            }
        } catch (error) {
            // Tables might not exist
        }
        
        return issues;
    }
    
    /**
     * إصلاح السجلات اليتيمة
     */
    async _fixOrphanRecords(issues) {
        let fixed = 0;
        
        for (const issue of issues) {
            try {
                if (issue.type === 'orphan_invoice_items') {
                    await run(`
                        DELETE FROM invoice_items 
                        WHERE id IN (${issue.ids.map(() => '?').join(',')})
                    `, issue.ids);
                    fixed += issue.count;
                }
                
                if (issue.type === 'orphan_notifications') {
                    await run(`
                        DELETE FROM notifications 
                        WHERE id IN (${issue.ids.map(() => '?').join(',')})
                    `, issue.ids);
                    fixed += issue.count;
                }
            } catch (error) {
                this.bot.log(`Could not fix orphans: ${error.message}`, 'error');
            }
        }
        
        return fixed;
    }
    
    /**
     * فحص الحالات غير الصالحة
     */
    async _checkInvalidStatuses() {
        const issues = [];
        
        try {
            // Valid invoice statuses
            const validInvoiceStatuses = ['draft', 'pending', 'paid', 'partial', 'cancelled', 'refunded'];
            const invalidInvoices = await all(`
                SELECT id, status FROM invoices 
                WHERE status NOT IN (${validInvoiceStatuses.map(() => '?').join(',')})
            `, validInvoiceStatuses);
            
            if (invalidInvoices?.length > 0) {
                issues.push({
                    type: 'invalid_invoice_status',
                    records: invalidInvoices
                });
            }
            
            // Valid task statuses
            const validTaskStatuses = ['pending', 'in_progress', 'completed', 'cancelled', 'overdue'];
            const invalidTasks = await all(`
                SELECT id, status FROM tasks 
                WHERE status NOT IN (${validTaskStatuses.map(() => '?').join(',')})
            `, validTaskStatuses);
            
            if (invalidTasks?.length > 0) {
                issues.push({
                    type: 'invalid_task_status',
                    records: invalidTasks
                });
            }
        } catch (error) {
            // Tables might not exist
        }
        
        return issues;
    }
    
    /**
     * إصلاح الحالات غير الصالحة
     */
    async _fixInvalidStatuses(issues) {
        let fixed = 0;
        
        for (const issue of issues) {
            try {
                if (issue.type === 'invalid_invoice_status') {
                    for (const record of issue.records) {
                        await run(`UPDATE invoices SET status = 'draft' WHERE id = ?`, [record.id]);
                        fixed++;
                    }
                }
                
                if (issue.type === 'invalid_task_status') {
                    for (const record of issue.records) {
                        await run(`UPDATE tasks SET status = 'pending' WHERE id = ?`, [record.id]);
                        fixed++;
                    }
                }
            } catch (error) {
                this.bot.log(`Could not fix statuses: ${error.message}`, 'error');
            }
        }
        
        return fixed;
    }
    
    /**
     * فحص التكرارات
     */
    async _checkDuplicates() {
        const issues = [];
        
        try {
            // Duplicate emails
            const dupEmails = await all(`
                SELECT email, COUNT(*) as count 
                FROM users 
                WHERE email IS NOT NULL
                GROUP BY email 
                HAVING COUNT(*) > 1
            `);
            
            if (dupEmails?.length > 0) {
                issues.push({
                    type: 'duplicate_emails',
                    records: dupEmails
                });
            }
            
            // Duplicate invoice numbers
            const dupInvoices = await all(`
                SELECT invoice_number, COUNT(*) as count 
                FROM invoices 
                WHERE invoice_number IS NOT NULL
                GROUP BY invoice_number 
                HAVING COUNT(*) > 1
            `);
            
            if (dupInvoices?.length > 0) {
                issues.push({
                    type: 'duplicate_invoice_numbers',
                    records: dupInvoices
                });
            }
        } catch (error) {
            // Tables might not exist
        }
        
        return issues;
    }
    
    /**
     * إصلاح التكرارات
     */
    _fixDuplicates(issues) {
        let fixed = 0;
        // Keep the first, mark others - don't delete
        // This is reported but not auto-fixed as it needs manual review
        return fixed;
    }
    
    /**
     * فحص الحقول المطلوبة الفارغة
     */
    async _checkNullRequiredFields() {
        const issues = [];
        
        try {
            // Users without email
            const noEmail = await all(`SELECT id FROM users WHERE email IS NULL OR email = ''`);
            if (noEmail?.length > 0) {
                issues.push({ type: 'users_no_email', count: noEmail.length });
            }
            
            // Products without name
            const noName = await all(`SELECT id FROM products WHERE name IS NULL OR name = ''`);
            if (noName?.length > 0) {
                issues.push({ type: 'products_no_name', count: noName.length, ids: noName.map(p => p.id) });
            }
        } catch (error) {
            // Tables might not exist
        }
        
        return issues;
    }
    
    /**
     * إصلاح الحقول الفارغة
     */
    async _fixNullRequiredFields(issues) {
        let fixed = 0;
        
        for (const issue of issues) {
            try {
                if (issue.type === 'products_no_name') {
                    for (const id of issue.ids) {
                        await run(`UPDATE products SET name = ? WHERE id = ?`, [`Product-${id.substring(0, 8)}`, id]);
                        fixed++;
                    }
                }
            } catch (error) {
                this.bot.log(`Could not fix null fields: ${error.message}`, 'error');
            }
        }
        
        return fixed;
    }
    
    /**
     * فحص الجلسات القديمة
     */
    async _checkStaleSessions() {
        const issues = [];
        
        try {
            // Sessions older than 7 days
            const staleSessions = await all(`
                SELECT id FROM user_sessions 
                WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '7 days'
                AND is_active = TRUE
            `);
            
            if (staleSessions?.length > 0) {
                issues.push({
                    type: 'stale_sessions',
                    count: staleSessions.length,
                    ids: staleSessions.map(s => s.id)
                });
            }
        } catch (error) {
            // Table might not exist
        }
        
        return issues;
    }
    
    /**
     * إصلاح الجلسات القديمة
     */
    async _fixStaleSessions(issues) {
        let fixed = 0;
        
        for (const issue of issues) {
            if (issue.type === 'stale_sessions') {
                try {
                    await run(`
                        UPDATE user_sessions 
                        SET is_active = FALSE 
                        WHERE id IN (${issue.ids.map(() => '?').join(',')})
                    `, issue.ids);
                    fixed += issue.count;
                } catch (error) {
                    this.bot.log(`Could not fix sessions: ${error.message}`, 'error');
                }
            }
        }
        
        return fixed;
    }
    
    /**
     * فحص عدم تطابق المجاميع
     */
    async _checkInconsistentTotals() {
        const issues = [];
        
        try {
            // Invoices where total doesn't match items
            const inconsistent = await all(`
                SELECT 
                    i.id,
                    i.total_amount as stored_total,
                    COALESCE(SUM(ii.total), 0) as calculated_total
                FROM invoices i
                LEFT JOIN invoice_items ii ON ii.invoice_id = i.id
                GROUP BY i.id
                HAVING ABS(stored_total - calculated_total) > 0.01
            `);
            
            if (inconsistent?.length > 0) {
                issues.push({
                    type: 'inconsistent_invoice_totals',
                    records: inconsistent
                });
            }
        } catch (error) {
            // Tables might not exist
        }
        
        return issues;
    }
    
    /**
     * إصلاح عدم تطابق المجاميع
     */
    async _fixInconsistentTotals(issues) {
        let fixed = 0;
        
        for (const issue of issues) {
            if (issue.type === 'inconsistent_invoice_totals') {
                for (const record of issue.records) {
                    try {
                        await run(`
                            UPDATE invoices 
                            SET total_amount = ?, updated_at = ?
                            WHERE id = ?
                        `, [record.calculated_total, now(), record.id]);
                        fixed++;
                    } catch (error) {
                        this.bot.log(`Could not fix total: ${error.message}`, 'error');
                    }
                }
            }
        }
        
        return fixed;
    }
    
    /**
     * تسجيل الإصلاح
     */
    async _logFix(ruleName, found, fixed) {
        try {
            await run(`
                INSERT INTO bot_fixes (id, error_type, description, fix_applied, success, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [
                generateId(),
                ruleName,
                `Found ${found} issues`,
                `Fixed ${fixed} issues`,
                fixed > 0 ? 1 : 0,
                now()
            ]);
        } catch (error) {
            // Table might not exist
        }
    }
}

module.exports = AutoHealer;

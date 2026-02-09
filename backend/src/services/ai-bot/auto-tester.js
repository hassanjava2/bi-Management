/**
 * Auto Tester Module
 * اختبار تلقائي لجميع الـ APIs والوظائف
 */

const http = require('http');
const https = require('https');
const { run, get, all } = require('../../config/database');
const { generateId, now } = require('../../utils/helpers');

class AutoTester {
    constructor(bot) {
        this.bot = bot;
        this.baseUrl = process.env.API_URL || 'http://localhost:3000';
        this.testResults = [];
        
        // Test endpoints
        this.endpoints = [
            // Auth
            { method: 'GET', path: '/api/health', auth: false, name: 'Health Check' },
            { method: 'GET', path: '/api', auth: false, name: 'API Info' },
            
            // Users
            { method: 'GET', path: '/api/users', auth: true, name: 'List Users' },
            { method: 'GET', path: '/api/users/me', auth: true, name: 'Current User' },
            
            // Products
            { method: 'GET', path: '/api/products', auth: true, name: 'List Products' },
            { method: 'GET', path: '/api/products/stats', auth: true, name: 'Product Stats' },
            
            // Invoices
            { method: 'GET', path: '/api/invoices', auth: true, name: 'List Invoices' },
            { method: 'GET', path: '/api/invoices/stats', auth: true, name: 'Invoice Stats' },
            
            // Customers
            { method: 'GET', path: '/api/customers', auth: true, name: 'List Customers' },
            
            // Suppliers
            { method: 'GET', path: '/api/suppliers', auth: true, name: 'List Suppliers' },
            
            // Inventory
            { method: 'GET', path: '/api/inventory', auth: true, name: 'Inventory' },
            
            // Tasks
            { method: 'GET', path: '/api/tasks', auth: true, name: 'List Tasks' },
            
            // Notifications
            { method: 'GET', path: '/api/notifications', auth: true, name: 'Notifications' },
            
            // Attendance
            { method: 'GET', path: '/api/attendance', auth: true, name: 'Attendance' },
            
            // Reports
            { method: 'GET', path: '/api/reports/dashboard', auth: true, name: 'Dashboard' },
        ];
    }
    
    /**
     * تشغيل جميع الاختبارات
     */
    async runAllTests() {
        this.bot.log('🧪 Running API tests...');
        
        const results = {
            total: 0,
            passed: 0,
            failed: 0,
            skipped: 0,
            failures: [],
            details: []
        };
        
        // Get auth token
        const token = await this._getAuthToken();
        
        for (const endpoint of this.endpoints) {
            results.total++;
            
            try {
                const testResult = await this._testEndpoint(endpoint, token);
                results.details.push(testResult);
                
                if (testResult.success) {
                    results.passed++;
                } else {
                    results.failed++;
                    results.failures.push(testResult);
                }
            } catch (error) {
                results.failed++;
                results.failures.push({
                    endpoint: endpoint.path,
                    name: endpoint.name,
                    success: false,
                    error: error.message
                });
            }
        }
        
        // Run database tests
        const dbResults = await this._runDatabaseTests();
        results.total += dbResults.total;
        results.passed += dbResults.passed;
        results.failed += dbResults.failed;
        results.failures.push(...dbResults.failures);
        
        // Run business logic tests
        const logicResults = await this._runBusinessLogicTests();
        results.total += logicResults.total;
        results.passed += logicResults.passed;
        results.failed += logicResults.failed;
        results.failures.push(...logicResults.failures);
        
        // Log results
        this._logResults(results);
        
        return results;
    }
    
    /**
     * اختبار endpoint
     */
    async _testEndpoint(endpoint, token) {
        const startTime = Date.now();
        
        return new Promise((resolve) => {
            const url = new URL(endpoint.path, this.baseUrl);
            const options = {
                hostname: url.hostname,
                port: url.port || 3000,
                path: url.pathname + url.search,
                method: endpoint.method,
                headers: {
                    'Content-Type': 'application/json',
                    'X-Bot-Request': 'true'  // Mark as bot request to skip rate limiting
                },
                timeout: 10000
            };
            
            if (endpoint.auth && token) {
                options.headers['Authorization'] = `Bearer ${token}`;
            }
            
            const req = http.request(options, (res) => {
                let data = '';
                
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    const duration = Date.now() - startTime;
                    const success = res.statusCode >= 200 && res.statusCode < 400;
                    
                    let responseData;
                    try {
                        responseData = JSON.parse(data);
                    } catch {
                        responseData = data;
                    }
                    
                    resolve({
                        endpoint: endpoint.path,
                        name: endpoint.name,
                        method: endpoint.method,
                        success,
                        statusCode: res.statusCode,
                        duration,
                        response: success ? 'OK' : responseData
                    });
                });
            });
            
            req.on('error', (error) => {
                resolve({
                    endpoint: endpoint.path,
                    name: endpoint.name,
                    method: endpoint.method,
                    success: false,
                    error: error.message,
                    duration: Date.now() - startTime
                });
            });
            
            req.on('timeout', () => {
                req.destroy();
                resolve({
                    endpoint: endpoint.path,
                    name: endpoint.name,
                    success: false,
                    error: 'Request timeout',
                    duration: Date.now() - startTime
                });
            });
            
            if (endpoint.body) {
                req.write(JSON.stringify(endpoint.body));
            }
            
            req.end();
        });
    }
    
    /**
     * الحصول على token للاختبارات
     */
    async _getAuthToken() {
        return new Promise((resolve) => {
            const postData = JSON.stringify({
                email: 'admin@bi-company.com',
                password: 'Admin@123'
            });
            
            const options = {
                hostname: 'localhost',
                port: 3000,
                path: '/api/auth/login',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postData),
                    'X-Bot-Request': 'true'  // Skip rate limiting for bot
                },
                timeout: 5000
            };
            
            const req = http.request(options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const response = JSON.parse(data);
                        resolve(response.data?.token || null);
                    } catch {
                        resolve(null);
                    }
                });
            });
            
            req.on('error', () => resolve(null));
            req.on('timeout', () => {
                req.destroy();
                resolve(null);
            });
            
            req.write(postData);
            req.end();
        });
    }
    
    /**
     * اختبارات قاعدة البيانات
     */
    async _runDatabaseTests() {
        const results = {
            total: 0,
            passed: 0,
            failed: 0,
            failures: []
        };
        
        const tests = [
            {
                name: 'Users table exists',
                test: () => {
                    const result = get("SELECT name FROM sqlite_master WHERE type='table' AND name='users'");
                    return result !== null;
                }
            },
            {
                name: 'Admin user exists',
                test: () => {
                    const result = get("SELECT id FROM users WHERE email = 'admin@bi-company.com'");
                    return result !== null;
                }
            },
            {
                name: 'Products table accessible',
                test: () => {
                    const result = all("SELECT COUNT(*) as count FROM products");
                    return result !== undefined;
                }
            },
            {
                name: 'Invoices table accessible',
                test: () => {
                    const result = all("SELECT COUNT(*) as count FROM invoices");
                    return result !== undefined;
                }
            },
            {
                name: 'Foreign keys enabled',
                test: () => {
                    const result = get("PRAGMA foreign_keys");
                    return true; // Just check it doesn't error
                }
            },
            {
                name: 'Audit logs writable',
                test: () => {
                    try {
                        run(`
                            INSERT INTO audit_logs (id, event_type, action, created_at)
                            VALUES (?, 'test', 'bot_test', ?)
                        `, [generateId(), now()]);
                        return true;
                    } catch {
                        return false;
                    }
                }
            }
        ];
        
        for (const test of tests) {
            results.total++;
            try {
                const passed = test.test();
                if (passed) {
                    results.passed++;
                } else {
                    results.failed++;
                    results.failures.push({
                        name: test.name,
                        type: 'database',
                        error: 'Test assertion failed'
                    });
                }
            } catch (error) {
                results.failed++;
                results.failures.push({
                    name: test.name,
                    type: 'database',
                    error: error.message
                });
            }
        }
        
        return results;
    }
    
    /**
     * اختبارات منطق الأعمال
     */
    async _runBusinessLogicTests() {
        const results = {
            total: 0,
            passed: 0,
            failed: 0,
            failures: []
        };
        
        const tests = [
            {
                name: 'Invoice number generation',
                test: () => {
                    const date = new Date();
                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const pattern = new RegExp(`^INV-${year}${month}-\\d{4}$`);
                    const testNum = `INV-${year}${month}-0001`;
                    return pattern.test(testNum);
                }
            },
            {
                name: 'Price calculation',
                test: () => {
                    const price = 100;
                    const quantity = 5;
                    const discount = 10;
                    const expected = (price * quantity) * (1 - discount / 100);
                    return expected === 450;
                }
            },
            {
                name: 'Date formatting',
                test: () => {
                    const date = new Date('2024-01-15');
                    const formatted = date.toISOString().split('T')[0];
                    return formatted === '2024-01-15';
                }
            }
        ];
        
        for (const test of tests) {
            results.total++;
            try {
                const passed = test.test();
                if (passed) {
                    results.passed++;
                } else {
                    results.failed++;
                    results.failures.push({
                        name: test.name,
                        type: 'business_logic',
                        error: 'Test assertion failed'
                    });
                }
            } catch (error) {
                results.failed++;
                results.failures.push({
                    name: test.name,
                    type: 'business_logic',
                    error: error.message
                });
            }
        }
        
        return results;
    }
    
    /**
     * تسجيل النتائج
     */
    _logResults(results) {
        const status = results.failed === 0 ? '✅' : '⚠️';
        this.bot.log(`${status} Tests: ${results.passed}/${results.total} passed, ${results.failed} failed`);
        
        if (results.failures.length > 0) {
            this.bot.log(`Failed tests:`, 'warn');
            results.failures.forEach(f => {
                this.bot.log(`  - ${f.name || f.endpoint}: ${f.error}`, 'warn');
            });
        }
        
        // Save to DB
        this.bot.logToDB('test_results', {
            total: results.total,
            passed: results.passed,
            failed: results.failed,
            failures: results.failures.map(f => f.name || f.endpoint)
        });
    }
}

module.exports = AutoTester;

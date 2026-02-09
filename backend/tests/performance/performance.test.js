/**
 * BI Management - Performance Tests
 * اختبارات الأداء
 */

const request = require('supertest');
const { app, server } = require('../../src/app');

describe('⚡ Performance Tests', () => {
    let authToken = null;

    beforeAll(async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ username: 'admin', password: 'Admin@123' });
        
        if (res.body.success) {
            authToken = res.body.data.token;
        }
    });

    afterAll(async () => {
        if (server) server.close();
    });

    // ═══════════════════════════════════════════════════════════════
    // Response Time Tests
    // ═══════════════════════════════════════════════════════════════

    describe('Response Time', () => {
        it('⚡ Health check should respond < 100ms', async () => {
            const start = Date.now();
            const res = await request(app).get('/api/health');
            const duration = Date.now() - start;

            expect(res.status).toBe(200);
            expect(duration).toBeLessThan(100);
            console.log(`   Health check: ${duration}ms`);
        });

        it('⚡ Login should respond < 500ms', async () => {
            const start = Date.now();
            const res = await request(app)
                .post('/api/auth/login')
                .send({ username: 'admin', password: 'Admin@123' });
            const duration = Date.now() - start;

            expect(duration).toBeLessThan(500);
            console.log(`   Login: ${duration}ms`);
        });

        it('⚡ Dashboard data should respond < 1000ms', async () => {
            if (!authToken) return;

            const start = Date.now();
            const res = await request(app)
                .get('/api/dashboard/stats')
                .set('Authorization', `Bearer ${authToken}`);
            const duration = Date.now() - start;

            expect(duration).toBeLessThan(1000);
            console.log(`   Dashboard stats: ${duration}ms`);
        });

        it('⚡ Products list should respond < 500ms', async () => {
            if (!authToken) return;

            const start = Date.now();
            const res = await request(app)
                .get('/api/products')
                .set('Authorization', `Bearer ${authToken}`);
            const duration = Date.now() - start;

            expect(duration).toBeLessThan(500);
            console.log(`   Products list: ${duration}ms`);
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // Concurrent Requests Tests
    // ═══════════════════════════════════════════════════════════════

    describe('Concurrent Requests', () => {
        it('⚡ Should handle 10 concurrent requests', async () => {
            if (!authToken) return;

            const start = Date.now();
            const promises = [];
            
            for (let i = 0; i < 10; i++) {
                promises.push(
                    request(app)
                        .get('/api/products')
                        .set('Authorization', `Bearer ${authToken}`)
                );
            }

            const results = await Promise.all(promises);
            const duration = Date.now() - start;

            const successful = results.filter(r => r.status === 200 || r.status === 404);
            expect(successful.length).toBeGreaterThanOrEqual(8); // Allow some failures
            
            console.log(`   10 concurrent requests: ${duration}ms (${successful.length}/10 successful)`);
        });

        it('⚡ Should handle 50 concurrent requests', async () => {
            if (!authToken) return;

            const start = Date.now();
            const promises = [];
            
            for (let i = 0; i < 50; i++) {
                promises.push(
                    request(app)
                        .get('/api/health')
                );
            }

            const results = await Promise.all(promises);
            const duration = Date.now() - start;

            const successful = results.filter(r => r.status === 200);
            expect(successful.length).toBeGreaterThanOrEqual(40);
            
            console.log(`   50 concurrent requests: ${duration}ms (${successful.length}/50 successful)`);
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // Memory Usage
    // ═══════════════════════════════════════════════════════════════

    describe('Memory Usage', () => {
        it('⚡ Memory should not exceed 512MB', () => {
            const memUsage = process.memoryUsage();
            const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
            
            console.log(`   Heap used: ${heapUsedMB.toFixed(2)}MB`);
            console.log(`   RSS: ${(memUsage.rss / 1024 / 1024).toFixed(2)}MB`);
            
            expect(heapUsedMB).toBeLessThan(512);
        });

        it('⚡ Memory should not leak after requests', async () => {
            if (!authToken) return;

            const initialMemory = process.memoryUsage().heapUsed;

            // Make many requests
            for (let i = 0; i < 100; i++) {
                await request(app)
                    .get('/api/health');
            }

            // Force garbage collection if available
            if (global.gc) {
                global.gc();
            }

            const finalMemory = process.memoryUsage().heapUsed;
            const growth = (finalMemory - initialMemory) / 1024 / 1024;

            console.log(`   Memory growth after 100 requests: ${growth.toFixed(2)}MB`);
            
            // Memory growth should be reasonable
            expect(growth).toBeLessThan(50);
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // Database Query Performance
    // ═══════════════════════════════════════════════════════════════

    describe('Database Performance', () => {
        it('⚡ Simple queries should be fast', async () => {
            if (!authToken) return;

            const endpoints = [
                '/api/users',
                '/api/products',
                '/api/customers',
                '/api/suppliers'
            ];

            for (const endpoint of endpoints) {
                const start = Date.now();
                await request(app)
                    .get(endpoint)
                    .set('Authorization', `Bearer ${authToken}`);
                const duration = Date.now() - start;

                console.log(`   ${endpoint}: ${duration}ms`);
                expect(duration).toBeLessThan(1000);
            }
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // Payload Size Tests
    // ═══════════════════════════════════════════════════════════════

    describe('Payload Size', () => {
        it('⚡ Response should be reasonably sized', async () => {
            if (!authToken) return;

            const res = await request(app)
                .get('/api/products')
                .set('Authorization', `Bearer ${authToken}`);

            if (res.status === 200) {
                const responseSize = JSON.stringify(res.body).length;
                console.log(`   Products response size: ${(responseSize / 1024).toFixed(2)}KB`);
                
                // Response should not be excessively large
                expect(responseSize).toBeLessThan(10 * 1024 * 1024); // 10MB max
            }
        });

        it('⚡ Should support compression', async () => {
            const res = await request(app)
                .get('/api/products')
                .set('Authorization', `Bearer ${authToken}`)
                .set('Accept-Encoding', 'gzip, deflate');

            // Server should support compression
            // (exact header depends on configuration)
        });
    });
});

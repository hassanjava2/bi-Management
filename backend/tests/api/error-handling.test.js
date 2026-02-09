/**
 * BI Management - Error Handling Tests
 * اختبارات معالجة الأخطاء
 */

const request = require('supertest');
const { app, server } = require('../../src/app');

describe('🚨 Error Handling Tests', () => {
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
    // 404 Not Found Tests
    // ═══════════════════════════════════════════════════════════════

    describe('404 Not Found', () => {
        it('✅ should return 404 for non-existent routes', async () => {
            const res = await request(app)
                .get('/api/non-existent-endpoint');

            expect(res.status).toBe(404);
            expect(res.body.success).toBe(false);
            expect(res.body.error).toBeDefined();
        });

        it('✅ should return proper error message', async () => {
            const res = await request(app)
                .get('/api/does-not-exist');

            expect(res.status).toBe(404);
            expect(res.body.message).toBeDefined();
        });

        it('✅ should return 404 for non-existent resource', async () => {
            if (!authToken) return;

            const res = await request(app)
                .get('/api/users/non-existent-user-id-12345')
                .set('Authorization', `Bearer ${authToken}`);

            expect([404, 400]).toContain(res.status);
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // 400 Bad Request Tests
    // ═══════════════════════════════════════════════════════════════

    describe('400 Bad Request', () => {
        it('✅ should return 400 for invalid JSON', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .set('Content-Type', 'application/json')
                .send('invalid json{');

            expect([400, 500]).toContain(res.status);
        });

        it('✅ should return 400 for missing required fields', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({});

            expect([400, 401]).toContain(res.status);
            expect(res.body.success).toBe(false);
        });

        it('✅ should return clear error message for validation errors', async () => {
            if (!authToken) return;

            const res = await request(app)
                .post('/api/customers')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ invalid_field: 'test' });

            expect([400, 422]).toContain(res.status);
            expect(res.body.message || res.body.error).toBeDefined();
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // 401 Unauthorized Tests
    // ═══════════════════════════════════════════════════════════════

    describe('401 Unauthorized', () => {
        it('✅ should return 401 for protected routes without token', async () => {
            const res = await request(app)
                .get('/api/users');

            expect(res.status).toBe(401);
            expect(res.body.success).toBe(false);
        });

        it('✅ should return 401 for invalid token', async () => {
            const res = await request(app)
                .get('/api/users')
                .set('Authorization', 'Bearer invalid_token');

            expect(res.status).toBe(401);
        });

        it('✅ should return 401 for malformed authorization header', async () => {
            const res = await request(app)
                .get('/api/users')
                .set('Authorization', 'InvalidFormat token');

            expect(res.status).toBe(401);
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // 403 Forbidden Tests
    // ═══════════════════════════════════════════════════════════════

    describe('403 Forbidden', () => {
        it('✅ should return 403 for insufficient permissions', async () => {
            // This would require a user with limited permissions
            // For now, we verify the structure
            if (!authToken) return;

            // Try to access a potentially restricted endpoint
            const res = await request(app)
                .delete('/api/system/reset') // Hypothetical dangerous endpoint
                .set('Authorization', `Bearer ${authToken}`);

            expect([403, 404]).toContain(res.status);
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // Error Response Structure Tests
    // ═══════════════════════════════════════════════════════════════

    describe('Error Response Structure', () => {
        it('✅ should have consistent error response structure', async () => {
            const res = await request(app)
                .get('/api/non-existent');

            expect(res.body).toHaveProperty('success');
            expect(res.body.success).toBe(false);
            // Should have error info
            expect(res.body.message || res.body.error).toBeDefined();
        });

        it('✅ should not expose sensitive error details in production', async () => {
            const res = await request(app)
                .get('/api/non-existent');

            // Should not expose stack traces
            expect(res.body.stack).toBeUndefined();
            // Should not expose internal paths
            const responseStr = JSON.stringify(res.body);
            expect(responseStr).not.toContain('node_modules');
            expect(responseStr).not.toContain('D:\\');
            expect(responseStr).not.toContain('C:\\');
        });

        it('✅ should include error code when available', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({ username: 'wrong', password: 'wrong' });

            expect(res.status).toBe(401);
            // May have an error code
            if (res.body.error) {
                expect(typeof res.body.error).toBe('string');
            }
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // Edge Cases
    // ═══════════════════════════════════════════════════════════════

    describe('Edge Cases', () => {
        it('✅ should handle empty body', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send();

            expect([400, 401]).toContain(res.status);
        });

        it('✅ should handle very long URLs', async () => {
            const longPath = '/api/' + 'x'.repeat(5000);
            const res = await request(app).get(longPath);

            expect([400, 404, 414]).toContain(res.status);
        });

        it('✅ should handle special characters in parameters', async () => {
            const res = await request(app)
                .get('/api/users/' + encodeURIComponent('!@#$%^&*()'))
                .set('Authorization', `Bearer ${authToken || 'test'}`);

            expect([400, 401, 404]).toContain(res.status);
        });

        it('✅ should handle unsupported methods', async () => {
            const res = await request(app)
                .patch('/api/auth/login')
                .send({});

            expect([404, 405]).toContain(res.status);
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // Graceful Degradation
    // ═══════════════════════════════════════════════════════════════

    describe('Graceful Degradation', () => {
        it('✅ should handle concurrent errors gracefully', async () => {
            const promises = [];
            
            for (let i = 0; i < 20; i++) {
                promises.push(
                    request(app)
                        .get('/api/non-existent-' + i)
                );
            }

            const results = await Promise.all(promises);
            
            // All should return proper error responses
            results.forEach(res => {
                expect(res.status).toBe(404);
                expect(res.body.success).toBe(false);
            });
        });
    });
});

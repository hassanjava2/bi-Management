/**
 * BI Management - Authentication API Tests
 * اختبارات API المصادقة
 */

const request = require('supertest');
const { app, server } = require('../../src/app');
const { getDatabase } = require('../../src/config/database');

describe('🔐 Authentication API Tests', () => {
    let authToken = null;
    let refreshToken = null;
    const testUser = {
        username: 'test_user_' + Date.now(),
        email: `test${Date.now()}@bimanagement.com`,
        password: 'Test@123456',
        full_name: 'Test User'
    };

    beforeAll(async () => {
        // Initialize database if needed
    });

    afterAll(async () => {
        // Cleanup
        if (server) server.close();
    });

    // ═══════════════════════════════════════════════════════════════
    // Login Tests
    // ═══════════════════════════════════════════════════════════════

    describe('POST /api/auth/login', () => {
        it('✅ should login with valid admin credentials', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    username: 'admin',
                    password: 'Admin@123'
                });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveProperty('token');
            expect(res.body.data).toHaveProperty('refreshToken');
            expect(res.body.data).toHaveProperty('user');
            
            authToken = res.body.data.token;
            refreshToken = res.body.data.refreshToken;
        });

        it('❌ should reject invalid password', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    username: 'admin',
                    password: 'wrongpassword'
                });

            expect(res.status).toBe(401);
            expect(res.body.success).toBe(false);
        });

        it('❌ should reject non-existent user', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    username: 'nonexistent_user',
                    password: 'password'
                });

            expect(res.status).toBe(401);
            expect(res.body.success).toBe(false);
        });

        it('❌ should reject empty credentials', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({});

            expect([400, 401]).toContain(res.status);
            expect(res.body.success).toBe(false);
        });

        it('❌ should reject SQL injection in username', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    username: "admin' OR '1'='1",
                    password: 'anything'
                });

            expect(res.status).toBe(401);
            expect(res.body.success).toBe(false);
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // Token Refresh Tests
    // ═══════════════════════════════════════════════════════════════

    describe('POST /api/auth/refresh-token', () => {
        it('✅ should refresh token with valid refresh token', async () => {
            if (!refreshToken) {
                console.log('⚠️ Skipping - no refresh token available');
                return;
            }

            const res = await request(app)
                .post('/api/auth/refresh-token')
                .send({ refreshToken });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveProperty('token');
        });

        it('❌ should reject invalid refresh token', async () => {
            const res = await request(app)
                .post('/api/auth/refresh-token')
                .send({ refreshToken: 'invalid_token' });

            expect(res.status).toBe(401);
            expect(res.body.success).toBe(false);
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // Get Current User Tests
    // ═══════════════════════════════════════════════════════════════

    describe('GET /api/auth/me', () => {
        it('✅ should return user info with valid token', async () => {
            if (!authToken) {
                console.log('⚠️ Skipping - no auth token available');
                return;
            }

            const res = await request(app)
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveProperty('id');
            expect(res.body.data).toHaveProperty('username');
        });

        it('❌ should reject request without token', async () => {
            const res = await request(app)
                .get('/api/auth/me');

            expect(res.status).toBe(401);
        });

        it('❌ should reject invalid token', async () => {
            const res = await request(app)
                .get('/api/auth/me')
                .set('Authorization', 'Bearer invalid_token');

            expect(res.status).toBe(401);
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // Logout Tests
    // ═══════════════════════════════════════════════════════════════

    describe('POST /api/auth/logout', () => {
        it('✅ should logout successfully', async () => {
            if (!authToken) {
                console.log('⚠️ Skipping - no auth token available');
                return;
            }

            const res = await request(app)
                .post('/api/auth/logout')
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // Rate Limiting Tests
    // ═══════════════════════════════════════════════════════════════

    describe('Rate Limiting', () => {
        it('⚡ should handle multiple rapid requests', async () => {
            const promises = [];
            for (let i = 0; i < 10; i++) {
                promises.push(
                    request(app)
                        .post('/api/auth/login')
                        .send({ username: 'test', password: 'test' })
                );
            }

            const results = await Promise.all(promises);
            // At least some should succeed (not rate limited for 10 requests)
            const successful = results.filter(r => r.status !== 429);
            expect(successful.length).toBeGreaterThan(0);
        });
    });
});

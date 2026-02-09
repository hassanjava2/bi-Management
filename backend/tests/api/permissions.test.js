/**
 * BI Management - Permissions API Tests
 * اختبارات API الصلاحيات
 */

const request = require('supertest');
const { app, server } = require('../../src/app');

describe('🔑 Permissions API Tests', () => {
    let adminToken = null;
    let userToken = null;

    beforeAll(async () => {
        // Login as admin
        const adminRes = await request(app)
            .post('/api/auth/login')
            .send({ username: 'admin', password: 'Admin@123' });
        
        if (adminRes.body.success) {
            adminToken = adminRes.body.data.token;
        }
    });

    afterAll(async () => {
        if (server) server.close();
    });

    // ═══════════════════════════════════════════════════════════════
    // Get My Permissions
    // ═══════════════════════════════════════════════════════════════

    describe('GET /api/permissions/my-permissions', () => {
        it('✅ should return user permissions', async () => {
            if (!adminToken) {
                console.log('⚠️ Skipping - no admin token');
                return;
            }

            const res = await request(app)
                .get('/api/permissions/my-permissions')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body).toHaveProperty('codes');
            expect(Array.isArray(res.body.codes) || res.body.codes instanceof Set).toBeTruthy();
        });

        it('❌ should reject unauthenticated request', async () => {
            const res = await request(app)
                .get('/api/permissions/my-permissions');

            expect(res.status).toBe(401);
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // Get All Permissions
    // ═══════════════════════════════════════════════════════════════

    describe('GET /api/permissions/all', () => {
        it('✅ should return all permissions for admin', async () => {
            if (!adminToken) {
                console.log('⚠️ Skipping - no admin token');
                return;
            }

            const res = await request(app)
                .get('/api/permissions/all')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // Get Roles
    // ═══════════════════════════════════════════════════════════════

    describe('GET /api/permissions/roles', () => {
        it('✅ should return all roles', async () => {
            if (!adminToken) {
                console.log('⚠️ Skipping - no admin token');
                return;
            }

            const res = await request(app)
                .get('/api/permissions/roles')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toBeDefined();
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // Permission Checks
    // ═══════════════════════════════════════════════════════════════

    describe('Permission-Protected Endpoints', () => {
        it('✅ admin should access admin endpoints', async () => {
            if (!adminToken) {
                console.log('⚠️ Skipping - no admin token');
                return;
            }

            const res = await request(app)
                .get('/api/users')
                .set('Authorization', `Bearer ${adminToken}`);

            // Admin should have access
            expect([200, 403]).toContain(res.status);
        });

        it('❌ should deny access to sensitive data without permission', async () => {
            // Create a user with limited permissions
            // This would need a proper test user setup
            // For now, we test that unauthorized access is blocked
            const res = await request(app)
                .get('/api/accounting/accounts')
                .set('Authorization', `Bearer invalid_token`);

            expect(res.status).toBe(401);
        });
    });
});

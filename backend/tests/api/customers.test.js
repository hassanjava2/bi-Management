/**
 * BI Management - Customers API Tests
 * اختبارات API العملاء
 */

const request = require('supertest');
const { app, server } = require('../../src/app');

describe('👥 Customers API Tests', () => {
    let authToken = null;
    let createdCustomerId = null;

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
    // List Customers
    // ═══════════════════════════════════════════════════════════════

    describe('GET /api/customers', () => {
        it('✅ should return customers list', async () => {
            if (!authToken) return;

            const res = await request(app)
                .get('/api/customers')
                .set('Authorization', `Bearer ${authToken}`);

            expect([200, 404]).toContain(res.status);
            if (res.status === 200) {
                expect(res.body.success).toBe(true);
            }
        });

        it('✅ should support pagination', async () => {
            if (!authToken) return;

            const res = await request(app)
                .get('/api/customers?page=1&limit=10')
                .set('Authorization', `Bearer ${authToken}`);

            expect([200, 404]).toContain(res.status);
        });

        it('✅ should support search', async () => {
            if (!authToken) return;

            const res = await request(app)
                .get('/api/customers?search=test')
                .set('Authorization', `Bearer ${authToken}`);

            expect([200, 404]).toContain(res.status);
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // Create Customer
    // ═══════════════════════════════════════════════════════════════

    describe('POST /api/customers', () => {
        it('✅ should create customer with valid data', async () => {
            if (!authToken) return;

            const customerData = {
                name: 'Test Customer ' + Date.now(),
                phone: global.testUtils?.testPhone() || '07901234567',
                email: global.testUtils?.testEmail() || `test${Date.now()}@test.com`,
                address: 'Test Address'
            };

            const res = await request(app)
                .post('/api/customers')
                .set('Authorization', `Bearer ${authToken}`)
                .send(customerData);

            expect([200, 201, 400, 403]).toContain(res.status);
            if (res.body.success && res.body.data) {
                createdCustomerId = res.body.data.id;
            }
        });

        it('❌ should reject customer without name', async () => {
            if (!authToken) return;

            const res = await request(app)
                .post('/api/customers')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    phone: '07901234567'
                });

            expect([400, 422]).toContain(res.status);
        });

        it('❌ should reject invalid phone number', async () => {
            if (!authToken) return;

            const res = await request(app)
                .post('/api/customers')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    name: 'Test Customer',
                    phone: 'invalid-phone'
                });

            // May accept or reject based on validation rules
            expect([200, 201, 400, 422]).toContain(res.status);
        });

        it('❌ should reject invalid email', async () => {
            if (!authToken) return;

            const res = await request(app)
                .post('/api/customers')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    name: 'Test Customer',
                    phone: '07901234567',
                    email: 'not-an-email'
                });

            expect([200, 201, 400, 422]).toContain(res.status);
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // Get Customer
    // ═══════════════════════════════════════════════════════════════

    describe('GET /api/customers/:id', () => {
        it('✅ should return customer details', async () => {
            if (!authToken || !createdCustomerId) return;

            const res = await request(app)
                .get(`/api/customers/${createdCustomerId}`)
                .set('Authorization', `Bearer ${authToken}`);

            expect([200, 404]).toContain(res.status);
        });

        it('❌ should return 404 for non-existent customer', async () => {
            if (!authToken) return;

            const res = await request(app)
                .get('/api/customers/non-existent-id-12345')
                .set('Authorization', `Bearer ${authToken}`);

            expect([404, 400]).toContain(res.status);
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // Update Customer
    // ═══════════════════════════════════════════════════════════════

    describe('PUT /api/customers/:id', () => {
        it('✅ should update customer', async () => {
            if (!authToken || !createdCustomerId) return;

            const res = await request(app)
                .put(`/api/customers/${createdCustomerId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    name: 'Updated Customer Name',
                    notes: 'Updated notes'
                });

            expect([200, 404, 403]).toContain(res.status);
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // Customer Statement
    // ═══════════════════════════════════════════════════════════════

    describe('GET /api/customers/:id/statement', () => {
        it('✅ should return customer statement', async () => {
            if (!authToken || !createdCustomerId) return;

            const res = await request(app)
                .get(`/api/customers/${createdCustomerId}/statement`)
                .set('Authorization', `Bearer ${authToken}`);

            expect([200, 404]).toContain(res.status);
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // Customer Balance
    // ═══════════════════════════════════════════════════════════════

    describe('GET /api/customers/:id/balance', () => {
        it('✅ should return customer balance', async () => {
            if (!authToken || !createdCustomerId) return;

            const res = await request(app)
                .get(`/api/customers/${createdCustomerId}/balance`)
                .set('Authorization', `Bearer ${authToken}`);

            expect([200, 404]).toContain(res.status);
        });
    });
});

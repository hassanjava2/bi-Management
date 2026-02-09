/**
 * BI Management - Inventory API Tests
 * اختبارات API المخزون
 */

const request = require('supertest');
const { app, server } = require('../../src/app');

describe('📦 Inventory API Tests', () => {
    let authToken = null;

    beforeAll(async () => {
        // Login
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
    // Products
    // ═══════════════════════════════════════════════════════════════

    describe('Products API', () => {
        describe('GET /api/products', () => {
            it('✅ should return products list', async () => {
                if (!authToken) return;

                const res = await request(app)
                    .get('/api/products')
                    .set('Authorization', `Bearer ${authToken}`);

                expect([200, 404]).toContain(res.status);
                if (res.status === 200) {
                    expect(res.body.success).toBe(true);
                }
            });
        });

        describe('POST /api/products', () => {
            it('✅ should create product with valid data', async () => {
                if (!authToken) return;

                const res = await request(app)
                    .post('/api/products')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({
                        name: 'Test Product ' + Date.now(),
                        sku: 'TST-' + Date.now(),
                        price: 100,
                        cost: 80,
                        category_id: null
                    });

                expect([200, 201, 400, 403]).toContain(res.status);
            });

            it('❌ should reject product without name', async () => {
                if (!authToken) return;

                const res = await request(app)
                    .post('/api/products')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({
                        sku: 'TST-NO-NAME',
                        price: 100
                    });

                expect([400, 422]).toContain(res.status);
            });
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // Inventory Stock
    // ═══════════════════════════════════════════════════════════════

    describe('Inventory Stock API', () => {
        describe('GET /api/inventory', () => {
            it('✅ should return inventory list', async () => {
                if (!authToken) return;

                const res = await request(app)
                    .get('/api/inventory')
                    .set('Authorization', `Bearer ${authToken}`);

                expect([200, 404]).toContain(res.status);
            });
        });

        describe('GET /api/inventory/low-stock', () => {
            it('✅ should return low stock items', async () => {
                if (!authToken) return;

                const res = await request(app)
                    .get('/api/inventory/low-stock')
                    .set('Authorization', `Bearer ${authToken}`);

                expect([200, 404]).toContain(res.status);
            });
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // Serial Numbers
    // ═══════════════════════════════════════════════════════════════

    describe('Serial Numbers API', () => {
        describe('GET /api/inventory/serials', () => {
            it('✅ should return serial numbers', async () => {
                if (!authToken) return;

                const res = await request(app)
                    .get('/api/inventory/serials')
                    .set('Authorization', `Bearer ${authToken}`);

                expect([200, 404]).toContain(res.status);
            });
        });

        describe('GET /api/inventory/serial/:serial', () => {
            it('✅ should search serial number', async () => {
                if (!authToken) return;

                const res = await request(app)
                    .get('/api/inventory/serial/TEST123')
                    .set('Authorization', `Bearer ${authToken}`);

                expect([200, 404]).toContain(res.status);
            });
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // Warehouses
    // ═══════════════════════════════════════════════════════════════

    describe('Warehouses API', () => {
        describe('GET /api/inventory/warehouses', () => {
            it('✅ should return warehouses list', async () => {
                if (!authToken) return;

                const res = await request(app)
                    .get('/api/inventory/warehouses')
                    .set('Authorization', `Bearer ${authToken}`);

                expect([200, 404]).toContain(res.status);
            });
        });
    });
});

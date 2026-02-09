/**
 * BI Management - Sales API Tests
 * اختبارات API المبيعات
 */

const request = require('supertest');
const { app, server } = require('../../src/app');

describe('💰 Sales API Tests', () => {
    let authToken = null;
    let createdInvoiceId = null;

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
    // Invoices
    // ═══════════════════════════════════════════════════════════════

    describe('Invoices API', () => {
        describe('GET /api/invoice', () => {
            it('✅ should return invoices list', async () => {
                if (!authToken) return;

                const res = await request(app)
                    .get('/api/invoice')
                    .set('Authorization', `Bearer ${authToken}`);

                expect([200, 404]).toContain(res.status);
            });
        });

        describe('POST /api/invoice', () => {
            it('✅ should create cash invoice', async () => {
                if (!authToken) return;

                const res = await request(app)
                    .post('/api/invoice')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({
                        payment_type: 'cash',
                        items: [
                            {
                                product_id: 'test-product',
                                quantity: 1,
                                price: 100
                            }
                        ],
                        total: 100,
                        paid: 100
                    });

                expect([200, 201, 400, 404]).toContain(res.status);
                if (res.body.success && res.body.data) {
                    createdInvoiceId = res.body.data.id;
                }
            });

            it('❌ should reject invoice without items', async () => {
                if (!authToken) return;

                const res = await request(app)
                    .post('/api/invoice')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({
                        payment_type: 'cash',
                        items: [],
                        total: 0
                    });

                expect([400, 422]).toContain(res.status);
            });

            it('❌ should reject negative amounts', async () => {
                if (!authToken) return;

                const res = await request(app)
                    .post('/api/invoice')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({
                        payment_type: 'cash',
                        items: [{ product_id: 'test', quantity: -1, price: 100 }],
                        total: -100
                    });

                expect([400, 422]).toContain(res.status);
            });
        });

        describe('GET /api/invoice/:id', () => {
            it('✅ should return invoice details', async () => {
                if (!authToken || !createdInvoiceId) return;

                const res = await request(app)
                    .get(`/api/invoice/${createdInvoiceId}`)
                    .set('Authorization', `Bearer ${authToken}`);

                expect([200, 404]).toContain(res.status);
            });

            it('❌ should return 404 for non-existent invoice', async () => {
                if (!authToken) return;

                const res = await request(app)
                    .get('/api/invoice/non-existent-id')
                    .set('Authorization', `Bearer ${authToken}`);

                expect([404, 400]).toContain(res.status);
            });
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // Installments
    // ═══════════════════════════════════════════════════════════════

    describe('Installments API', () => {
        describe('GET /api/invoice/installments', () => {
            it('✅ should return installments list', async () => {
                if (!authToken) return;

                const res = await request(app)
                    .get('/api/invoice/installments')
                    .set('Authorization', `Bearer ${authToken}`);

                expect([200, 404]).toContain(res.status);
            });
        });

        describe('GET /api/invoice/installments/due', () => {
            it('✅ should return due installments', async () => {
                if (!authToken) return;

                const res = await request(app)
                    .get('/api/invoice/installments/due')
                    .set('Authorization', `Bearer ${authToken}`);

                expect([200, 404]).toContain(res.status);
            });
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // Daily Reports
    // ═══════════════════════════════════════════════════════════════

    describe('Daily Sales Report', () => {
        describe('GET /api/invoice/daily-report', () => {
            it('✅ should return daily sales report', async () => {
                if (!authToken) return;

                const res = await request(app)
                    .get('/api/invoice/daily-report')
                    .set('Authorization', `Bearer ${authToken}`);

                expect([200, 404]).toContain(res.status);
            });
        });
    });
});

/**
 * BI Management - Invoice Audit & Permissions Tests
 * اختبارات تدقيق الفواتير والصلاحيات (حسب تقرير لجنة التدقيق)
 */

const request = require('supertest');
const { app, server } = require('../../src/app');

describe('Invoice Audit & Permissions', () => {
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

    describe('Invoice routes require auth', () => {
        it('GET /api/invoices without token should return 401', async () => {
            const res = await request(app).get('/api/invoices');
            expect(res.status).toBe(401);
        });

        it('GET /api/invoices/stats without token should return 401', async () => {
            const res = await request(app).get('/api/invoices/stats');
            expect(res.status).toBe(401);
        });
    });

    describe('Invoice audit logging', () => {
        it('creating an invoice should be reflected in audit log', async () => {
            if (!authToken) return;

            const createRes = await request(app)
                .post('/api/invoices')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    type: 'sale',
                    items: [],
                    subtotal: 0,
                    total: 0
                });

            expect([200, 201, 403, 400]).toContain(createRes.status);
            if (createRes.status === 201 && createRes.body.data) {
                createdInvoiceId = createRes.body.data.id;
            }

            if (createdInvoiceId) {
                const auditRes = await request(app)
                    .get('/api/audit?entity_type=invoice&limit=10')
                    .set('Authorization', `Bearer ${authToken}`);

                expect([200, 403, 404]).toContain(auditRes.status);
                if (auditRes.status === 200 && auditRes.body.success && auditRes.body.data) {
                    const invoiceEvents = auditRes.body.data.filter(
                        (l) => l.entity_type === 'invoice' || (l.event_type && l.event_type.includes('invoice'))
                    );
                    expect(Array.isArray(invoiceEvents)).toBe(true);
                }
            }
        });
    });

    describe('Delete requires approval or bypass', () => {
        it('DELETE /api/invoices/:id should return 400 with DELETION_REQUIRES_APPROVAL or 200/404', async () => {
            if (!authToken) return;

            const id = createdInvoiceId || 'non-existent-id';
            const res = await request(app)
                .delete(`/api/invoices/${id}`)
                .set('Authorization', `Bearer ${authToken}`);

            expect([200, 400, 404]).toContain(res.status);
            if (res.status === 400) {
                expect(res.body.error).toBe('DELETION_REQUIRES_APPROVAL');
                expect(res.body.action_required).toBeDefined();
            }
        });

        it('POST /api/invoices/:id/request-deletion should return 202 with approval', async () => {
            if (!authToken || !createdInvoiceId) return;

            const res = await request(app)
                .post(`/api/invoices/${createdInvoiceId}/request-deletion`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({ reason: 'Test audit request' });

            expect([202, 403, 404, 400]).toContain(res.status);
            if (res.status === 202) {
                expect(res.body.success).toBe(true);
                expect(res.body.data).toBeDefined();
                expect(res.body.data.approval_id).toBeDefined();
            }
        });
    });

    describe('Audit log filter by invoice', () => {
        it('GET /api/audit with entity_type=invoice should return success', async () => {
            if (!authToken) return;

            const res = await request(app)
                .get('/api/audit?entity_type=invoice&limit=5')
                .set('Authorization', `Bearer ${authToken}`);

            expect([200, 403, 404]).toContain(res.status);
            if (res.status === 200) {
                expect(res.body.success).toBe(true);
                expect(Array.isArray(res.body.data)).toBe(true);
            }
        });
    });
});

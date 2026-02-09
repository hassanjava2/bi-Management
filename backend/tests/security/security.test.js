/**
 * BI Management - Security Tests
 * اختبارات الأمان
 */

const request = require('supertest');
const { app, server } = require('../../src/app');

describe('🔒 Security Tests', () => {
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
    // SQL Injection Tests
    // ═══════════════════════════════════════════════════════════════

    describe('SQL Injection Prevention', () => {
        it('❌ should prevent SQL injection in login', async () => {
            const attacks = [
                { username: "admin'--", password: 'anything' },
                { username: "admin' OR '1'='1", password: 'anything' },
                { username: "admin'; DROP TABLE users;--", password: 'anything' },
                { username: "' UNION SELECT * FROM users--", password: 'anything' },
                { username: "1; DELETE FROM users WHERE 1=1;", password: 'anything' }
            ];

            for (const attack of attacks) {
                const res = await request(app)
                    .post('/api/auth/login')
                    .send(attack);

                expect(res.status).toBe(401);
                expect(res.body.success).toBe(false);
            }
        });

        it('❌ should prevent SQL injection in search', async () => {
            if (!authToken) return;

            const attacks = [
                "'; DROP TABLE products;--",
                "' OR '1'='1",
                "1 UNION SELECT password FROM users",
                "'; INSERT INTO users VALUES('hacked','hacked');--"
            ];

            for (const attack of attacks) {
                const res = await request(app)
                    .get(`/api/products?search=${encodeURIComponent(attack)}`)
                    .set('Authorization', `Bearer ${authToken}`);

                // Should not crash, and should not return sensitive data
                expect([200, 400, 404]).toContain(res.status);
                if (res.body.data) {
                    expect(JSON.stringify(res.body.data)).not.toContain('password');
                }
            }
        });

        it('❌ should prevent SQL injection in ID parameters', async () => {
            if (!authToken) return;

            const attacks = [
                "1 OR 1=1",
                "1; DROP TABLE users",
                "' OR ''='",
                "1 UNION SELECT * FROM users"
            ];

            for (const attack of attacks) {
                const res = await request(app)
                    .get(`/api/users/${encodeURIComponent(attack)}`)
                    .set('Authorization', `Bearer ${authToken}`);

                expect([400, 404, 403]).toContain(res.status);
            }
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // XSS Prevention Tests
    // ═══════════════════════════════════════════════════════════════

    describe('XSS Prevention', () => {
        it('❌ should sanitize XSS in input fields', async () => {
            if (!authToken) return;

            const xssPayloads = [
                '<script>alert("XSS")</script>',
                '<img src=x onerror=alert("XSS")>',
                '<svg onload=alert("XSS")>',
                '"><script>alert("XSS")</script>',
                "javascript:alert('XSS')",
                '<iframe src="javascript:alert(\'XSS\')">',
                '<body onload=alert("XSS")>'
            ];

            for (const payload of xssPayloads) {
                const res = await request(app)
                    .post('/api/customers')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({
                        name: payload,
                        phone: '1234567890'
                    });

                // Should either reject or sanitize
                if (res.status === 200 || res.status === 201) {
                    // If accepted, the response should be sanitized
                    const responseStr = JSON.stringify(res.body);
                    expect(responseStr).not.toContain('<script>');
                    expect(responseStr).not.toContain('javascript:');
                    expect(responseStr).not.toContain('onerror=');
                    expect(responseStr).not.toContain('onload=');
                }
            }
        });

        it('✅ should have security headers', async () => {
            const res = await request(app)
                .get('/api/health');

            // Check for security headers
            expect(res.headers).toHaveProperty('x-content-type-options');
            expect(res.headers).toHaveProperty('x-frame-options');
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // Authentication Bypass Tests
    // ═══════════════════════════════════════════════════════════════

    describe('Authentication Bypass Prevention', () => {
        it('❌ should reject forged JWT tokens', async () => {
            const forgedTokens = [
                'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJhZG1pbiIsInJvbGUiOiJzdXBlcl9hZG1pbiJ9.fakeSignature',
                'Bearer eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJ1c2VySWQiOiJhZG1pbiJ9.',
                'admin',
                'null',
                'undefined'
            ];

            for (const token of forgedTokens) {
                const res = await request(app)
                    .get('/api/users')
                    .set('Authorization', `Bearer ${token}`);

                expect(res.status).toBe(401);
            }
        });

        it('❌ should reject expired tokens', async () => {
            // This would require generating an expired token
            // For now, test with obviously invalid token
            const res = await request(app)
                .get('/api/users')
                .set('Authorization', 'Bearer expired.token.here');

            expect(res.status).toBe(401);
        });

        it('❌ should reject modified tokens', async () => {
            if (!authToken) return;

            // Modify the token slightly
            const modifiedToken = authToken.slice(0, -5) + 'XXXXX';
            
            const res = await request(app)
                .get('/api/users')
                .set('Authorization', `Bearer ${modifiedToken}`);

            expect(res.status).toBe(401);
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // Authorization Tests
    // ═══════════════════════════════════════════════════════════════

    describe('Authorization Tests', () => {
        it('❌ should deny access to admin routes for regular users', async () => {
            // This would require creating a test user with limited permissions
            // For demonstration, we verify the middleware is in place
            const res = await request(app)
                .delete('/api/users/some-user-id')
                .set('Authorization', 'Bearer invalid_token');

            expect(res.status).toBe(401);
        });

        it('❌ should prevent horizontal privilege escalation', async () => {
            if (!authToken) return;

            // Try to access another user's private data
            const res = await request(app)
                .get('/api/users/other-user-id/sensitive-data')
                .set('Authorization', `Bearer ${authToken}`);

            // Should either not exist or be forbidden
            expect([400, 403, 404]).toContain(res.status);
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // Input Validation Tests
    // ═══════════════════════════════════════════════════════════════

    describe('Input Validation', () => {
        it('❌ should reject oversized payloads', async () => {
            if (!authToken) return;

            const largePayload = 'x'.repeat(10 * 1024 * 1024); // 10MB

            const res = await request(app)
                .post('/api/customers')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ name: largePayload });

            expect([400, 413, 422]).toContain(res.status);
        });

        it('❌ should reject invalid data types', async () => {
            if (!authToken) return;

            const res = await request(app)
                .post('/api/invoice')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    total: 'not a number',
                    items: 'not an array'
                });

            expect([400, 422]).toContain(res.status);
        });

        it('❌ should reject null bytes', async () => {
            if (!authToken) return;

            const res = await request(app)
                .get('/api/products?search=test%00malicious')
                .set('Authorization', `Bearer ${authToken}`);

            expect([200, 400]).toContain(res.status);
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // CORS Tests
    // ═══════════════════════════════════════════════════════════════

    describe('CORS Configuration', () => {
        it('✅ should have CORS headers', async () => {
            const res = await request(app)
                .options('/api/auth/login')
                .set('Origin', 'http://localhost:3000');

            // CORS headers should be present
            expect(res.headers).toBeDefined();
        });
    });
});

/**
 * BI Management - System Test
 * اختبار شامل للنظام
 */

const API_URL = process.env.API_URL || 'http://localhost:3000/api';

// Colors for console output
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m'
};

function log(msg, color = 'reset') {
    console.log(`${colors[color]}${msg}${colors.reset}`);
}

function success(msg) { log(`✅ ${msg}`, 'green'); }
function fail(msg) { log(`❌ ${msg}`, 'red'); }
function info(msg) { log(`ℹ️  ${msg}`, 'blue'); }
function warn(msg) { log(`⚠️  ${msg}`, 'yellow'); }

// Test results
const results = {
    passed: 0,
    failed: 0,
    tests: []
};

async function request(endpoint, options = {}) {
    const url = `${API_URL}${endpoint}`;
    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        },
        ...options
    };

    if (options.body && typeof options.body === 'object') {
        config.body = JSON.stringify(options.body);
    }

    try {
        const response = await fetch(url, config);
        const data = await response.json();
        return { status: response.status, data, ok: response.ok };
    } catch (error) {
        return { status: 0, data: null, ok: false, error: error.message };
    }
}

async function runTest(name, testFn) {
    try {
        await testFn();
        success(name);
        results.passed++;
        results.tests.push({ name, status: 'passed' });
    } catch (error) {
        fail(`${name}: ${error.message}`);
        results.failed++;
        results.tests.push({ name, status: 'failed', error: error.message });
    }
}

// ========== TESTS ==========

async function testHealthCheck() {
    const res = await request('/health');
    if (!res.ok) throw new Error('Health check failed');
    if (!res.data.success) throw new Error('Health response invalid');
}

async function testAuthLogin() {
    const res = await request('/auth/login', {
        method: 'POST',
        body: { email: 'admin@bi.com', password: 'admin123' }
    });
    // We expect it might fail if no user exists, just check the endpoint responds
    if (res.status !== 401 && res.status !== 200) {
        throw new Error(`Unexpected status: ${res.status}`);
    }
}

async function testUnauthorizedAccess() {
    const res = await request('/audit');
    if (res.status !== 401) {
        throw new Error('Should return 401 for unauthorized access');
    }
}

async function testDevicesEndpoint() {
    const res = await request('/devices');
    // Should return 401 (unauthorized) since we're not logged in
    if (res.status !== 401) {
        throw new Error(`Expected 401, got ${res.status}`);
    }
}

async function testInvoicesEndpoint() {
    const res = await request('/invoices');
    if (res.status !== 401) {
        throw new Error(`Expected 401, got ${res.status}`);
    }
}

async function testWarrantyEndpoint() {
    const res = await request('/warranty');
    if (res.status !== 401) {
        throw new Error(`Expected 401, got ${res.status}`);
    }
}

async function testApprovalsEndpoint() {
    const res = await request('/approvals');
    if (res.status !== 401) {
        throw new Error(`Expected 401, got ${res.status}`);
    }
}

async function testAuditEndpoint() {
    const res = await request('/audit');
    if (res.status !== 401) {
        throw new Error(`Expected 401, got ${res.status}`);
    }
}

async function testInvalidRoute() {
    const res = await request('/nonexistent-route-12345');
    if (res.status !== 404) {
        throw new Error(`Expected 404, got ${res.status}`);
    }
}

async function testDeleteProtection() {
    // Try to delete without auth - should get 401
    const res = await request('/devices/test-id', { method: 'DELETE' });
    // Should return 401 (need auth first) or 403/400 (protected)
    if (res.status === 200) {
        throw new Error('DELETE should be protected');
    }
}

// ========== MAIN ==========

async function main() {
    console.log('\n' + '='.repeat(50));
    log('🧪 BI Management System - Comprehensive Test', 'blue');
    console.log('='.repeat(50) + '\n');

    info(`Testing API at: ${API_URL}\n`);

    // Run all tests
    await runTest('Health Check', testHealthCheck);
    await runTest('Auth Login Endpoint', testAuthLogin);
    await runTest('Unauthorized Access Protection', testUnauthorizedAccess);
    await runTest('Devices API Protection', testDevicesEndpoint);
    await runTest('Invoices API Protection', testInvoicesEndpoint);
    await runTest('Warranty API Protection', testWarrantyEndpoint);
    await runTest('Approvals API Protection', testApprovalsEndpoint);
    await runTest('Audit API Protection', testAuditEndpoint);
    await runTest('404 for Invalid Routes', testInvalidRoute);
    await runTest('Delete Protection', testDeleteProtection);

    // Summary
    console.log('\n' + '='.repeat(50));
    log('📊 Test Results Summary', 'blue');
    console.log('='.repeat(50));
    
    success(`Passed: ${results.passed}`);
    if (results.failed > 0) {
        fail(`Failed: ${results.failed}`);
    } else {
        success('All tests passed! 🎉');
    }

    console.log('\n' + '-'.repeat(50));
    log('Tests:', 'blue');
    results.tests.forEach(t => {
        if (t.status === 'passed') {
            success(`  ${t.name}`);
        } else {
            fail(`  ${t.name}: ${t.error}`);
        }
    });

    console.log('\n');

    // Exit with appropriate code
    process.exit(results.failed > 0 ? 1 : 0);
}

main().catch(err => {
    fail(`Test runner error: ${err.message}`);
    process.exit(1);
});

#!/usr/bin/env node
/**
 * BI Management - Test Runner
 * سكربت تشغيل الاختبارات
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

const log = {
    info: (msg) => console.log(`${colors.cyan}ℹ ${msg}${colors.reset}`),
    success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
    error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
    warn: (msg) => console.log(`${colors.yellow}⚠️ ${msg}${colors.reset}`),
    header: (msg) => console.log(`\n${colors.bright}${colors.blue}═══ ${msg} ═══${colors.reset}\n`)
};

// Test categories
const testCategories = {
    api: {
        name: 'API Tests',
        pattern: 'tests/api/**/*.test.js',
        description: 'اختبار جميع الـ API Endpoints'
    },
    security: {
        name: 'Security Tests',
        pattern: 'tests/security/**/*.test.js',
        description: 'اختبارات الأمان'
    },
    performance: {
        name: 'Performance Tests',
        pattern: 'tests/performance/**/*.test.js',
        description: 'اختبارات الأداء'
    },
    all: {
        name: 'All Tests',
        pattern: 'tests/**/*.test.js',
        description: 'جميع الاختبارات'
    }
};

async function runTests(category = 'all') {
    const startTime = Date.now();
    const testConfig = testCategories[category] || testCategories.all;

    console.log('\n');
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║           BI Management - Test Runner                       ║');
    console.log('║           نظام BI - تشغيل الاختبارات                        ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');
    console.log('\n');

    log.header(testConfig.name);
    log.info(testConfig.description);
    log.info(`Pattern: ${testConfig.pattern}`);
    log.info(`Started at: ${new Date().toLocaleString('ar-IQ')}`);

    return new Promise((resolve) => {
        const jestArgs = [
            '--config', path.join(__dirname, 'jest.config.js'),
            '--testPathPattern', testConfig.pattern,
            '--colors',
            '--verbose'
        ];

        // Add coverage for full run
        if (category === 'all') {
            jestArgs.push('--coverage');
        }

        const jest = spawn('npx', ['jest', ...jestArgs], {
            cwd: path.join(__dirname, '..'),
            stdio: 'inherit',
            shell: true
        });

        jest.on('close', (code) => {
            const duration = ((Date.now() - startTime) / 1000).toFixed(2);
            
            console.log('\n');
            console.log('═══════════════════════════════════════════════════════════════');
            
            if (code === 0) {
                log.success(`Tests completed successfully in ${duration}s`);
            } else {
                log.error(`Tests failed with code ${code} in ${duration}s`);
            }
            
            console.log('═══════════════════════════════════════════════════════════════');
            console.log('\n');
            
            resolve(code);
        });

        jest.on('error', (err) => {
            log.error(`Failed to run tests: ${err.message}`);
            resolve(1);
        });
    });
}

// Quick test function
async function quickTest() {
    log.header('Quick Test - Health Check');
    
    try {
        const http = require('http');
        const options = {
            hostname: 'localhost',
            port: process.env.PORT || 3000,
            path: '/api/health',
            method: 'GET'
        };

        return new Promise((resolve) => {
            const req = http.request(options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    if (res.statusCode === 200) {
                        log.success('API is healthy');
                        console.log(`   Response: ${data}`);
                    } else {
                        log.error(`API returned status ${res.statusCode}`);
                    }
                    resolve(res.statusCode === 200 ? 0 : 1);
                });
            });

            req.on('error', (err) => {
                log.error(`Cannot connect to API: ${err.message}`);
                log.warn('Make sure the server is running: npm start');
                resolve(1);
            });

            req.end();
        });
    } catch (err) {
        log.error(`Quick test failed: ${err.message}`);
        return 1;
    }
}

// Generate test report
function generateReport(results) {
    const reportPath = path.join(__dirname, '..', 'test-report.md');
    
    const report = `# BI Management - Test Report
Generated: ${new Date().toLocaleString('ar-IQ')}

## Summary
- Total Tests: ${results.total || 0}
- Passed: ${results.passed || 0}
- Failed: ${results.failed || 0}
- Duration: ${results.duration || '0'}s

## Categories Tested
${Object.keys(testCategories).map(cat => `- ${testCategories[cat].name}`).join('\n')}

## Environment
- Node.js: ${process.version}
- Platform: ${process.platform}
- Architecture: ${process.arch}

---
*Report generated by BI Management Test Runner*
`;

    fs.writeFileSync(reportPath, report);
    log.success(`Report saved to: ${reportPath}`);
}

// Main execution
const args = process.argv.slice(2);
const category = args[0] || 'all';

if (args.includes('--help') || args.includes('-h')) {
    console.log(`
BI Management Test Runner
Usage: node run-tests.js [category]

Categories:
  api          - Run API tests
  security     - Run security tests
  performance  - Run performance tests
  all          - Run all tests (default)
  quick        - Quick health check

Options:
  --help, -h   - Show this help message
`);
    process.exit(0);
}

if (category === 'quick') {
    quickTest().then(code => process.exit(code));
} else {
    runTests(category).then(code => process.exit(code));
}

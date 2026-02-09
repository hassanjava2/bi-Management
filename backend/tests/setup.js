/**
 * BI Management - Test Setup
 * إعداد بيئة الاختبار
 */

// Set test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_key_for_testing_only';
process.env.PORT = 0; // Random port for tests

// Increase timeout for slow operations
jest.setTimeout(30000);

// Global test utilities
global.testUtils = {
    /**
     * Wait for specified milliseconds
     */
    sleep: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
    
    /**
     * Generate random string
     */
    randomString: (length = 10) => {
        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    },
    
    /**
     * Generate test email
     */
    testEmail: () => `test_${Date.now()}@bimanagement.com`,
    
    /**
     * Generate test phone
     */
    testPhone: () => `07${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`
};

// Console cleanup
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

// Suppress expected warnings during tests
console.error = (...args) => {
    if (args[0]?.includes?.('Warning:') || args[0]?.includes?.('[Permission]')) {
        return;
    }
    originalConsoleError.apply(console, args);
};

console.warn = (...args) => {
    if (args[0]?.includes?.('Warning:')) {
        return;
    }
    originalConsoleWarn.apply(console, args);
};

// Cleanup after all tests
afterAll(async () => {
    // Restore console
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
    
    // Add any global cleanup here
});

// Log test start
beforeAll(() => {
    console.log('\n');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('🧪 BI Management - Test Suite Started');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`   Environment: ${process.env.NODE_ENV}`);
    console.log(`   Time: ${new Date().toLocaleString('ar-IQ')}`);
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('\n');
});

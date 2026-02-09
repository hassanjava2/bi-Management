/**
 * BI Management - Jest Configuration
 * إعدادات Jest للاختبارات
 */

module.exports = {
    // Test environment
    testEnvironment: 'node',
    
    // Root directory
    rootDir: '..',
    
    // Test files pattern
    testMatch: [
        '**/tests/**/*.test.js',
        '**/tests/**/*.spec.js'
    ],
    
    // Setup files
    setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
    
    // Coverage settings
    collectCoverage: true,
    coverageDirectory: '<rootDir>/coverage',
    coverageReporters: ['text', 'lcov', 'html'],
    collectCoverageFrom: [
        'src/**/*.js',
        '!src/config/**',
        '!**/node_modules/**'
    ],
    
    // Coverage thresholds
    coverageThreshold: {
        global: {
            branches: 50,
            functions: 50,
            lines: 50,
            statements: 50
        }
    },
    
    // Timeout
    testTimeout: 30000,
    
    // Verbose output
    verbose: true,
    
    // Force exit after tests complete
    forceExit: true,
    
    // Detect open handles
    detectOpenHandles: true,
    
    // Run tests in serial
    maxWorkers: 1,
    
    // Global variables
    globals: {
        'process.env.NODE_ENV': 'test'
    },

    // Module directories
    moduleDirectories: ['node_modules', 'src'],

    // Transform
    transform: {},

    // Test path ignore patterns
    testPathIgnorePatterns: [
        '/node_modules/'
    ]
};

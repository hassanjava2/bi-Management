/**
 * BI Management - Helper Utilities
 */

const { v4: uuidv4 } = require('uuid');

/**
 * Generate UUID
 */
function generateId() {
    return uuidv4();
}

/**
 * Get current timestamp in ISO format
 */
function now() {
    return new Date().toISOString();
}

/**
 * Get today's date (YYYY-MM-DD)
 */
function today() {
    return new Date().toISOString().split('T')[0];
}

/**
 * Parse JSON safely
 */
function parseJSON(str, defaultValue = null) {
    try {
        return JSON.parse(str);
    } catch {
        return defaultValue;
    }
}

/**
 * Paginate results
 */
function paginate(query, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    return {
        query: `${query} LIMIT ? OFFSET ?`,
        params: [limit, offset]
    };
}

/**
 * Build pagination response
 */
function paginationResponse(data, total, page, limit) {
    return {
        data,
        pagination: {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(total / limit),
            hasNext: page * limit < total,
            hasPrev: page > 1
        }
    };
}

/**
 * Calculate late minutes
 */
function calculateLateMinutes(checkInTime, workStartTime = '09:00') {
    const [startHour, startMin] = workStartTime.split(':').map(Number);
    const checkIn = new Date(checkInTime);
    const startTime = new Date(checkIn);
    startTime.setHours(startHour, startMin, 0, 0);
    
    const diffMs = checkIn - startTime;
    return Math.max(0, Math.floor(diffMs / 60000));
}

/**
 * Calculate work minutes
 */
function calculateWorkMinutes(checkIn, checkOut) {
    if (!checkIn || !checkOut) return 0;
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    return Math.floor((end - start) / 60000);
}

module.exports = {
    generateId,
    now,
    today,
    parseJSON,
    paginate,
    paginationResponse,
    calculateLateMinutes,
    calculateWorkMinutes
};

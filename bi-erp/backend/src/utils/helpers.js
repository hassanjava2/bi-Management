/**
 * BI ERP - Helper utilities
 */

const { v4: uuidv4 } = require('uuid');

function generateId() {
    return uuidv4();
}

function now() {
    return new Date().toISOString();
}

function today() {
    return new Date().toISOString().split('T')[0];
}

function parseJSON(str, defaultValue = null) {
    try {
        return JSON.parse(str);
    } catch {
        return defaultValue;
    }
}

module.exports = {
    generateId,
    now,
    today,
    parseJSON,
};

/**
 * Bi Management Mobile - API Service
 * خدمة الاتصال بالـ Backend
 */

import * as SecureStore from 'expo-secure-store';

// عنوان الـ API - localhost works with adb reverse
const API_URL = __DEV__ 
    ? 'http://127.0.0.1:3000/api'  // Uses adb reverse tcp:3000 tcp:3000
    : 'https://api.bi-management.com/api';

// Token Storage
const TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

// تخزين Token
export const storeToken = async (token, refreshToken) => {
    try {
        await SecureStore.setItemAsync(TOKEN_KEY, token);
        if (refreshToken) {
            await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
        }
    } catch (e) {
        console.error('Error storing token:', e);
    }
};

// جلب Token
export const getToken = async () => {
    try {
        return await SecureStore.getItemAsync(TOKEN_KEY);
    } catch (e) {
        console.error('Error getting token:', e);
        return null;
    }
};

// حذف Token
export const removeToken = async () => {
    try {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
        await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    } catch (e) {
        console.error('Error removing token:', e);
    }
};

// API Request Helper
const request = async (endpoint, options = {}) => {
    const token = await getToken();
    
    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
            ...options.headers,
        },
        ...options,
    };

    if (options.body && typeof options.body === 'object') {
        config.body = JSON.stringify(options.body);
    }

    try {
        console.log(`[API] ${options.method || 'GET'} ${API_URL}${endpoint}`);
        const response = await fetch(`${API_URL}${endpoint}`, config);
        const data = await response.json();

        if (!response.ok) {
            throw { status: response.status, ...data };
        }

        return data;
    } catch (error) {
        console.error(`API Error [${endpoint}]:`, error);
        throw error;
    }
};

// ========== Auth API ==========
export const authAPI = {
    login: (email, password) => 
        request('/auth/login', {
            method: 'POST',
            body: { email, password }
        }),
    
    logout: () => request('/auth/logout', { method: 'POST' }),
    
    me: () => request('/auth/me'),
    
    refreshToken: (refreshToken) =>
        request('/auth/refresh-token', {
            method: 'POST',
            body: { refresh_token: refreshToken }
        }),
};

// ========== Tasks API ==========
export const tasksAPI = {
    getMyTasks: (status) => 
        request(`/tasks/my-tasks${status ? `?status=${status}` : ''}`),
    
    getTask: (id) => request(`/tasks/${id}`),
    
    updateTask: (id, data) =>
        request(`/tasks/${id}`, {
            method: 'PUT',
            body: data
        }),
    
    updateStatus: (id, status, comment) =>
        request(`/tasks/${id}/status`, {
            method: 'PUT',
            body: { status, comment }
        }),
    
    addComment: (id, comment) =>
        request(`/tasks/${id}/comments`, {
            method: 'POST',
            body: { content: comment }
        }),
    
    getTodayTasks: () => request('/tasks/today'),
};

// ========== Attendance API ==========
export const attendanceAPI = {
    checkIn: (latitude, longitude) =>
        request('/attendance/check-in', {
            method: 'POST',
            body: { latitude, longitude }
        }),
    
    checkOut: (latitude, longitude) =>
        request('/attendance/check-out', {
            method: 'POST',
            body: { latitude, longitude }
        }),
    
    getStatus: () => request('/attendance/status'),
    
    getMyAttendance: (month, year) => {
        // Calculate from_date and to_date from month/year
        const from_date = `${year}-${String(month).padStart(2, '0')}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const to_date = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;
        return request(`/attendance/my-record?from_date=${from_date}&to_date=${to_date}`);
    },
    
    getStats: () => request('/attendance/stats'),
};

// ========== Notifications API ==========
export const notificationsAPI = {
    getAll: (page = 1) => request(`/notifications?page=${page}`),
    
    markAsRead: (id) =>
        request(`/notifications/${id}/read`, { method: 'PUT' }),
    
    markAllRead: () =>
        request('/notifications/read-all', { method: 'PUT' }),
    
    getUnreadCount: () => request('/notifications/unread-count'),
    
    registerPushToken: (token) =>
        request('/notifications/register-device', {
            method: 'POST',
            body: { push_token: token, platform: 'expo' }
        }),
};

// ========== AI Chat API ==========
export const aiAPI = {
    sendMessage: (message, conversationId) =>
        request('/ai/chat', {
            method: 'POST',
            body: { message, conversation_id: conversationId }
        }),
    
    getConversations: () => request('/ai/conversations'),
    
    getConversation: (id) => request(`/ai/conversations/${id}`),
    
    // توليد المهام التلقائي من AI
    generateTask: (description, context = {}) =>
        request('/ai/tasks/generate', {
            method: 'POST',
            body: { description, context }
        }),
    
    // اقتراح تعيين مهمة لموظف
    suggestAssignment: (taskDescription) =>
        request('/ai/tasks/suggest-assignment', {
            method: 'POST',
            body: { task_description: taskDescription }
        }),
    
    // تحليل أداء موظف
    analyzePerformance: (employeeId) =>
        request(`/ai/performance/${employeeId}`, {
            method: 'POST'
        }),
};

// ========== Goals API ==========
export const goalsAPI = {
    getMyPoints: () => request('/goals/my-points'),
    getLeaderboard: () => request('/goals/leaderboard'),
    getMyBadges: () => request('/goals/my-badges'),
};

// ========== Profile API ==========
export const profileAPI = {
    getProfile: () => request('/auth/me'),
    updateProfile: (data) =>
        request('/auth/update-profile', {
            method: 'PUT',
            body: data
        }),
};

// ========== Devices API ==========
export const devicesAPI = {
    getAll: (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return request(`/devices${query ? `?${query}` : ''}`);
    },
    
    getBySerial: (serial) => request(`/devices/${serial}`),
    
    create: (data) =>
        request('/devices', {
            method: 'POST',
            body: data
        }),
    
    update: (id, data) =>
        request(`/devices/${id}`, {
            method: 'PATCH',
            body: data
        }),
    
    transfer: (id, toWarehouse, reason) =>
        request(`/devices/${id}/transfer`, {
            method: 'POST',
            body: { to_warehouse_id: toWarehouse, reason }
        }),
    
    // تسجيل/إرجاع الذمة بالمسح
    takeCustody: (id, reason) =>
        request(`/devices/${id}/custody`, {
            method: 'POST',
            body: { action: 'take', reason }
        }),
    
    returnCustody: (id) =>
        request(`/devices/${id}/custody`, {
            method: 'POST',
            body: { action: 'return' }
        }),
    
    getHistory: (id) => request(`/devices/${id}/history`),
    
    // طلب حذف
    requestDeletion: (id, reason) =>
        request(`/devices/${id}/request-deletion`, {
            method: 'POST',
            body: { reason }
        }),
    
    // مسح الباركود
    scan: (serial) => request(`/devices/${serial}`),
};

// ========== Approvals API ==========
export const approvalsAPI = {
    getPending: () => request('/approvals?status=pending'),
    
    getAll: (status) => 
        request(`/approvals${status ? `?status=${status}` : ''}`),
    
    getById: (id) => request(`/approvals/${id}`),
    
    approve: (id, notes) =>
        request(`/approvals/${id}/approve`, {
            method: 'POST',
            body: { notes }
        }),
    
    reject: (id, reason) =>
        request(`/approvals/${id}/reject`, {
            method: 'POST',
            body: { reason }
        }),
    
    // طلب موافقة جديد
    requestDeletion: (entityType, entityId, entityName, reason) =>
        request('/approvals/deletion', {
            method: 'POST',
            body: { entity_type: entityType, entity_id: entityId, entity_name: entityName, reason }
        }),
    
    requestQuantityCorrection: (entityType, entityId, entityName, oldQty, newQty, reason) =>
        request('/approvals/quantity', {
            method: 'POST',
            body: { 
                entity_type: entityType, 
                entity_id: entityId, 
                entity_name: entityName,
                old_quantity: oldQty,
                new_quantity: newQty,
                reason 
            }
        }),
    
    getMyRequests: () => request('/approvals/my/requests'),
};

// ========== Warranty API ==========
export const warrantyAPI = {
    getAll: (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return request(`/warranty${query ? `?${query}` : ''}`);
    },
    
    getPending: () => request('/warranty?status=pending'),
    
    getById: (id) => request(`/warranty/${id}`),
    
    create: (data) =>
        request('/warranty', {
            method: 'POST',
            body: data
        }),
    
    sendToSupplier: (id, notes) =>
        request(`/warranty/${id}/send`, {
            method: 'POST',
            body: { notes }
        }),
    
    recordResponse: (id, decision, notes, repairCost = 0, partsCost = 0) =>
        request(`/warranty/${id}/response`, {
            method: 'POST',
            body: { decision, notes, repair_cost: repairCost, parts_cost: partsCost }
        }),
    
    notifyCustomer: (id, method, message) =>
        request(`/warranty/${id}/notify-customer`, {
            method: 'POST',
            body: { method, message }
        }),
    
    close: (id, notes) =>
        request(`/warranty/${id}/close`, {
            method: 'POST',
            body: { notes }
        }),
    
    getTracking: (id) => request(`/warranty/${id}/tracking`),
    
    getStats: () => request('/warranty/meta/stats'),
};

// ========== Audit API ==========
export const auditAPI = {
    search: (filters) => {
        const query = new URLSearchParams(filters).toString();
        return request(`/audit${query ? `?${query}` : ''}`);
    },
    
    getStats: (days = 7) => request(`/audit/stats?days=${days}`),
    
    getForEntity: (type, id) => request(`/audit/entity/${type}/${id}`),
    
    getCritical: () => request('/audit/critical'),
};

// ========== Invoices API ==========
export const invoicesAPI = {
    getAll: (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return request(`/invoices${query ? `?${query}` : ''}`);
    },
    
    getById: (id) => request(`/invoices/${id}`),
    
    create: (data) =>
        request('/invoices', {
            method: 'POST',
            body: data
        }),
    
    update: (id, data) =>
        request(`/invoices/${id}`, {
            method: 'PATCH',
            body: data
        }),
    
    cancel: (id, reason) =>
        request(`/invoices/${id}/cancel`, {
            method: 'POST',
            body: { reason }
        }),
};

export default {
    authAPI,
    tasksAPI,
    attendanceAPI,
    notificationsAPI,
    aiAPI,
    goalsAPI,
    profileAPI,
    devicesAPI,
    approvalsAPI,
    warrantyAPI,
    auditAPI,
    invoicesAPI,
};

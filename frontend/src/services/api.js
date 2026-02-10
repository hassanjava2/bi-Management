import axios from 'axios'

const API_URL = '/api'

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor - add token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Auth API
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  changePassword: (data) => api.post('/auth/change-password', data),
}

// Dashboard API
export const dashboardAPI = {
  getStats: () => api.get('/dashboard'),
}

// Reports API (لوحة المدير التنفيذية والتقارير)
export const reportsAPI = {
  getExecutiveDashboard: () => api.get('/reports/executive-dashboard'),
  getProfitability: (params) => api.get('/reports/profitability', { params }),
  getCashFlow: (params) => api.get('/reports/cash-flow', { params }),
  getHRSummary: (params) => api.get('/reports/hr-summary', { params }),
  exportReport: (reportType, params) => api.get(`/reports/export/${reportType}`, { params, responseType: 'blob' }),
}

// Users API
export const usersAPI = {
  getAll: (params) => api.get('/users', { params }),
  getById: (id) => api.get(`/users/${id}`),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
  getTasks: (id) => api.get(`/users/${id}/tasks`),
}

// Tasks API
export const tasksAPI = {
  getAll: (params) => api.get('/tasks', { params }),
  getById: (id) => api.get(`/tasks/${id}`),
  create: (data) => api.post('/tasks', data),
  update: (id, data) => api.put(`/tasks/${id}`, data),
  updateStatus: (id, data) => api.put(`/tasks/${id}/status`, data),
  addComment: (id, data) => api.post(`/tasks/${id}/comments`, data),
  delete: (id) => api.delete(`/tasks/${id}`),
  getMyTasks: () => api.get('/tasks/my-tasks'),
  getStats: () => api.get('/tasks/stats'),
}

// Attendance API
export const attendanceAPI = {
  checkIn: (data) => api.post('/attendance/check-in', data),
  checkOut: (data) => api.post('/attendance/check-out', data),
  getToday: () => api.get('/attendance/today'),
  getMyRecord: (params) => api.get('/attendance/my-record', { params }),
  getReport: (params) => api.get('/attendance/report', { params }),
  getStats: () => api.get('/attendance/stats'),
}

// Notifications API
export const notificationsAPI = {
  getAll: (params) => api.get('/notifications', { params }),
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/read-all'),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  delete: (id) => api.delete(`/notifications/${id}`),
}

// AI API
export const aiAPI = {
  chat: (data) => api.post('/ai/chat', data),
  getConversations: (params) => api.get('/ai/conversations', { params }),
  getMessages: (conversationId, params) => api.get(`/ai/conversations/${conversationId}/messages`, { params }),
  suggestTask: (data) => api.post('/ai/tasks/suggest', data),
  createTaskFromProblem: (data) => api.post('/ai/tasks/from-problem', data),
  confirmTask: (data) => api.post('/ai/tasks/confirm', data),
  analyzeEmployee: (id) => api.post(`/ai/analyze/employee/${id}`),
  analyzeAttendance: (data) => api.post('/ai/analyze/attendance', data),
}

// Goals API
export const goalsAPI = {
  getMyPoints: () => api.get('/goals/my-points'),
  getMyHistory: (params) => api.get('/goals/my-history', { params }),
  getMyStats: (params) => api.get('/goals/my-stats', { params }),
  getMyBadges: () => api.get('/goals/my-badges'),
  getLeaderboard: (params) => api.get('/goals/leaderboard', { params }),
  getRewards: () => api.get('/goals/rewards'),
  redeemReward: (id) => api.post(`/goals/rewards/${id}/redeem`),
  getLevels: () => api.get('/goals/levels'),
  // Admin
  awardPoints: (data) => api.post('/goals/award', data),
  deductPoints: (data) => api.post('/goals/deduct', data),
  getUserPoints: (id) => api.get(`/goals/user/${id}`),
}

// Training API
export const trainingAPI = {
  getMyProgress: () => api.get('/training/my-progress'),
  getTodayTasks: () => api.get('/training/today-tasks'),
  completeTask: (index, data) => api.post(`/training/complete-task/${index}`, data),
  // HR/Admin
  startTraining: (employeeId) => api.post(`/training/start/${employeeId}`),
  getReport: () => api.get('/training/report'),
  getEmployeeProgress: (id) => api.get(`/training/employee/${id}`),
  getPlans: () => api.get('/training/plans'),
  createPlan: (data) => api.post('/training/plans', data),
}

// ============================================
// ERP MODULES APIs
// ============================================

// Inventory API - إدارة المخزون
export const inventoryAPI = {
  // Devices
  getDevices: (params) => api.get('/inventory/devices', { params }),
  getDevice: (id) => api.get(`/inventory/devices/${id}`),
  createDevice: (data) => api.post('/inventory/devices', data),
  updateDevice: (id, data) => api.put(`/inventory/devices/${id}`, data),
  deleteDevice: (id) => api.delete(`/inventory/devices/${id}`),
  getDeviceHistory: (id) => api.get(`/inventory/devices/${id}/history`),
  transferDevice: (id, data) => api.post(`/inventory/devices/${id}/transfer`, data),
  updateCustody: (id, data) => api.post(`/inventory/devices/${id}/custody`, data),
  
  // Products
  getProducts: (params) => api.get('/inventory/products', { params }),
  getProduct: (id) => api.get(`/inventory/products/${id}`),
  createProduct: (data) => api.post('/inventory/products', data),
  updateProduct: (id, data) => api.put(`/inventory/products/${id}`, data),
  
  // Warehouses
  getWarehouses: () => api.get('/inventory/warehouses'),
  getWarehouseStats: (id) => api.get(`/inventory/warehouses/${id}/stats`),
  
  // Parts & Accessories
  getParts: (params) => api.get('/inventory/parts', { params }),
  createPart: (data) => api.post('/inventory/parts', data),
  updatePart: (id, data) => api.put(`/inventory/parts/${id}`, data),
  
  // Movements
  getMovements: (params) => api.get('/inventory/movements', { params }),

  // Stats
  getStats: () => api.get('/inventory/stats'),
  getLowStock: () => api.get('/inventory/low-stock'),
  
  // Serial Generation
  generateSerial: () => api.post('/inventory/generate-serial'),
}

// Sales API - إدارة المبيعات
export const salesAPI = {
  // Invoices
  getInvoices: (params) => api.get('/invoices', { params }),
  getInvoice: (id) => api.get(`/invoices/${id}`),
  createInvoice: (data) => api.post('/invoices', data),
  updateInvoice: (id, data) => api.put(`/invoices/${id}`, data),
  cancelInvoice: (id, data) => api.post(`/invoices/${id}/cancel`, data),
  printInvoice: (id) => api.get(`/invoices/${id}/print`),
  transitionInvoice: (id, data) => api.post(`/invoices/${id}/transition`, data),
  prepareInvoice: (id) => api.post(`/invoices/${id}/prepare`),
  convertInvoiceToActive: (id) => api.post(`/invoices/${id}/convert-to-active`),
  
  // Invoice Types
  createSaleInvoice: (data) => api.post('/invoices/sale', data),
  createPurchaseInvoice: (data) => api.post('/invoices/purchase', data),
  createReturnInvoice: (data) => api.post('/invoices/return', data),
  createExchangeInvoice: (data) => api.post('/invoices/exchange', data),
  createInstallmentInvoice: (data) => api.post('/invoices/installment', data),
  
  // Stats
  getStats: () => api.get('/sales/stats'),
  getDailyReport: (date) => api.get('/sales/daily-report', { params: { date } }),
  getMonthlyReport: (month, year) => api.get('/sales/monthly-report', { params: { month, year } }),
  
  // Installments
  getInstallmentStats: () => api.get('/sales/installments/stats'),
  getPendingTransfers: () => api.get('/sales/installments/pending-transfers'),
  confirmTransfer: (id, data) => api.post(`/sales/installments/${id}/confirm-transfer`, data),
}

// Returns API - تتبع المرتجعات
export const returnsAPI = {
  getReturns: (params) => api.get('/returns', { params }),
  getReturn: (id) => api.get(`/returns/${id}`),
  createReturn: (data) => api.post('/returns', data),
  updateReturn: (id, data) => api.put(`/returns/${id}`, data),
  updateStatus: (id, data) => api.post(`/returns/${id}/status`, data),
  addFollowUp: (id, data) => api.post(`/returns/${id}/follow-up`, data),
  receiveReturn: (id, data) => api.post(`/returns/${id}/receive`, data),
  
  // Stats & Alerts
  getStats: () => api.get('/returns/stats'),
  getAlerts: () => api.get('/returns/alerts'),
  getOverdue: () => api.get('/returns/overdue'),
  
  // Reminders
  sendReminder: (id) => api.post(`/returns/${id}/reminder`),
  sendBulkReminder: (data) => api.post('/returns/bulk-reminder', data),
}

// Accounting API - المحاسبة والمالية
export const accountingAPI = {
  // Overview
  getOverview: (params) => api.get('/accounting/overview', { params }),
  
  // Vouchers
  getVouchers: (params) => api.get('/accounting/vouchers', { params }),
  createVoucher: (data) => api.post('/accounting/vouchers', data),
  
  // Receivables (ذمم العملاء)
  getReceivables: (params) => api.get('/accounting/receivables', { params }),
  getReceivableByCustomer: (id) => api.get(`/accounting/receivables/customer/${id}`),
  
  // Payables (ذمم الموردين)
  getPayables: (params) => api.get('/accounting/payables', { params }),
  getPayableBySupplier: (id) => api.get(`/accounting/payables/supplier/${id}`),
  
  // Cash Boxes
  getCashBoxes: () => api.get('/accounting/cash-boxes'),
  getCashBoxBalance: (id) => api.get(`/accounting/cash-boxes/${id}`),
  transferCash: (data) => api.post('/accounting/cash-boxes/transfer', data),
  
  // Expenses
  getExpenses: (params) => api.get('/accounting/expenses', { params }),
  createExpense: (data) => api.post('/accounting/expenses', data),
  
  // Reports
  getProfitLoss: (params) => api.get('/accounting/reports/profit-loss', { params }),
  getCashFlow: (params) => api.get('/accounting/reports/cash-flow', { params }),
  getDebtReport: (params) => api.get('/accounting/reports/debts', { params }),

  // Account Statements - كشوفات الحسابات
  getStatement: (entityType, entityId) => api.get(`/accounting/statement/${entityType}/${entityId}`),

  // Daily Reconciliation - المطابقة اليومية
  getReconciliation: (date) => api.get(`/accounting/reconciliation`, { params: { date } }),
}

// Suppliers API - إدارة الموردين
export const suppliersAPI = {
  getSuppliers: (params) => api.get('/suppliers', { params }),
  getSupplier: (id) => api.get(`/suppliers/${id}`),
  createSupplier: (data) => api.post('/suppliers', data),
  updateSupplier: (id, data) => api.put(`/suppliers/${id}`, data),
  deleteSupplier: (id) => api.delete(`/suppliers/${id}`),
  
  // Transactions
  getTransactions: (id, params) => api.get(`/suppliers/${id}/transactions`, { params }),
  getReturns: (id, params) => api.get(`/suppliers/${id}/returns`, { params }),
  
  // Stats
  getStats: (id) => api.get(`/suppliers/${id}/stats`),
}

// Customers API - إدارة العملاء
export const customersAPI = {
  getCustomers: (params) => api.get('/customers', { params }),
  getCustomer: (id) => api.get(`/customers/${id}`),
  createCustomer: (data) => api.post('/customers', data),
  updateCustomer: (id, data) => api.put(`/customers/${id}`, data),
  deleteCustomer: (id) => api.delete(`/customers/${id}`),
  
  // Transactions
  getTransactions: (id, params) => api.get(`/customers/${id}/transactions`, { params }),
  getInvoices: (id, params) => api.get(`/customers/${id}/invoices`, { params }),
  
  // Balance
  adjustBalance: (id, data) => api.post(`/customers/${id}/adjust-balance`, data),
  
  // Stats
  getStats: () => api.get('/customers/stats'),
}

// Warranty API - الضمان والصيانة
export const warrantyAPI = {
  getClaims: (params) => api.get('/warranty', { params }),
  getList: (params) => api.get('/warranty', { params }),
  getClaim: (id) => api.get(`/warranty/${id}`),
  createClaim: (data) => api.post('/warranty/claims', data),
  updateClaim: (id, data) => api.put(`/warranty/claims/${id}`, data),
  closeClaim: (id, data) => api.post(`/warranty/claims/${id}/close`, data),
  
  // Repair Orders
  getRepairOrders: (params) => api.get('/warranty/repairs', { params }),
  createRepairOrder: (data) => api.post('/warranty/repairs', data),
  updateRepairOrder: (id, data) => api.put(`/warranty/repairs/${id}`, data),
}

// Approvals API - الموافقات
export const approvalsAPI = {
  getList: (params) => api.get('/approvals', { params }),
  getOne: (id) => api.get(`/approvals/${id}`),
  approve: (id, data) => api.post(`/approvals/${id}/approve`, data),
  reject: (id, data) => api.post(`/approvals/${id}/reject`, data),
  getMyRequests: () => api.get('/approvals/my/requests'),
  getMetaTypes: () => api.get('/approvals/meta/types'),
}

// Delivery API - التوصيل
export const deliveryAPI = {
  getDeliveries: (params) => api.get('/delivery', { params }),
  getDelivery: (id) => api.get(`/delivery/${id}`),
  createDelivery: (data) => api.post('/delivery', data),
  updateDelivery: (id, data) => api.put(`/delivery/${id}`, data),
  updateStatus: (id, data) => api.post(`/delivery/${id}/status`, data),
  
  // Tracking
  trackDelivery: (trackingNumber) => api.get(`/delivery/track/${trackingNumber}`),
  
  // Stats
  getStats: () => api.get('/delivery/stats'),
  getPending: () => api.get('/delivery/pending'),
}

// Settings API - الإعدادات
export const settingsAPI = {
  getAll: () => api.get('/settings'),
  getByKey: (key) => api.get(`/settings/${key}`),
  getByCategory: (category) => api.get(`/settings/category/${category}`),
  update: (key, value) => api.put(`/settings/${key}`, { value }),
}

export default api

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
  getStats: () => api.get('/dashboard/stats'),
  getTaskStats: () => api.get('/dashboard'),
  getChart: () => api.get('/dashboard/chart'),
  getAnalytics: (type) => api.get(`/dashboard/analytics/${type}`),
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
  /** اقتراح مهام من وصف مشكلة (للمدير) */
  suggestTasksFromProblem: (description) => api.post('/ai/problems/suggest-tasks', { description }),
  /** تأكيد إنشاء المهمة المقترحة من المحادثة */
  confirmTaskFromChat: (taskData) => api.post('/ai/tasks/confirm-from-chat', taskData),
  createTaskFromProblem: (data) => api.post('/ai/tasks/from-problem', data),
  confirmTask: (data) => api.post('/ai/tasks/confirm', data),
  analyzeEmployee: (id) => api.post(`/ai/analyze/employee/${id}`),
  analyzeAttendance: (data) => api.post('/ai/analyze/attendance', data),
  /** للمدير: قائمة كل دردشات الموظفين مع الذكاء */
  adminConversations: (params) => api.get('/ai/admin/conversations', { params }),
  /** للمدير: تفاصيل محادثة واحدة */
  adminConversationDetail: (conversationId) => api.get(`/ai/admin/conversations/${conversationId}`),
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
  scanDevice: (code) => api.get(`/devices/scan/${encodeURIComponent(code)}`),

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
  createConsumedInvoice: (data) => api.post('/invoices/consumed', data),
  getConsumedInvoices: (params) => api.get('/invoices/consumed/list', { params }),
  createDamagedInvoice: (data) => api.post('/invoices/damaged', data),
  getDamagedInvoices: (params) => api.get('/invoices/damaged/list', { params }),
  createQuoteInvoice: (data) => api.post('/invoices/quote', data),
  getQuoteInvoices: (params) => api.get('/invoices/quote/list', { params }),
  convertQuoteToSale: (id) => api.post(`/invoices/quote/${id}/convert-to-sale`),

  // Pricing
  getProductPrices: (productId) => api.get(`/invoices/pricing/${productId}`),
  setProductPrice: (productId, data) => api.post(`/invoices/pricing/${productId}`, data),
  bulkSetPrices: (productId, prices) => api.post(`/invoices/pricing/${productId}/bulk`, { prices }),
  resolveItemPrice: (productId, customerId) => api.get(`/invoices/pricing/resolve/${productId}/${customerId}`),

  // Workflow
  auditInvoice: (id) => api.put(`/invoices/${id}/audit`),
  confirmInvoice: (id) => api.post(`/invoices/${id}/confirm`),

  // Expenses
  getExpenses: (id) => api.get(`/invoices/${id}/expenses`),
  addExpense: (id, data) => api.post(`/invoices/${id}/expenses`, data),
  deleteExpense: (expenseId) => api.delete(`/invoices/expenses/${expenseId}`),

  // History
  getInvoiceHistory: (id) => api.get(`/invoices/${id}/history`),

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
  getVoucher: (id) => api.get(`/accounting/vouchers/${id}`),
  getVoucherStats: () => api.get('/accounting/vouchers/stats'),
  createVoucher: (data) => api.post('/accounting/vouchers', data),
  createReceipt: (data) => api.post('/accounting/vouchers/receipt', data),
  createPayment: (data) => api.post('/accounting/vouchers/payment', data),
  createExpenseVoucher: (data) => api.post('/accounting/vouchers/expense', data),
  createExchange: (data) => api.post('/accounting/vouchers/exchange', data),
  createHawala: (data) => api.post('/accounting/vouchers/hawala', data),
  createJournal: (data) => api.post('/accounting/vouchers/journal', data),
  cancelVoucher: (id, reason) => api.post(`/accounting/vouchers/${id}/cancel`, { reason }),

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
  getStatement: (entityType, entityId, params) => api.get(`/accounting/statement/${entityType}/${entityId}`, { params }),

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

// HR API - الموارد البشرية
export const hrAPI = {
  // Stats
  getStats: () => api.get('/hr/stats'),
  // Departments
  getDepartments: () => api.get('/hr/departments'),
  getDepartment: (id) => api.get(`/hr/departments/${id}`),
  createDepartment: (data) => api.post('/hr/departments', data),
  updateDepartment: (id, data) => api.put(`/hr/departments/${id}`, data),
  deleteDepartment: (id) => api.delete(`/hr/departments/${id}`),
  // Leaves
  getLeaves: (params) => api.get('/hr/leaves', { params }),
  getLeaveStats: () => api.get('/hr/leaves/stats'),
  getLeaveTypes: () => api.get('/hr/leaves/types'),
  getLeaveBalance: (userId) => api.get(`/hr/leaves/balance/${userId}`),
  createLeave: (data) => api.post('/hr/leaves', data),
  approveLeave: (id) => api.post(`/hr/leaves/${id}/approve`),
  rejectLeave: (id, reason) => api.post(`/hr/leaves/${id}/reject`, { reason }),
  // Advances
  getAdvances: (params) => api.get('/hr/advances', { params }),
  createAdvance: (data) => api.post('/hr/advances', data),
  approveAdvance: (id) => api.post(`/hr/advances/${id}/approve`),
  rejectAdvance: (id) => api.post(`/hr/advances/${id}/reject`),
  // Payroll
  getPayroll: (params) => api.get('/hr/payroll', { params }),
  getPayrollSummary: (period) => api.get(`/hr/payroll/summary/${period}`),
  generatePayroll: (period) => api.post('/hr/payroll/generate', { period }),
  approvePayroll: (id) => api.post(`/hr/payroll/${id}/approve`),
  payPayroll: (id, method) => api.post(`/hr/payroll/${id}/pay`, { method }),
  // Schedules
  getSchedules: () => api.get('/hr/schedules'),
  createSchedule: (data) => api.post('/hr/schedules', data),
  updateSchedule: (id, data) => api.put(`/hr/schedules/${id}`, data),
  deleteSchedule: (id) => api.delete(`/hr/schedules/${id}`),
  // Employee profiles
  getProfile: (id) => api.get(`/hr/employees/${id}/profile`),
  updateProfile: (id, data) => api.put(`/hr/employees/${id}/hr`, data),
}

// Currency API
export const currencyAPI = {
  list: () => api.get('/currencies'),
  create: (data) => api.post('/currencies', data),
  update: (id, data) => api.put(`/currencies/${id}`, data),
  setDefault: (id) => api.put(`/currencies/${id}/default`),
  delete: (id) => api.delete(`/currencies/${id}`),
  // Exchange rates
  getExchangeRates: (params) => api.get('/exchange-rates', { params }),
  setExchangeRate: (data) => api.post('/exchange-rates', data),
  convert: (amount, from, to) => api.get('/exchange-rates/convert', { params: { amount, from, to } }),
}

// Unit API
export const unitAPI = {
  list: () => api.get('/units'),
  create: (data) => api.post('/units', data),
  update: (id, data) => api.put(`/units/${id}`, data),
  delete: (id) => api.delete(`/units/${id}`),
  // Product units
  getProductUnits: (productId) => api.get(`/products/${productId}/units`),
  setProductUnit: (productId, data) => api.post(`/products/${productId}/units`, data),
  removeProductUnit: (productId, unitId) => api.delete(`/products/${productId}/units/${unitId}`),
}

// Customer Type API
export const customerTypeAPI = {
  list: () => api.get('/customer-types'),
  create: (data) => api.post('/customer-types', data),
  update: (id, data) => api.put(`/customer-types/${id}`, data),
}

// Product Prices API
export const productPriceAPI = {
  getPrices: (productId) => api.get(`/products/${productId}/prices`),
  setPrice: (productId, data) => api.post(`/products/${productId}/prices`, data),
  getPriceForType: (productId, typeId, currency) => api.get(`/products/${productId}/price-for-type/${typeId}`, { params: { currency } }),
}

// Audit Log API
export const auditAPI = {
  getRecent: (params) => api.get('/audit-log', { params }),
  getHistory: (entityType, entityId) => api.get(`/audit-log/${entityType}/${entityId}`),
}

export default api


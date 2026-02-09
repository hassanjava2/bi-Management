import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { SocketProvider } from './context/SocketContext'
import { PermissionProvider, Can } from './hooks/usePermission'
import Layout from './components/layout/Layout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import ExecutiveDashboardPage from './pages/ExecutiveDashboardPage'
import ApprovalsPage from './pages/ApprovalsPage'
import DeliveryPage from './pages/DeliveryPage'
import WarrantyPage from './pages/WarrantyPage'
import ReportsPage from './pages/ReportsPage'
import EmployeesPage from './pages/EmployeesPage'
import TasksPage from './pages/TasksPage'
import AttendancePage from './pages/AttendancePage'
import NotificationsPage from './pages/NotificationsPage'
import GoalsPage from './pages/GoalsPage'
import TrainingPage from './pages/TrainingPage'
import PermissionsPage from './pages/PermissionsPage'
import AuditPage from './pages/AuditPage'
import SettingsPage from './pages/SettingsPage'
import BotDashboard from './pages/BotDashboard'
// الصفحات الجديدة - ERP كامل
import InventoryPage from './pages/InventoryPage'
import SalesPage from './pages/SalesPage'
import NewInvoicePage from './pages/NewInvoicePage'
import WaitingInvoicesPage from './pages/WaitingInvoicesPage'
import RepDashboardPage from './pages/RepDashboardPage'
import CalculatorPage from './pages/CalculatorPage'
import FixedAssetsPage from './pages/FixedAssetsPage'
import SharesPage from './pages/SharesPage'
import PurchasesPage from './pages/PurchasesPage'
import ReturnsPage from './pages/ReturnsPage'
import AccountingPage from './pages/AccountingPage'
import SuppliersPage from './pages/SuppliersPage'
import CustomersPage from './pages/CustomersPage'
import Spinner from './components/common/Spinner'

// Protected Route Component مع نظام الصلاحيات
function ProtectedRoute({ children, permission }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-slate-600 dark:text-slate-400">جاري التحميل...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return (
    <SocketProvider>
      <PermissionProvider>
        {permission ? (
          <Can permission={permission} fallback={<AccessDenied />}>
            {children}
          </Can>
        ) : (
          children
        )}
      </PermissionProvider>
    </SocketProvider>
  )
}

// صفحة رفض الوصول
function AccessDenied() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center">
        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
          <svg className="w-10 h-10 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">غير مصرح</h2>
        <p className="text-slate-600 dark:text-slate-400">ليس لديك صلاحية للوصول لهذه الصفحة</p>
      </div>
    </div>
  )
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      
      <Route path="/" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="executive-dashboard" element={<ExecutiveDashboardPage />} />
        <Route path="approvals" element={<ApprovalsPage />} />
        <Route path="delivery" element={<DeliveryPage />} />
        <Route path="warranty" element={<WarrantyPage />} />
        <Route path="reports" element={<ReportsPage />} />
        
        {/* ERP Routes */}
        <Route path="inventory" element={<InventoryPage />} />
        <Route path="sales" element={<SalesPage />} />
        <Route path="sales/new" element={<NewInvoicePage />} />
        <Route path="sales/waiting" element={<WaitingInvoicesPage />} />
        <Route path="rep-dashboard" element={<RepDashboardPage />} />
        <Route path="calculator" element={<CalculatorPage />} />
        <Route path="fixed-assets" element={<FixedAssetsPage />} />
        <Route path="shares" element={<SharesPage />} />
        <Route path="purchases" element={<PurchasesPage />} />
        <Route path="purchases/new" element={<NewInvoicePage />} />
        <Route path="returns" element={<ReturnsPage />} />
        <Route path="accounting" element={<AccountingPage />} />
        <Route path="suppliers" element={<SuppliersPage />} />
        <Route path="customers" element={<CustomersPage />} />
        
        {/* HR Routes */}
        <Route path="employees" element={<EmployeesPage />} />
        <Route path="tasks" element={<TasksPage />} />
        <Route path="attendance" element={<AttendancePage />} />
        <Route path="goals" element={<GoalsPage />} />
        <Route path="training" element={<TrainingPage />} />
        
        {/* Admin Routes */}
        <Route path="permissions" element={<PermissionsPage />} />
        <Route path="audit" element={<AuditPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="bot" element={<BotDashboard />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default App

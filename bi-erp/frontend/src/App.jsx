import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { SocketProvider } from './context/SocketContext'
import { PermissionProvider, Can } from './hooks/usePermission'
import Layout from './components/layout/Layout'
import Spinner from './components/common/Spinner'
import { ErrorBoundary } from './components/common/ErrorBoundary'

const LoginPage = lazy(() => import('./pages/LoginPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const ExecutiveDashboardPage = lazy(() => import('./pages/ExecutiveDashboardPage'))
const ApprovalsPage = lazy(() => import('./pages/ApprovalsPage'))
const DeliveryPage = lazy(() => import('./pages/DeliveryPage'))
const WarrantyPage = lazy(() => import('./pages/WarrantyPage'))
const ReportsPage = lazy(() => import('./pages/ReportsPage'))
const EmployeesPage = lazy(() => import('./pages/EmployeesPage'))
const TasksPage = lazy(() => import('./pages/TasksPage'))
const AttendancePage = lazy(() => import('./pages/AttendancePage'))
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'))
const GoalsPage = lazy(() => import('./pages/GoalsPage'))
const TrainingPage = lazy(() => import('./pages/TrainingPage'))
const PermissionsPage = lazy(() => import('./pages/PermissionsPage'))
const AuditPage = lazy(() => import('./pages/AuditPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const BotDashboard = lazy(() => import('./pages/BotDashboard'))
const AIDistributionPage = lazy(() => import('./pages/AIDistributionPage'))
const AIChatsPage = lazy(() => import('./pages/AIChatsPage'))
const InventoryPage = lazy(() => import('./pages/InventoryPage'))
const SalesPage = lazy(() => import('./pages/SalesPage'))
const NewInvoicePage = lazy(() => import('./pages/NewInvoicePage'))
const WaitingInvoicesPage = lazy(() => import('./pages/WaitingInvoicesPage'))
const RepDashboardPage = lazy(() => import('./pages/RepDashboardPage'))
const CalculatorPage = lazy(() => import('./pages/CalculatorPage'))
const FixedAssetsPage = lazy(() => import('./pages/FixedAssetsPage'))
const SharesPage = lazy(() => import('./pages/SharesPage'))
const PurchasesPage = lazy(() => import('./pages/PurchasesPage'))
const ReturnsPage = lazy(() => import('./pages/ReturnsPage'))
const AccountingPage = lazy(() => import('./pages/AccountingPage'))
const SuppliersPage = lazy(() => import('./pages/SuppliersPage'))
const CustomersPage = lazy(() => import('./pages/CustomersPage'))

function PageFallback() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="text-center">
        <Spinner size="lg" />
        <p className="mt-4 text-neutral-600 dark:text-neutral-400">جاري التحميل...</p>
      </div>
    </div>
  )
}

function ProtectedRoute({ children, permission }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-900">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-neutral-600 dark:text-neutral-400">جاري التحميل...</p>
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

function AccessDenied() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center">
        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-error-100 dark:bg-error-900/20 flex items-center justify-center">
          <svg className="w-10 h-10 text-error-600 dark:text-error-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">غير مصرح</h2>
        <p className="text-neutral-600 dark:text-neutral-400">ليس لديك صلاحية للوصول لهذه الصفحة</p>
      </div>
    </div>
  )
}

function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route
          path="/login"
          element={
            <Suspense fallback={<PageFallback />}>
              <LoginPage />
            </Suspense>
          }
        />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Suspense fallback={<PageFallback />}><DashboardPage /></Suspense>} />
          <Route path="executive-dashboard" element={<Suspense fallback={<PageFallback />}><ExecutiveDashboardPage /></Suspense>} />
          <Route path="approvals" element={<Suspense fallback={<PageFallback />}><ApprovalsPage /></Suspense>} />
          <Route path="delivery" element={<Suspense fallback={<PageFallback />}><DeliveryPage /></Suspense>} />
          <Route path="warranty" element={<Suspense fallback={<PageFallback />}><WarrantyPage /></Suspense>} />
          <Route path="reports" element={<Suspense fallback={<PageFallback />}><ReportsPage /></Suspense>} />

          <Route path="inventory" element={<Suspense fallback={<PageFallback />}><InventoryPage /></Suspense>} />
          <Route path="sales" element={<Suspense fallback={<PageFallback />}><SalesPage /></Suspense>} />
          <Route path="sales/new" element={<Suspense fallback={<PageFallback />}><NewInvoicePage /></Suspense>} />
          <Route path="sales/waiting" element={<Suspense fallback={<PageFallback />}><WaitingInvoicesPage /></Suspense>} />
          <Route path="rep-dashboard" element={<Suspense fallback={<PageFallback />}><RepDashboardPage /></Suspense>} />
          <Route path="calculator" element={<Suspense fallback={<PageFallback />}><CalculatorPage /></Suspense>} />
          <Route path="fixed-assets" element={<Suspense fallback={<PageFallback />}><FixedAssetsPage /></Suspense>} />
          <Route path="shares" element={<Suspense fallback={<PageFallback />}><SharesPage /></Suspense>} />
          <Route path="purchases" element={<Suspense fallback={<PageFallback />}><PurchasesPage /></Suspense>} />
          <Route path="purchases/new" element={<Suspense fallback={<PageFallback />}><NewInvoicePage /></Suspense>} />
          <Route path="returns" element={<Suspense fallback={<PageFallback />}><ReturnsPage /></Suspense>} />
          <Route path="accounting" element={<Suspense fallback={<PageFallback />}><AccountingPage /></Suspense>} />
          <Route path="suppliers" element={<Suspense fallback={<PageFallback />}><SuppliersPage /></Suspense>} />
          <Route path="customers" element={<Suspense fallback={<PageFallback />}><CustomersPage /></Suspense>} />

          <Route path="employees" element={<Suspense fallback={<PageFallback />}><EmployeesPage /></Suspense>} />
          <Route path="tasks" element={<Suspense fallback={<PageFallback />}><TasksPage /></Suspense>} />
          <Route path="attendance" element={<Suspense fallback={<PageFallback />}><AttendancePage /></Suspense>} />
          <Route path="goals" element={<Suspense fallback={<PageFallback />}><GoalsPage /></Suspense>} />
          <Route path="training" element={<Suspense fallback={<PageFallback />}><TrainingPage /></Suspense>} />

          <Route path="permissions" element={<Suspense fallback={<PageFallback />}><PermissionsPage /></Suspense>} />
          <Route path="audit" element={<Suspense fallback={<PageFallback />}><AuditPage /></Suspense>} />
          <Route path="settings" element={<Suspense fallback={<PageFallback />}><SettingsPage /></Suspense>} />
          <Route path="notifications" element={<Suspense fallback={<PageFallback />}><NotificationsPage /></Suspense>} />
          <Route path="bot" element={<Suspense fallback={<PageFallback />}><BotDashboard /></Suspense>} />
          <Route path="ai-distribution" element={<Suspense fallback={<PageFallback />}><AIDistributionPage /></Suspense>} />
          <Route path="ai-chats" element={<Suspense fallback={<PageFallback />}><AIChatsPage /></Suspense>} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </ErrorBoundary>
  )
}

export default App

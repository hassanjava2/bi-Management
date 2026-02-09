import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import ProductDetail from "./pages/ProductDetail";
import ProductEdit from "./pages/ProductEdit";
import Categories from "./pages/Categories";
import CategoryDetail from "./pages/CategoryDetail";
import CategoryEdit from "./pages/CategoryEdit";
import Customers from "./pages/Customers";
import CustomerDetail from "./pages/CustomerDetail";
import CustomerEdit from "./pages/CustomerEdit";
import Branches from "./pages/Branches";
import BranchDetail from "./pages/BranchDetail";
import BranchEdit from "./pages/BranchEdit";
import Warehouses from "./pages/Warehouses";
import WarehouseDetail from "./pages/WarehouseDetail";
import WarehouseEdit from "./pages/WarehouseEdit";
import Suppliers from "./pages/Suppliers";
import SupplierDetail from "./pages/SupplierDetail";
import SupplierEdit from "./pages/SupplierEdit";
import Invoices from "./pages/Invoices";
import InvoiceDetail from "./pages/InvoiceDetail";
import InvoiceCreate from "./pages/InvoiceCreate";
import InvoiceEdit from "./pages/InvoiceEdit";
import Accounts from "./pages/Accounts";
import AccountDetail from "./pages/AccountDetail";
import AccountCreate from "./pages/AccountCreate";
import AccountEdit from "./pages/AccountEdit";
import JournalEntries from "./pages/JournalEntries";
import JournalEntryDetail from "./pages/JournalEntryDetail";
import JournalEntryCreate from "./pages/JournalEntryCreate";
import JournalEntryEdit from "./pages/JournalEntryEdit";
import Vouchers from "./pages/Vouchers";
import VoucherDetail from "./pages/VoucherDetail";
import VoucherCreate from "./pages/VoucherCreate";
import VoucherEdit from "./pages/VoucherEdit";
import CashRegisters from "./pages/CashRegisters";
import CashRegisterDetail from "./pages/CashRegisterDetail";
import CashRegisterCreate from "./pages/CashRegisterCreate";
import CashRegisterEdit from "./pages/CashRegisterEdit";
import BankAccounts from "./pages/BankAccounts";
import BankAccountDetail from "./pages/BankAccountDetail";
import BankAccountCreate from "./pages/BankAccountCreate";
import BankAccountEdit from "./pages/BankAccountEdit";
import Checks from "./pages/Checks";
import CheckDetail from "./pages/CheckDetail";
import CheckCreate from "./pages/CheckCreate";
import CheckEdit from "./pages/CheckEdit";
import Settings from "./pages/Settings";
import Roles from "./pages/Roles";
import RoleCreate from "./pages/RoleCreate";
import RoleEdit from "./pages/RoleEdit";
import Users from "./pages/Users";
import UserCreate from "./pages/UserCreate";
import UserEdit from "./pages/UserEdit";
import Permissions from "./pages/Permissions";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
// HR Pages
import Employees from "./pages/Employees";
import EmployeeCreate from "./pages/EmployeeCreate";
import EmployeeDetail from "./pages/EmployeeDetail";
import EmployeeEdit from "./pages/EmployeeEdit";
import Departments from "./pages/Departments";
import Attendance from "./pages/Attendance";
import Leaves from "./pages/Leaves";
import Salaries from "./pages/Salaries";
import Analytics from "./pages/Analytics";
// CRM Pages
import Leads from "./pages/Leads";
import Opportunities from "./pages/Opportunities";
import Campaigns from "./pages/Campaigns";
// Workflow Pages
import Workflows from "./pages/Workflows";
// Assets Pages
import Assets from "./pages/Assets";
// POS Pages
import POS from "./pages/POS";
// Supply Chain, Projects, Manufacturing Pages
import SupplyChain from "./pages/SupplyChain";
import Projects from "./pages/Projects";
import Manufacturing from "./pages/Manufacturing";
// E-commerce and Integrations Pages
import Ecommerce from "./pages/Ecommerce";
import Integrations from "./pages/Integrations";
// Purchases Pages
import PurchaseBatches from "./pages/PurchaseBatches";
import NewPurchaseBatch from "./pages/NewPurchaseBatch";
import AddBatchPrices from "./pages/AddBatchPrices";
import ReceiveBatch from "./pages/ReceiveBatch";
import PurchaseBatchDetail from "./pages/PurchaseBatchDetail";
// Delivery Pages
import DeliveryCompanies from "./pages/DeliveryCompanies";
import Shipments from "./pages/Shipments";
import PrepareShipment from "./pages/PrepareShipment";
import ShipmentDetail from "./pages/ShipmentDetail";
// Device Movement Pages
import DeviceSearch from "./pages/DeviceSearch";
import DeviceHistory from "./pages/DeviceHistory";
// Maintenance Pages
import MaintenanceList from "./pages/MaintenanceList";
import MaintenanceCreate from "./pages/MaintenanceCreate";
import MaintenanceDetail from "./pages/MaintenanceDetail";
import MaintenanceEdit from "./pages/MaintenanceEdit";
// Settings Pages
import SystemSettings from "./pages/SystemSettings";
// Custody Pages
import CustodyList from "./pages/CustodyList";
import CustodyAssign from "./pages/CustodyAssign";
import EmployeeCustody from "./pages/EmployeeCustody";
// Returns Pages
import ReturnsList from "./pages/ReturnsList";
import ReturnCreate from "./pages/ReturnCreate";
import ReturnDetail from "./pages/ReturnDetail";
import ReturnEdit from "./pages/ReturnEdit";
// Parts & Upgrades Pages
import PartsInventory from "./pages/PartsInventory";
import UpgradesList from "./pages/UpgradesList";
import UpgradeDevice from "./pages/UpgradeDevice";
// Notifications Pages
import NotificationsCenter from "./pages/NotificationsCenter";
// Reports Pages
import ReportsCenter from "./pages/ReportsCenter";
import ReportRunner from "./pages/ReportRunner";
import ReportBuilder from "./pages/ReportBuilder";
// Barcode Pages
import BarcodePrint from "./pages/BarcodePrint";
import BarcodeScanner from "./pages/BarcodeScanner";
// Audit Pages
import AuditLog from "./pages/AuditLog";
// Search Pages
import SearchResults from "./pages/SearchResults";
// Import/Export Pages
import DataImportExport from "./pages/DataImportExport";
// Alerts Pages
import AlertsCenter from "./pages/AlertsCenter";
// Tickets Pages
import TicketsList from "./pages/TicketsList";
import TicketDetail from "./pages/TicketDetail";
import TicketCreate from "./pages/TicketCreate";
import TicketEdit from "./pages/TicketEdit";
// Quotations Pages
import QuotationsList from "./pages/QuotationsList";
import QuotationCreate from "./pages/QuotationCreate";
import QuotationEdit from "./pages/QuotationEdit";
import QuotationDetail from "./pages/QuotationDetail";
// Warranties Pages
import WarrantiesList from "./pages/WarrantiesList";
import WarrantyDetail from "./pages/WarrantyDetail";
// Promotions Pages
import PromotionsList from "./pages/PromotionsList";
import PromotionCreate from "./pages/PromotionCreate";
import PromotionDetail from "./pages/PromotionDetail";
import PromotionEdit from "./pages/PromotionEdit";
// Contracts Pages
import ContractsList from "./pages/ContractsList";
import ContractCreate from "./pages/ContractCreate";
import ContractDetail from "./pages/ContractDetail";
import ContractEdit from "./pages/ContractEdit";
// Loyalty Pages
import LoyaltyProgram from "./pages/LoyaltyProgram";
import CustomerLoyalty from "./pages/CustomerLoyalty";
// Tasks Pages
import TasksList from "./pages/TasksList";
import TaskDetail from "./pages/TaskDetail";
import TaskEdit from "./pages/TaskEdit";
// Reservations Pages
import ReservationsList from "./pages/ReservationsList";
import ReservationCreate from "./pages/ReservationCreate";
import ReservationDetail from "./pages/ReservationDetail";
import ReservationEdit from "./pages/ReservationEdit";
// Notes Pages
import NotesCenter from "./pages/NotesCenter";
// Appointments Pages
import AppointmentsCalendar from "./pages/AppointmentsCalendar";
// Agents Pages
import AgentsList from "./pages/AgentsList";
import AgentDetail from "./pages/AgentDetail";
import AgentEdit from "./pages/AgentEdit";
// Reviews Pages
import ReviewsCenter from "./pages/ReviewsCenter";
// Budgets Pages
import BudgetManagement from "./pages/BudgetManagement";
// Subscriptions Pages
import SubscriptionsList from "./pages/SubscriptionsList";
// Files Pages
import FileManager from "./pages/FileManager";
// Calls Pages
import CallLog from "./pages/CallLog";
// Competitors Pages
import CompetitorAnalysis from "./pages/CompetitorAnalysis";
// KPIs Pages
import GoalsDashboard from "./pages/GoalsDashboard";
// Archive Pages
import ArchiveCenter from "./pages/ArchiveCenter";
// Documents Pages
import DocumentsCenter from "./pages/DocumentsCenter";
// Messages Pages
import MessagesCenter from "./pages/MessagesCenter";
// Partners Pages
import PartnersCenter from "./pages/PartnersCenter";
// Training Pages
import TrainingCenter from "./pages/TrainingCenter";
// Performance Pages
import PerformanceCenter from "./pages/PerformanceCenter";
// Risks Pages
import RiskManagement from "./pages/RiskManagement";
// Quality Pages
import QualityManagement from "./pages/QualityManagement";
// Analytics Pages
import AnalyticsDashboard from "./pages/AnalyticsDashboard";
// Expenses Pages
import ExpenseManagement from "./pages/ExpenseManagement";
// Meetings Pages
import MeetingsCenter from "./pages/MeetingsCenter";
// Fleet Pages
import FleetManagement from "./pages/FleetManagement";
// Complaints Pages
import ComplaintsCenter from "./pages/ComplaintsCenter";
// Real Estate Pages
import RealEstateManagement from "./pages/RealEstateManagement";
// Knowledge Pages
import KnowledgeBase from "./pages/KnowledgeBase";
// Events Pages
import EventsManagement from "./pages/EventsManagement";
// Advanced Budget Pages
import AdvancedBudgeting from "./pages/AdvancedBudgeting";
// Visits Pages
import VisitsManagement from "./pages/VisitsManagement";
// Tenders Pages
import TendersManagement from "./pages/TendersManagement";
// Correspondence Pages
import CorrespondenceCenter from "./pages/CorrespondenceCenter";
// Policies Pages
import PoliciesManagement from "./pages/PoliciesManagement";
// Licenses Pages
import LicensesManagement from "./pages/LicensesManagement";
// Investments Pages
import InvestmentsManagement from "./pages/InvestmentsManagement";
// Executive & Rep Dashboards
import ExecutiveDashboard from "./pages/ExecutiveDashboard";
import RepDashboard from "./pages/RepDashboard";
// Shares Pages
import SharesPage from "./pages/SharesPage";
// Companies Pages
import CompaniesPage from "./pages/CompaniesPage";
// AI Chat Pages
import AiChat from "./pages/AiChat";
// Calculator Pages
import CalculatorPage from "./pages/CalculatorPage";
// Bot Dashboard Pages
import BotDashboard from "./pages/BotDashboard";
// Cameras Pages
import CamerasPage from "./pages/CamerasPage";
// Enterprise Feature Pages
import ProfitabilityDashboard from "./pages/ProfitabilityDashboard";
import SmartPricingPage from "./pages/SmartPricingPage";
import VendorScorecardPage from "./pages/VendorScorecardPage";
import BundlesPage from "./pages/BundlesPage";
import WarrantyDashboardPage from "./pages/WarrantyDashboardPage";
import LiveSalesDashboard from "./pages/LiveSalesDashboard";
import CustomerPortalPage from "./pages/CustomerPortalPage";

function parseJwtPayload(token: string): { exp?: number } | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    return payload;
  } catch {
    return null;
  }
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem("token");
  if (!token || !token.trim()) return <Navigate to="/login" replace />;
  const payload = parseJwtPayload(token);
  if (!payload) {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    return <Navigate to="/login" replace />;
  }
  if (payload.exp != null && payload.exp * 1000 < Date.now()) {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="products" element={<Products />} />
          <Route path="products/:id" element={<ProductDetail />} />
          <Route path="products/:id/edit" element={<ProductEdit />} />
          <Route path="categories" element={<Categories />} />
          <Route path="categories/:id" element={<CategoryDetail />} />
          <Route path="categories/:id/edit" element={<CategoryEdit />} />
          <Route path="branches" element={<Branches />} />
          <Route path="branches/:id" element={<BranchDetail />} />
          <Route path="branches/:id/edit" element={<BranchEdit />} />
          <Route path="warehouses" element={<Warehouses />} />
          <Route path="warehouses/:id" element={<WarehouseDetail />} />
          <Route path="warehouses/:id/edit" element={<WarehouseEdit />} />
          <Route path="customers" element={<Customers />} />
          <Route path="customers/:id" element={<CustomerDetail />} />
          <Route path="customers/:id/edit" element={<CustomerEdit />} />
          <Route path="suppliers" element={<Suppliers />} />
          <Route path="suppliers/:id" element={<SupplierDetail />} />
          <Route path="suppliers/:id/edit" element={<SupplierEdit />} />
          <Route path="invoices" element={<Invoices />} />
          <Route path="invoices/new" element={<InvoiceCreate />} />
          <Route path="invoices/:id" element={<InvoiceDetail />} />
          <Route path="invoices/:id/edit" element={<InvoiceEdit />} />
          <Route path="accounts" element={<Accounts />} />
          <Route path="accounts/new" element={<AccountCreate />} />
          <Route path="accounts/:id" element={<AccountDetail />} />
          <Route path="accounts/:id/edit" element={<AccountEdit />} />
          <Route path="journal-entries" element={<JournalEntries />} />
          <Route path="journal-entries/new" element={<JournalEntryCreate />} />
          <Route path="journal-entries/:id" element={<JournalEntryDetail />} />
          <Route path="journal-entries/:id/edit" element={<JournalEntryEdit />} />
          <Route path="vouchers" element={<Vouchers />} />
          <Route path="vouchers/new" element={<VoucherCreate />} />
          <Route path="vouchers/:id" element={<VoucherDetail />} />
          <Route path="vouchers/:id/edit" element={<VoucherEdit />} />
          <Route path="cash-registers" element={<CashRegisters />} />
          <Route path="cash-registers/new" element={<CashRegisterCreate />} />
          <Route path="cash-registers/:id" element={<CashRegisterDetail />} />
          <Route path="cash-registers/:id/edit" element={<CashRegisterEdit />} />
          <Route path="bank-accounts" element={<BankAccounts />} />
          <Route path="bank-accounts/new" element={<BankAccountCreate />} />
          <Route path="bank-accounts/:id" element={<BankAccountDetail />} />
          <Route path="bank-accounts/:id/edit" element={<BankAccountEdit />} />
          <Route path="checks" element={<Checks />} />
          <Route path="checks/new" element={<CheckCreate />} />
          <Route path="checks/:id" element={<CheckDetail />} />
          <Route path="checks/:id/edit" element={<CheckEdit />} />
          <Route path="reports" element={<ReportsCenter />} />
          <Route path="reports/run/:reportId" element={<ReportRunner />} />
          <Route path="reports/builder" element={<ReportBuilder />} />
          <Route path="settings" element={<Settings />} />
          <Route path="roles" element={<Roles />} />
          <Route path="roles/new" element={<RoleCreate />} />
          <Route path="roles/:id/edit" element={<RoleEdit />} />
          <Route path="users" element={<Users />} />
          <Route path="users/new" element={<UserCreate />} />
          <Route path="users/:id/edit" element={<UserEdit />} />
          <Route path="permissions" element={<Permissions />} />
          <Route path="profile" element={<Profile />} />
          {/* HR Routes */}
          <Route path="hr/employees" element={<Employees />} />
          <Route path="hr/employees/new" element={<EmployeeCreate />} />
          <Route path="hr/employees/:id" element={<EmployeeDetail />} />
          <Route path="hr/employees/:id/edit" element={<EmployeeEdit />} />
          <Route path="hr/departments" element={<Departments />} />
          <Route path="hr/attendance" element={<Attendance />} />
          <Route path="hr/leaves" element={<Leaves />} />
          <Route path="hr/salaries" element={<Salaries />} />
          <Route path="analytics" element={<Analytics />} />
          {/* CRM Routes */}
          <Route path="crm/leads" element={<Leads />} />
          <Route path="crm/opportunities" element={<Opportunities />} />
          <Route path="crm/campaigns" element={<Campaigns />} />
          {/* Workflow Routes */}
          <Route path="workflows" element={<Workflows />} />
          {/* Assets Routes */}
          <Route path="assets" element={<Assets />} />
          {/* POS Routes */}
          <Route path="pos" element={<POS />} />
          {/* Purchases Routes */}
          <Route path="purchases" element={<PurchaseBatches />} />
          <Route path="purchases/new" element={<NewPurchaseBatch />} />
          <Route path="purchases/:id" element={<PurchaseBatchDetail />} />
          <Route path="purchases/:id/prices" element={<AddBatchPrices />} />
          <Route path="purchases/:id/receive" element={<ReceiveBatch />} />
          {/* Additional Modules */}
          <Route path="supply-chain" element={<SupplyChain />} />
          <Route path="projects" element={<Projects />} />
          <Route path="manufacturing" element={<Manufacturing />} />
          <Route path="ecommerce" element={<Ecommerce />} />
          <Route path="integrations" element={<Integrations />} />
          {/* Delivery Routes */}
          <Route path="delivery/companies" element={<DeliveryCompanies />} />
          <Route path="delivery/shipments" element={<Shipments />} />
          <Route path="delivery/shipments/:id" element={<ShipmentDetail />} />
          <Route path="delivery/prepare/:id" element={<PrepareShipment />} />
          {/* Device Movement Routes */}
          <Route path="devices" element={<DeviceSearch />} />
          <Route path="devices/:serialNumber" element={<DeviceHistory />} />
          {/* Maintenance Routes */}
          <Route path="maintenance" element={<MaintenanceList />} />
          <Route path="maintenance/new" element={<MaintenanceCreate />} />
          <Route path="maintenance/:id" element={<MaintenanceDetail />} />
          <Route path="maintenance/:id/edit" element={<MaintenanceEdit />} />
          {/* System Settings Route */}
          <Route path="system-settings" element={<SystemSettings />} />
          {/* Custody Routes */}
          <Route path="custody" element={<CustodyList />} />
          <Route path="custody/assign" element={<CustodyAssign />} />
          <Route path="custody/employee/:userId" element={<EmployeeCustody />} />
          {/* Returns Routes */}
          <Route path="returns" element={<ReturnsList />} />
          <Route path="returns/new" element={<ReturnCreate />} />
          <Route path="returns/:id" element={<ReturnDetail />} />
          <Route path="returns/:id/edit" element={<ReturnEdit />} />
          {/* Parts & Upgrades Routes */}
          <Route path="parts" element={<PartsInventory />} />
          <Route path="upgrades" element={<UpgradesList />} />
          <Route path="upgrades/new" element={<UpgradeDevice />} />
          {/* Notifications Routes */}
          <Route path="notifications" element={<NotificationsCenter />} />
          {/* Barcode Routes */}
          <Route path="barcode/print" element={<BarcodePrint />} />
          <Route path="barcode/scan" element={<BarcodeScanner />} />
          {/* Audit Routes */}
          <Route path="audit-log" element={<AuditLog />} />
          {/* Search Routes */}
          <Route path="search" element={<SearchResults />} />
          {/* Import/Export Routes */}
          <Route path="data-tools" element={<DataImportExport />} />
          {/* Alerts Routes */}
          <Route path="alerts" element={<AlertsCenter />} />
          {/* Tickets Routes */}
          <Route path="tickets" element={<TicketsList />} />
          <Route path="tickets/new" element={<TicketCreate />} />
          <Route path="tickets/:id" element={<TicketDetail />} />
          <Route path="tickets/:id/edit" element={<TicketEdit />} />
          {/* Quotations Routes */}
          <Route path="quotations" element={<QuotationsList />} />
          <Route path="quotations/new" element={<QuotationCreate />} />
          <Route path="quotations/:id" element={<QuotationDetail />} />
          <Route path="quotations/:id/edit" element={<QuotationEdit />} />
          {/* Warranties Routes */}
          <Route path="warranties" element={<WarrantiesList />} />
          <Route path="warranties/:id" element={<WarrantyDetail />} />
          {/* Promotions Routes */}
          <Route path="promotions" element={<PromotionsList />} />
          <Route path="promotions/new" element={<PromotionCreate />} />
          <Route path="promotions/:id" element={<PromotionDetail />} />
          <Route path="promotions/:id/edit" element={<PromotionEdit />} />
          {/* Contracts Routes */}
          <Route path="contracts" element={<ContractsList />} />
          <Route path="contracts/new" element={<ContractCreate />} />
          <Route path="contracts/:id" element={<ContractDetail />} />
          <Route path="contracts/:id/edit" element={<ContractEdit />} />
          {/* Loyalty Routes */}
          <Route path="loyalty" element={<LoyaltyProgram />} />
          <Route path="loyalty/customer/:customerId" element={<CustomerLoyalty />} />
          {/* Tasks Routes */}
          <Route path="tasks" element={<TasksList />} />
          <Route path="tasks/:id" element={<TaskDetail />} />
          <Route path="tasks/:id/edit" element={<TaskEdit />} />
          {/* Reservations Routes */}
          <Route path="reservations" element={<ReservationsList />} />
          <Route path="reservations/new" element={<ReservationCreate />} />
          <Route path="reservations/:id" element={<ReservationDetail />} />
          <Route path="reservations/:id/edit" element={<ReservationEdit />} />
          {/* Notes Routes */}
          <Route path="notes" element={<NotesCenter />} />
          {/* Appointments Routes */}
          <Route path="appointments" element={<AppointmentsCalendar />} />
          {/* Agents Routes */}
          <Route path="agents" element={<AgentsList />} />
          <Route path="agents/:id" element={<AgentDetail />} />
          <Route path="agents/:id/edit" element={<AgentEdit />} />
          {/* Reviews Routes */}
          <Route path="reviews" element={<ReviewsCenter />} />
          {/* Budgets Routes */}
          <Route path="budgets" element={<BudgetManagement />} />
          {/* Subscriptions Routes */}
          <Route path="subscriptions" element={<SubscriptionsList />} />
          {/* Files Routes */}
          <Route path="files" element={<FileManager />} />
          {/* Calls Routes */}
          <Route path="calls" element={<CallLog />} />
          {/* Competitors Routes */}
          <Route path="competitors" element={<CompetitorAnalysis />} />
          {/* KPIs Routes */}
          <Route path="goals" element={<GoalsDashboard />} />
          {/* Archive Routes */}
          <Route path="archive" element={<ArchiveCenter />} />
          {/* Documents Routes */}
          <Route path="documents" element={<DocumentsCenter />} />
          {/* Messages Routes */}
          <Route path="messages" element={<MessagesCenter />} />
          {/* Partners Routes */}
          <Route path="partners" element={<PartnersCenter />} />
          {/* Training Routes */}
          <Route path="training" element={<TrainingCenter />} />
          {/* Performance Routes */}
          <Route path="performance" element={<PerformanceCenter />} />
          {/* Risks Routes */}
          <Route path="risks" element={<RiskManagement />} />
          {/* Quality Routes */}
          <Route path="quality" element={<QualityManagement />} />
          {/* Analytics Routes */}
          <Route path="analytics-dashboard" element={<AnalyticsDashboard />} />
          {/* Expenses Routes */}
          <Route path="expenses" element={<ExpenseManagement />} />
          {/* Meetings Routes */}
          <Route path="meetings" element={<MeetingsCenter />} />
          {/* Fleet Routes */}
          <Route path="fleet" element={<FleetManagement />} />
          {/* Complaints Routes */}
          <Route path="complaints" element={<ComplaintsCenter />} />
          {/* Real Estate Routes */}
          <Route path="realestate" element={<RealEstateManagement />} />
          {/* Knowledge Routes */}
          <Route path="knowledge" element={<KnowledgeBase />} />
          {/* Events Routes */}
          <Route path="events" element={<EventsManagement />} />
          {/* Advanced Budget Routes */}
          <Route path="advanced-budgeting" element={<AdvancedBudgeting />} />
          {/* Visits Routes */}
          <Route path="visits" element={<VisitsManagement />} />
          {/* Tenders Routes */}
          <Route path="tenders" element={<TendersManagement />} />
          {/* Correspondence Routes */}
          <Route path="correspondence" element={<CorrespondenceCenter />} />
          {/* Policies Routes */}
          <Route path="policies" element={<PoliciesManagement />} />
          {/* Licenses Routes */}
          <Route path="licenses" element={<LicensesManagement />} />
          {/* Investments Routes */}
          <Route path="investments" element={<InvestmentsManagement />} />
          {/* Executive & Rep Dashboards */}
          <Route path="executive-dashboard" element={<ExecutiveDashboard />} />
          <Route path="rep-dashboard" element={<RepDashboard />} />
          {/* Shares Routes */}
          <Route path="shares" element={<SharesPage />} />
          {/* Companies Routes */}
          <Route path="companies" element={<CompaniesPage />} />
          {/* AI Chat Routes */}
          <Route path="ai-chat" element={<AiChat />} />
          {/* Calculator Routes */}
          <Route path="calculator" element={<CalculatorPage />} />
          {/* Bot Dashboard Routes */}
          <Route path="bot" element={<BotDashboard />} />
          {/* Cameras Routes */}
          <Route path="cameras" element={<CamerasPage />} />
          {/* Enterprise Feature Routes */}
          <Route path="profitability" element={<ProfitabilityDashboard />} />
          <Route path="smart-pricing" element={<SmartPricingPage />} />
          <Route path="vendor-scorecard" element={<VendorScorecardPage />} />
          <Route path="bundles" element={<BundlesPage />} />
          <Route path="warranty-dashboard" element={<WarrantyDashboardPage />} />
          <Route path="live-sales" element={<LiveSalesDashboard />} />
          <Route path="customer-portal" element={<CustomerPortalPage />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

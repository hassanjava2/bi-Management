import "dotenv/config";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import { apiRateLimiter } from "./lib/rate-limit.js";
import roles from "./routes/roles.js";
import categories from "./routes/categories.js";
import products from "./routes/products.js";
import auth from "./routes/auth.js";
import branches from "./routes/branches.js";
import warehouses from "./routes/warehouses.js";
import customers from "./routes/customers.js";
import suppliers from "./routes/suppliers.js";
import stats from "./routes/stats.js";
import invoices from "./routes/invoices.js";
import permissions from "./routes/permissions.js";
import users from "./routes/users.js";
import accounts from "./routes/accounts.js";
import journalEntries from "./routes/journal-entries.js";
import vouchers from "./routes/vouchers.js";
import cashRegisters from "./routes/cash-registers.js";
import bankAccounts from "./routes/bank-accounts.js";
import checks from "./routes/checks.js";
import reports from "./routes/reports.js";
import health from "./routes/health.js";
// HR Routes
import departments from "./routes/departments.js";
import positions from "./routes/positions.js";
import employees from "./routes/employees.js";
import attendance from "./routes/attendance.js";
import leaves from "./routes/leaves.js";
import salaries from "./routes/salaries.js";
// CRM Routes
import leads from "./routes/leads.js";
import opportunities from "./routes/opportunities.js";
import campaigns from "./routes/campaigns.js";
// Workflow Routes
import workflows from "./routes/workflows.js";
import notificationsRoute from "./routes/notifications.js";
// Assets Routes
import assets from "./routes/assets.js";
// POS Routes
import pos from "./routes/pos.js";
// Supply Chain Routes
import supplyChain from "./routes/supply-chain.js";
// Project Routes
import projectsRoute from "./routes/projects.js";
// Manufacturing Routes
import manufacturing from "./routes/manufacturing.js";
// E-commerce Routes
import ecommerce from "./routes/ecommerce.js";
// Integrations Routes
import integrations from "./routes/integrations.js";
// Purchases Routes
import purchases from "./routes/purchases.js";
// Delivery Routes
import delivery from "./routes/delivery.js";
// Device Movements Routes
import deviceMovements from "./routes/device-movements.js";
// Maintenance Routes
import maintenance from "./routes/maintenance.js";
// Settings Routes
import settings from "./routes/settings.js";
// Dashboard Routes
import dashboard from "./routes/dashboard.js";
// Custody Routes
import custody from "./routes/custody.js";
// Returns Routes
import returns from "./routes/returns.js";
// Parts Routes
import parts from "./routes/parts.js";
// Barcode Routes
import barcode from "./routes/barcode.js";
// Audit Routes
import audit from "./routes/audit.js";
// Search Routes
import search from "./routes/search.js";
// Import/Export Routes
import importExport from "./routes/import-export.js";
// Alerts Routes
import alerts from "./routes/alerts.js";
// Tickets Routes
import tickets from "./routes/tickets.js";
// Quotations Routes
import quotationsRoute from "./routes/quotations.js";
// Warranties Routes
import warranties from "./routes/warranties.js";
// Promotions Routes
import promotions from "./routes/promotions.js";
// Contracts Routes
import contractsRoute from "./routes/contracts.js";
// Loyalty Routes
import loyalty from "./routes/loyalty.js";
// Tasks Routes
import tasksRoute from "./routes/tasks.js";
// Reservations Routes
import reservationsRoute from "./routes/reservations.js";
// Notes Routes
import notesRoute from "./routes/notes.js";
// Appointments Routes
import appointmentsRoute from "./routes/appointments.js";
// Agents Routes
import agentsRoute from "./routes/agents.js";
// Reviews Routes
import reviewsRoute from "./routes/reviews.js";
// Budgets Routes
import budgetsRoute from "./routes/budgets.js";
// Subscriptions Routes
import subscriptionsRoute from "./routes/subscriptions.js";
// Files Routes
import filesRoute from "./routes/files.js";
// Calls Routes
import callsRoute from "./routes/calls.js";
// Competitors Routes
import competitorsRoute from "./routes/competitors.js";
// KPIs Routes
import kpisRoute from "./routes/kpis.js";
// Archive Routes
import archiveRoute from "./routes/archive.js";
// Documents Routes
import documentsRoute from "./routes/documents.js";
// Messages Routes
import messagesRoute from "./routes/messages.js";
// Partners Routes
import partnersRoute from "./routes/partners.js";
// Training Routes
import trainingRoute from "./routes/training.js";
// Performance Routes
import performanceRoute from "./routes/performance.js";
// Risks Routes
import risksRoute from "./routes/risks.js";
// Quality Routes
import qualityRoute from "./routes/quality.js";
// Analytics Routes
import analyticsRoute from "./routes/analytics.js";
// Expenses Routes
import expensesRoute from "./routes/expenses.js";
// Meetings Routes
import meetingsRoute from "./routes/meetings.js";
// Fleet Routes
import fleetRoute from "./routes/fleet.js";
// Complaints Routes
import complaintsRoute from "./routes/complaints.js";
// Real Estate Routes
import realestateRoute from "./routes/realestate.js";
// Knowledge Routes
import knowledgeRoute from "./routes/knowledge.js";
// Events Routes
import eventsRoute from "./routes/events.js";
// Advanced Budget Routes
import advancedBudgetRoute from "./routes/advancedbudget.js";
// Visits Routes
import visitsRoute from "./routes/visits.js";
// Tenders Routes
import tendersRoute from "./routes/tenders.js";
// Correspondence Routes
import correspondenceRoute from "./routes/correspondence.js";
// Policies Routes
import policiesRoute from "./routes/policies.js";
// Licenses Routes
import licensesRoute from "./routes/licenses.js";
// Investments Routes
import investmentsRoute from "./routes/investments.js";
// Goals & Incentives Routes
import goalsRoute from "./routes/goals.js";
// Security Routes
import securityRoute from "./routes/security.js";
// Shares Routes
import sharesRoute from "./routes/shares.js";
// Companies Routes
import companiesRoute from "./routes/companies.js";
// AI Assistant Routes
import aiRoute from "./routes/ai.js";
// Calculator Routes
import calculatorRoute from "./routes/calculator.js";
// Bot Dashboard Routes
import botRoute from "./routes/bot.js";
// Cameras Routes
import camerasRoute from "./routes/cameras.js";
// Enterprise Features Routes
import profitabilityRoute from "./routes/profitability.js";
import smartPricingRoute from "./routes/smart-pricing.js";
import vendorScorecardRoute from "./routes/vendor-scorecard.js";
import bundlesRoute from "./routes/bundles.js";
import warrantyAdvancedRoute from "./routes/warranty-advanced.js";
import customerPortalRoute from "./routes/customer-portal.js";

const app = new Hono();

// Security headers middleware
app.use("*", secureHeaders());

// Request logging middleware
app.use("*", logger());

// Rate limit API routes (auth has its own stricter limit)
app.use("/api/*", apiRateLimiter);

// CORS configuration
app.use("*", cors({
  origin: process.env.ALLOWED_ORIGINS?.split(",") || ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000", "http://127.0.0.1:3000"],
  credentials: true,
  allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
  exposeHeaders: ["Content-Length", "X-RateLimit-Limit", "X-RateLimit-Remaining", "X-RateLimit-Reset"],
}));

// Global error handler
app.onError((err, c) => {
  console.error("Unhandled error:", err);
  
  // Don't expose internal errors in production
  const message = process.env.NODE_ENV === "production" 
    ? "حدث خطأ داخلي في الخادم" 
    : err.message;
  
  return c.json({ 
    error: message,
    code: "INTERNAL_ERROR"
  }, 500);
});

// 404 handler
app.notFound((c) => {
  return c.json({ 
    error: "المسار غير موجود",
    code: "NOT_FOUND"
  }, 404);
});

app.get("/", (c) => c.json({ name: "BI Management API v3", version: "3.0.0" }));

app.route("/api/health", health);
app.route("/api/auth", auth);
app.route("/api/roles", roles);
app.route("/api/categories", categories);
app.route("/api/products", products);
app.route("/api/branches", branches);
app.route("/api/warehouses", warehouses);
app.route("/api/customers", customers);
app.route("/api/suppliers", suppliers);
app.route("/api/stats", stats);
app.route("/api/invoices", invoices);
app.route("/api/permissions", permissions);
app.route("/api/users", users);
app.route("/api/accounts", accounts);
app.route("/api/journal-entries", journalEntries);
app.route("/api/vouchers", vouchers);
app.route("/api/cash-registers", cashRegisters);
app.route("/api/bank-accounts", bankAccounts);
app.route("/api/checks", checks);
app.route("/api/reports", reports);
// HR Routes
app.route("/api/departments", departments);
app.route("/api/positions", positions);
app.route("/api/employees", employees);
app.route("/api/attendance", attendance);
app.route("/api/leaves", leaves);
app.route("/api/salaries", salaries);
// CRM Routes
app.route("/api/leads", leads);
app.route("/api/opportunities", opportunities);
app.route("/api/campaigns", campaigns);
// Workflow Routes
app.route("/api/workflows", workflows);
app.route("/api/notifications", notificationsRoute);
// Assets Routes
app.route("/api/assets", assets);
// POS Routes
app.route("/api/pos", pos);
// Supply Chain Routes
app.route("/api/supply-chain", supplyChain);
// Project Routes
app.route("/api/projects", projectsRoute);
// Manufacturing Routes
app.route("/api/manufacturing", manufacturing);
// E-commerce Routes
app.route("/api/ecommerce", ecommerce);
// Integrations Routes
app.route("/api/integrations", integrations);
// Purchases Routes
app.route("/api/purchases", purchases);
// Delivery Routes
app.route("/api/delivery", delivery);
// Device Movements Routes
app.route("/api/device-movements", deviceMovements);
// Maintenance Routes
app.route("/api/maintenance", maintenance);
// Settings Routes
app.route("/api/settings", settings);
// Dashboard Routes
app.route("/api/dashboard", dashboard);
// Custody Routes
app.route("/api/custody", custody);
// Returns Routes
app.route("/api/returns", returns);
// Parts Routes
app.route("/api/parts", parts);
// Barcode Routes
app.route("/api/barcode", barcode);
// Audit Routes
app.route("/api/audit", audit);
// Search Routes
app.route("/api/search", search);
// Import/Export Routes
app.route("/api/data", importExport);
// Alerts Routes
app.route("/api/alerts", alerts);
// Tickets Routes
app.route("/api/tickets", tickets);
// Quotations Routes
app.route("/api/quotations", quotationsRoute);
// Warranties Routes
app.route("/api/warranties", warranties);
// Promotions Routes
app.route("/api/promotions", promotions);
// Contracts Routes
app.route("/api/contracts", contractsRoute);
// Loyalty Routes
app.route("/api/loyalty", loyalty);
// Tasks Routes
app.route("/api/tasks", tasksRoute);
// Reservations Routes
app.route("/api/reservations", reservationsRoute);
// Notes Routes
app.route("/api/notes", notesRoute);
// Appointments Routes
app.route("/api/appointments", appointmentsRoute);
// Agents Routes
app.route("/api/agents", agentsRoute);
// Reviews Routes
app.route("/api/reviews", reviewsRoute);
// Budgets Routes
app.route("/api/budgets", budgetsRoute);
// Subscriptions Routes
app.route("/api/subscriptions", subscriptionsRoute);
// Files Routes
app.route("/api/files", filesRoute);
// Calls Routes
app.route("/api/calls", callsRoute);
// Competitors Routes
app.route("/api/competitors", competitorsRoute);
// KPIs Routes
app.route("/api/kpis", kpisRoute);
// Archive Routes
app.route("/api/archive", archiveRoute);
// Documents Routes
app.route("/api/documents", documentsRoute);
// Messages Routes
app.route("/api/messages", messagesRoute);
// Partners Routes
app.route("/api/partners", partnersRoute);
// Training Routes
app.route("/api/training", trainingRoute);
// Performance Routes
app.route("/api/performance", performanceRoute);
// Risks Routes
app.route("/api/risks", risksRoute);
// Quality Routes
app.route("/api/quality", qualityRoute);
// Analytics Routes
app.route("/api/analytics", analyticsRoute);
// Expenses Routes
app.route("/api/expenses", expensesRoute);
// Meetings Routes
app.route("/api/meetings", meetingsRoute);
// Fleet Routes
app.route("/api/fleet", fleetRoute);
// Complaints Routes
app.route("/api/complaints", complaintsRoute);
// Real Estate Routes
app.route("/api/realestate", realestateRoute);
// Knowledge Routes
app.route("/api/knowledge", knowledgeRoute);
// Events Routes
app.route("/api/events", eventsRoute);
// Advanced Budget Routes
app.route("/api/advancedbudget", advancedBudgetRoute);
// Visits Routes
app.route("/api/visits", visitsRoute);
// Tenders Routes
app.route("/api/tenders", tendersRoute);
// Correspondence Routes
app.route("/api/correspondence", correspondenceRoute);
// Policies Routes
app.route("/api/policies", policiesRoute);
// Licenses Routes
app.route("/api/licenses", licensesRoute);
// Investments Routes
app.route("/api/investments", investmentsRoute);
// Goals & Incentives Routes
app.route("/api/goals", goalsRoute);
// Security Routes
app.route("/api/security", securityRoute);
// Shares Routes
app.route("/api/shares", sharesRoute);
// Companies Routes
app.route("/api/companies", companiesRoute);
// AI Assistant Routes
app.route("/api/ai", aiRoute);
// Calculator Routes
app.route("/api/calculator", calculatorRoute);
// Bot Dashboard Routes
app.route("/api/bot", botRoute);
// Cameras Routes
app.route("/api/cameras", camerasRoute);
// Enterprise Features Routes
app.route("/api/profitability", profitabilityRoute);
app.route("/api/smart-pricing", smartPricingRoute);
app.route("/api/vendor-scorecard", vendorScorecardRoute);
app.route("/api/bundles", bundlesRoute);
app.route("/api/warranty-advanced", warrantyAdvancedRoute);
app.route("/api/customer-portal", customerPortalRoute);

const port = Number(process.env.PORT) || 3001;
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`BI Management API v3: http://127.0.0.1:${info.port}`);
});

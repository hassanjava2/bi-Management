/**
 * Schema - نظام إدارة الموازنات المتقدم
 */
import { pgTable, text, timestamp, boolean, jsonb, integer, decimal } from "drizzle-orm/pg-core";
import { users } from "./users";
import { departments } from "./departments";
import { branches } from "./branches";
import { accounts } from "./accounts";

/**
 * الموازنات
 */
export const budgetPlans = pgTable("budget_plans", {
  id: text("id").primaryKey(),
  budgetNumber: text("budget_number").notNull().unique(),
  
  // المعلومات الأساسية
  name: text("name").notNull(),
  description: text("description"),
  
  // النوع
  budgetType: text("budget_type").default("annual"), // annual, quarterly, monthly, project, department
  
  // الفترة
  fiscalYear: integer("fiscal_year").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  
  // النطاق
  departmentId: text("department_id").references(() => departments.id),
  branchId: text("branch_id").references(() => branches.id),
  projectId: text("project_id"),
  
  // المبالغ
  totalBudget: decimal("total_budget").notNull(),
  allocatedAmount: decimal("allocated_amount").default("0"),
  spentAmount: decimal("spent_amount").default("0"),
  remainingAmount: decimal("remaining_amount"),
  
  // العملة
  currency: text("currency").default("IQD"),
  
  // الحالة
  status: text("status").default("draft"), // draft, pending_approval, approved, active, frozen, closed
  
  // الموافقة
  approvalLevel: integer("approval_level").default(0),
  approvedBy: text("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  
  // الإعدادات
  allowOverspend: boolean("allow_overspend").default(false),
  overspendLimit: decimal("overspend_limit"),
  alertThreshold: integer("alert_threshold").default(80), // نسبة مئوية
  
  notes: text("notes"),
  
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * بنود الموازنة
 */
export const budgetLineItems = pgTable("budget_line_items", {
  id: text("id").primaryKey(),
  budgetId: text("budget_id").notNull().references(() => budgetPlans.id, { onDelete: "cascade" }),
  
  // الفئة
  categoryId: text("category_id").references(() => budgetCategories.id),
  accountId: text("account_id").references(() => accounts.id),
  
  // التفاصيل
  name: text("name").notNull(),
  description: text("description"),
  
  // المبالغ
  budgetedAmount: decimal("budgeted_amount").notNull(),
  allocatedAmount: decimal("allocated_amount").default("0"),
  spentAmount: decimal("spent_amount").default("0"),
  
  // التوزيع الشهري
  monthlyAllocation: jsonb("monthly_allocation").$type<{
    month: number;
    amount: number;
  }[]>(),
  
  // الأولوية
  priority: text("priority").default("medium"), // low, medium, high, critical
  
  // الملاحظات
  notes: text("notes"),
  
  sortOrder: integer("sort_order").default(0),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * فئات الموازنة
 */
export const budgetCategories = pgTable("budget_categories", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  nameEn: text("name_en"),
  
  // التصنيف
  categoryType: text("category_type").default("expense"), // income, expense
  
  parentId: text("parent_id"),
  
  // الحساب المرتبط
  accountId: text("account_id").references(() => accounts.id),
  
  icon: text("icon"),
  color: text("color"),
  
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
  
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * طلبات التحويل بين البنود
 */
export const budgetTransfers = pgTable("budget_transfers", {
  id: text("id").primaryKey(),
  transferNumber: text("transfer_number").notNull().unique(),
  
  // المصدر والوجهة
  fromBudgetId: text("from_budget_id").notNull().references(() => budgetPlans.id),
  fromLineItemId: text("from_line_item_id").references(() => budgetLineItems.id),
  toBudgetId: text("to_budget_id").notNull().references(() => budgetPlans.id),
  toLineItemId: text("to_line_item_id").references(() => budgetLineItems.id),
  
  // المبلغ
  amount: decimal("amount").notNull(),
  
  // السبب
  reason: text("reason").notNull(),
  
  // الحالة
  status: text("status").default("pending"), // pending, approved, rejected, completed
  
  // الموافقة
  requestedBy: text("requested_by").references(() => users.id),
  approvedBy: text("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  rejectionReason: text("rejection_reason"),
  
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * طلبات زيادة الموازنة
 */
export const budgetRequests = pgTable("budget_requests", {
  id: text("id").primaryKey(),
  requestNumber: text("request_number").notNull().unique(),
  
  budgetId: text("budget_id").notNull().references(() => budgetPlans.id),
  lineItemId: text("line_item_id").references(() => budgetLineItems.id),
  
  // النوع
  requestType: text("request_type").default("increase"), // increase, new_item, reallocation
  
  // المبلغ
  currentAmount: decimal("current_amount"),
  requestedAmount: decimal("requested_amount").notNull(),
  
  // السبب
  justification: text("justification").notNull(),
  
  // المرفقات
  attachments: jsonb("attachments").$type<{ name: string; url: string }[]>(),
  
  // الحالة
  status: text("status").default("pending"), // pending, under_review, approved, rejected
  
  // الموافقة
  requestedBy: text("requested_by").references(() => users.id),
  reviewedBy: text("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"),
  
  approvedBy: text("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  approvedAmount: decimal("approved_amount"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * الصرف الفعلي
 */
export const budgetActuals = pgTable("budget_actuals", {
  id: text("id").primaryKey(),
  
  budgetId: text("budget_id").notNull().references(() => budgetPlans.id),
  lineItemId: text("line_item_id").references(() => budgetLineItems.id),
  
  // التفاصيل
  description: text("description").notNull(),
  
  // المبلغ
  amount: decimal("amount").notNull(),
  
  // التاريخ
  transactionDate: timestamp("transaction_date").notNull(),
  
  // المرجع
  referenceType: text("reference_type"), // invoice, voucher, expense, etc
  referenceId: text("reference_id"),
  
  // المورد
  vendor: text("vendor"),
  
  recordedBy: text("recorded_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * تقارير الموازنة
 */
export const budgetReports = pgTable("budget_reports", {
  id: text("id").primaryKey(),
  
  budgetId: text("budget_id").references(() => budgetPlans.id),
  
  // النوع
  reportType: text("report_type").default("variance"), // variance, utilization, forecast, comparison
  
  // الفترة
  periodType: text("period_type").default("monthly"), // monthly, quarterly, yearly
  periodStart: timestamp("period_start"),
  periodEnd: timestamp("period_end"),
  
  // البيانات
  reportData: jsonb("report_data"),
  
  // الملخص
  totalBudgeted: decimal("total_budgeted"),
  totalActual: decimal("total_actual"),
  variance: decimal("variance"),
  variancePercentage: decimal("variance_percentage"),
  
  generatedBy: text("generated_by").references(() => users.id),
  generatedAt: timestamp("generated_at").defaultNow(),
});

/**
 * تنبيهات الموازنة
 */
export const budgetAlerts = pgTable("budget_alerts", {
  id: text("id").primaryKey(),
  
  budgetId: text("budget_id").notNull().references(() => budgetPlans.id),
  lineItemId: text("line_item_id").references(() => budgetLineItems.id),
  
  // النوع
  alertType: text("alert_type").default("threshold"), // threshold, overspend, deadline, approval
  
  // الرسالة
  message: text("message").notNull(),
  
  // التفاصيل
  threshold: integer("threshold"),
  currentValue: decimal("current_value"),
  
  // الحالة
  status: text("status").default("active"), // active, acknowledged, resolved
  
  acknowledgedBy: text("acknowledged_by").references(() => users.id),
  acknowledgedAt: timestamp("acknowledged_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
});

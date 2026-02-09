/**
 * Schema - نظام الميزانية والتخطيط المالي
 */
import { pgTable, text, timestamp, boolean, jsonb, integer } from "drizzle-orm/pg-core";
import { users } from "./users";
import { branches } from "./branches";
import { departments } from "./departments";

/**
 * الميزانيات
 */
export const budgets = pgTable("budgets", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  
  // الفترة
  fiscalYear: integer("fiscal_year").notNull(),
  period: text("period").default("yearly"), // yearly, quarterly, monthly
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  
  // النطاق
  scope: text("scope").default("company"), // company, branch, department
  branchId: text("branch_id").references(() => branches.id),
  departmentId: text("department_id").references(() => departments.id),
  
  // المبالغ الإجمالية
  totalBudget: text("total_budget").notNull(),
  totalAllocated: text("total_allocated").default("0"),
  totalSpent: text("total_spent").default("0"),
  
  // الحالة
  status: text("status").default("draft"), // draft, pending_approval, approved, active, closed
  
  // الموافقة
  approvedBy: text("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  
  // الملاحظات
  notes: text("notes"),
  
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * بنود الميزانية
 */
export const budgetItems = pgTable("budget_items", {
  id: text("id").primaryKey(),
  budgetId: text("budget_id").notNull().references(() => budgets.id, { onDelete: "cascade" }),
  
  // التصنيف
  category: text("category").notNull(), // revenue, expense, capital
  subcategory: text("subcategory"),
  accountId: text("account_id"), // ربط مع الحسابات
  
  // الوصف
  name: text("name").notNull(),
  description: text("description"),
  
  // المبالغ
  budgetedAmount: text("budgeted_amount").notNull(),
  allocatedAmount: text("allocated_amount").default("0"),
  spentAmount: text("spent_amount").default("0"),
  
  // التوزيع الشهري
  monthlyBreakdown: jsonb("monthly_breakdown").$type<{ month: number; amount: string }[]>(),
  
  // الأولوية
  priority: text("priority").default("medium"), // high, medium, low
  isRequired: boolean("is_required").default(false),
  
  notes: text("notes"),
  
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * المصروفات الفعلية
 */
export const budgetExpenses = pgTable("budget_expenses", {
  id: text("id").primaryKey(),
  budgetId: text("budget_id").notNull().references(() => budgets.id),
  budgetItemId: text("budget_item_id").references(() => budgetItems.id),
  
  // التفاصيل
  description: text("description").notNull(),
  amount: text("amount").notNull(),
  expenseDate: timestamp("expense_date").notNull(),
  
  // المرجع
  referenceType: text("reference_type"), // invoice, voucher, purchase
  referenceId: text("reference_id"),
  referenceNumber: text("reference_number"),
  
  // المرفقات
  attachments: jsonb("attachments").$type<{ name: string; url: string }[]>(),
  
  // الحالة
  status: text("status").default("recorded"), // recorded, verified, disputed
  
  recordedBy: text("recorded_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * طلبات الصرف
 */
export const budgetRequests = pgTable("budget_requests", {
  id: text("id").primaryKey(),
  requestNumber: text("request_number").notNull().unique(),
  budgetId: text("budget_id").notNull().references(() => budgets.id),
  budgetItemId: text("budget_item_id").references(() => budgetItems.id),
  
  // الطلب
  title: text("title").notNull(),
  description: text("description"),
  amount: text("amount").notNull(),
  
  // المبررات
  justification: text("justification"),
  urgency: text("urgency").default("normal"), // low, normal, high, critical
  
  // الحالة
  status: text("status").default("pending"), // pending, approved, rejected, partially_approved
  
  // الموافقات
  approvals: jsonb("approvals").$type<{
    level: number;
    approverId: string;
    status: string;
    comment?: string;
    date: string;
  }[]>(),
  
  approvedAmount: text("approved_amount"),
  
  requestedBy: text("requested_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * تنبيهات الميزانية
 */
export const budgetAlerts = pgTable("budget_alerts", {
  id: text("id").primaryKey(),
  budgetId: text("budget_id").notNull().references(() => budgets.id),
  budgetItemId: text("budget_item_id").references(() => budgetItems.id),
  
  // نوع التنبيه
  alertType: text("alert_type").notNull(), // overspending, threshold_reached, underspending, anomaly
  
  // التفاصيل
  message: text("message").notNull(),
  severity: text("severity").default("warning"), // info, warning, critical
  
  // القيم
  thresholdValue: text("threshold_value"),
  currentValue: text("current_value"),
  
  // الحالة
  isRead: boolean("is_read").default(false),
  isResolved: boolean("is_resolved").default(false),
  resolvedBy: text("resolved_by").references(() => users.id),
  resolvedAt: timestamp("resolved_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * إعدادات الميزانية
 */
export const budgetSettings = pgTable("budget_settings", {
  id: text("id").primaryKey(),
  
  // الحدود
  warningThreshold: integer("warning_threshold").default(80), // نسبة مئوية
  criticalThreshold: integer("critical_threshold").default(95),
  
  // الموافقات
  requireApprovalAbove: text("require_approval_above"), // المبلغ الذي يحتاج موافقة
  approvalLevels: jsonb("approval_levels").$type<{ level: number; minAmount: string; approverRole: string }[]>(),
  
  // الإشعارات
  notifyOnThreshold: boolean("notify_on_threshold").default(true),
  notifyEmails: jsonb("notify_emails").$type<string[]>(),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

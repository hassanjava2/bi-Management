/**
 * Schema - نظام إدارة المصروفات
 */
import { pgTable, text, timestamp, boolean, jsonb, integer, decimal } from "drizzle-orm/pg-core";
import { users } from "./users";
import { departments } from "./departments";
import { branches } from "./branches";

/**
 * طلبات المصروفات
 */
export const expenseRequests = pgTable("expense_requests", {
  id: text("id").primaryKey(),
  requestNumber: text("request_number").notNull().unique(),
  
  // مقدم الطلب
  requesterId: text("requester_id").notNull().references(() => users.id),
  departmentId: text("department_id").references(() => departments.id),
  branchId: text("branch_id").references(() => branches.id),
  
  // المعلومات
  title: text("title").notNull(),
  description: text("description"),
  
  // التصنيف
  category: text("category").default("operational"), // operational, travel, equipment, marketing, training, other
  
  // المبلغ
  amount: decimal("amount").notNull(),
  currency: text("currency").default("IQD"),
  
  // التاريخ
  expenseDate: timestamp("expense_date"),
  
  // المورد/البائع
  vendorName: text("vendor_name"),
  vendorInvoice: text("vendor_invoice"),
  
  // المرفقات
  receipts: jsonb("receipts").$type<{ name: string; url: string }[]>(),
  
  // الحالة
  status: text("status").default("draft"), // draft, submitted, pending_approval, approved, rejected, paid, cancelled
  
  // الموافقات
  approvalLevel: integer("approval_level").default(0),
  currentApproverId: text("current_approver_id").references(() => users.id),
  
  // الدفع
  paymentMethod: text("payment_method"), // cash, bank_transfer, card, petty_cash
  paidAt: timestamp("paid_at"),
  paymentReference: text("payment_reference"),
  
  // سبب الرفض
  rejectionReason: text("rejection_reason"),
  
  submittedAt: timestamp("submitted_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * سجل الموافقات
 */
export const expenseApprovals = pgTable("expense_approvals", {
  id: text("id").primaryKey(),
  expenseId: text("expense_id").notNull().references(() => expenseRequests.id, { onDelete: "cascade" }),
  
  // المُوافق
  approverId: text("approver_id").notNull().references(() => users.id),
  approvalLevel: integer("approval_level").notNull(),
  
  // القرار
  decision: text("decision").notNull(), // approved, rejected
  comments: text("comments"),
  
  decidedAt: timestamp("decided_at").defaultNow(),
});

/**
 * فئات المصروفات
 */
export const expenseCategories = pgTable("expense_categories", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  nameEn: text("name_en"),
  description: text("description"),
  
  // الأب
  parentId: text("parent_id"),
  
  // الحدود
  monthlyLimit: decimal("monthly_limit"),
  requiresApproval: boolean("requires_approval").default(true),
  approvalThreshold: decimal("approval_threshold"),
  
  // الحساب المرتبط
  accountCode: text("account_code"),
  
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
  
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * سياسات المصروفات
 */
export const expensePolicies = pgTable("expense_policies", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  
  // النطاق
  departmentId: text("department_id").references(() => departments.id),
  
  // القواعد
  rules: jsonb("rules").$type<{
    maxAmount: number;
    requiresReceipt: boolean;
    requiresPreApproval: boolean;
    allowedCategories: string[];
  }>(),
  
  // مستويات الموافقة
  approvalLevels: jsonb("approval_levels").$type<{
    level: number;
    minAmount: number;
    maxAmount: number;
    approverRole: string;
  }[]>(),
  
  isActive: boolean("is_active").default(true),
  effectiveFrom: timestamp("effective_from"),
  effectiveTo: timestamp("effective_to"),
  
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * السلف والعهد النقدية
 */
export const cashAdvances = pgTable("cash_advances", {
  id: text("id").primaryKey(),
  advanceNumber: text("advance_number").notNull().unique(),
  
  // المستلم
  employeeId: text("employee_id").notNull().references(() => users.id),
  
  // المعلومات
  purpose: text("purpose").notNull(),
  description: text("description"),
  
  // المبلغ
  amount: decimal("amount").notNull(),
  currency: text("currency").default("IQD"),
  
  // الحالة
  status: text("status").default("pending"), // pending, approved, disbursed, settled, cancelled
  
  // التسوية
  settledAmount: decimal("settled_amount"),
  remainingAmount: decimal("remaining_amount"),
  settlementDeadline: timestamp("settlement_deadline"),
  settledAt: timestamp("settled_at"),
  
  // الموافقة
  approvedBy: text("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  
  // الصرف
  disbursedBy: text("disbursed_by").references(() => users.id),
  disbursedAt: timestamp("disbursed_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * تقارير المصروفات
 */
export const expenseReports = pgTable("expense_reports", {
  id: text("id").primaryKey(),
  reportNumber: text("report_number").notNull().unique(),
  
  // المعلومات
  title: text("title").notNull(),
  description: text("description"),
  
  // الفترة
  periodStart: timestamp("period_start"),
  periodEnd: timestamp("period_end"),
  
  // النطاق
  departmentId: text("department_id").references(() => departments.id),
  branchId: text("branch_id").references(() => branches.id),
  
  // المجاميع
  totalAmount: decimal("total_amount"),
  expenseCount: integer("expense_count"),
  
  // التفاصيل
  byCategory: jsonb("by_category").$type<Record<string, number>>(),
  byDepartment: jsonb("by_department").$type<Record<string, number>>(),
  
  // الحالة
  status: text("status").default("draft"), // draft, generated, approved
  
  generatedBy: text("generated_by").references(() => users.id),
  generatedAt: timestamp("generated_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
});

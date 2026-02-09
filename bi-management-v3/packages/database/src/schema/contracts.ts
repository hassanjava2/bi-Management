/**
 * Schema - نظام العقود
 */
import { pgTable, text, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { users } from "./users";
import { customers } from "./customers";
import { products } from "./products";
import { branches } from "./branches";

/**
 * أنواع العقود
 */
export const contractTypes = pgTable("contract_types", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  
  // مدة افتراضية
  defaultDurationMonths: integer("default_duration_months").default(12),
  
  // نوع الفوترة
  billingType: text("billing_type").default("monthly"), // monthly, quarterly, yearly, one_time
  
  // الخدمات المشمولة
  includedServices: jsonb("included_services").$type<string[]>(),
  
  // القالب
  termsTemplate: text("terms_template"),
  
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
  
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * العقود
 */
export const contracts = pgTable("contracts", {
  id: text("id").primaryKey(),
  contractNumber: text("contract_number").notNull().unique(), // CT-2026-000001
  
  // نوع العقد
  contractTypeId: text("contract_type_id").references(() => contractTypes.id),
  contractTypeName: text("contract_type_name"),
  
  // العميل
  customerId: text("customer_id").references(() => customers.id),
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone"),
  customerEmail: text("customer_email"),
  customerAddress: text("customer_address"),
  
  // الفرع
  branchId: text("branch_id").references(() => branches.id),
  
  // فترة العقد
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  
  // الحالة
  status: text("status").default("draft"), // draft, pending_approval, active, suspended, expired, terminated, renewed
  
  // القيمة المالية
  totalValue: text("total_value").notNull(), // القيمة الإجمالية
  billingType: text("billing_type").default("monthly"), // monthly, quarterly, yearly, one_time
  billingAmount: text("billing_amount"), // المبلغ لكل فترة
  
  // الدفعات
  paidAmount: text("paid_amount").default("0"),
  nextBillingDate: timestamp("next_billing_date"),
  
  // التجديد التلقائي
  autoRenew: boolean("auto_renew").default(false),
  renewalNotificationDays: integer("renewal_notification_days").default(30),
  renewalNotified: boolean("renewal_notified").default(false),
  
  // الشروط
  terms: text("terms"),
  specialConditions: text("special_conditions"),
  
  // SLA
  responseTimeHours: integer("response_time_hours"), // وقت الاستجابة
  resolutionTimeHours: integer("resolution_time_hours"), // وقت الحل
  
  // التوقيع
  signedAt: timestamp("signed_at"),
  signedBy: text("signed_by"),
  signatureUrl: text("signature_url"),
  
  // المرفقات
  attachments: jsonb("attachments").$type<{ name: string; url: string; type: string }[]>(),
  
  // الملاحظات
  notes: text("notes"),
  internalNotes: text("internal_notes"),
  
  // الموظفين
  createdBy: text("created_by").references(() => users.id),
  approvedBy: text("approved_by").references(() => users.id),
  accountManager: text("account_manager").references(() => users.id),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * الأجهزة/المنتجات المشمولة بالعقد
 */
export const contractItems = pgTable("contract_items", {
  id: text("id").primaryKey(),
  contractId: text("contract_id").notNull().references(() => contracts.id, { onDelete: "cascade" }),
  
  // المنتج
  productId: text("product_id").references(() => products.id),
  productName: text("product_name").notNull(),
  serialNumber: text("serial_number"),
  
  // التفاصيل
  description: text("description"),
  location: text("location"), // موقع الجهاز
  
  // التغطية
  coverageType: text("coverage_type").default("full"), // full, parts_only, labor_only
  
  // القيمة
  itemValue: text("item_value"),
  
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * الخدمات المشمولة بالعقد
 */
export const contractServices = pgTable("contract_services", {
  id: text("id").primaryKey(),
  contractId: text("contract_id").notNull().references(() => contracts.id, { onDelete: "cascade" }),
  
  serviceName: text("service_name").notNull(),
  description: text("description"),
  
  // التكرار
  frequency: text("frequency"), // monthly, quarterly, yearly, on_demand
  
  // عدد الزيارات/الخدمات
  includedQuantity: integer("included_quantity"), // null = غير محدود
  usedQuantity: integer("used_quantity").default(0),
  
  // التكلفة الإضافية
  extraCostPerUnit: text("extra_cost_per_unit"),
  
  isActive: boolean("is_active").default(true),
  
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * سجل خدمات العقد
 */
export const contractServiceLogs = pgTable("contract_service_logs", {
  id: text("id").primaryKey(),
  contractId: text("contract_id").notNull().references(() => contracts.id),
  contractServiceId: text("contract_service_id").references(() => contractServices.id),
  
  // نوع الخدمة
  serviceType: text("service_type").notNull(), // maintenance, support, visit, repair, other
  description: text("description"),
  
  // التاريخ
  serviceDate: timestamp("service_date").notNull(),
  completedAt: timestamp("completed_at"),
  
  // الفني
  technicianId: text("technician_id").references(() => users.id),
  technicianName: text("technician_name"),
  
  // الحالة
  status: text("status").default("scheduled"), // scheduled, in_progress, completed, cancelled
  
  // التكلفة
  isCovered: boolean("is_covered").default(true), // مشمول بالعقد أم لا
  additionalCost: text("additional_cost").default("0"),
  
  // تقرير الخدمة
  reportNotes: text("report_notes"),
  customerSignature: text("customer_signature"),
  
  // المرفقات
  attachments: jsonb("attachments").$type<{ name: string; url: string }[]>(),
  
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * فواتير العقد
 */
export const contractInvoices = pgTable("contract_invoices", {
  id: text("id").primaryKey(),
  contractId: text("contract_id").notNull().references(() => contracts.id),
  
  invoiceNumber: text("invoice_number"),
  invoiceId: text("invoice_id"), // رابط للفاتورة الفعلية
  
  // الفترة
  periodStart: timestamp("period_start"),
  periodEnd: timestamp("period_end"),
  
  // المبلغ
  amount: text("amount").notNull(),
  
  // الحالة
  status: text("status").default("pending"), // pending, paid, overdue, cancelled
  dueDate: timestamp("due_date"),
  paidAt: timestamp("paid_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * سجل أنشطة العقد
 */
export const contractActivities = pgTable("contract_activities", {
  id: text("id").primaryKey(),
  contractId: text("contract_id").notNull().references(() => contracts.id),
  
  activityType: text("activity_type").notNull(), // created, approved, activated, suspended, renewed, terminated, service_performed
  description: text("description"),
  
  performedBy: text("performed_by").references(() => users.id),
  metadata: jsonb("metadata").$type<Record<string, any>>(),
  
  createdAt: timestamp("created_at").defaultNow(),
});

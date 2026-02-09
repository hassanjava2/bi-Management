/**
 * Schema - نظام الاشتراكات والخدمات المتكررة
 */
import { pgTable, text, timestamp, boolean, jsonb, integer } from "drizzle-orm/pg-core";
import { users } from "./users";
import { customers } from "./customers";

/**
 * خطط الاشتراك
 */
export const subscriptionPlans = pgTable("subscription_plans", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  nameAr: text("name_ar"),
  description: text("description"),
  
  // التسعير
  price: text("price").notNull(),
  currency: text("currency").default("IQD"),
  
  // الدورة
  billingCycle: text("billing_cycle").default("monthly"), // daily, weekly, monthly, quarterly, yearly
  billingInterval: integer("billing_interval").default(1), // كل X فترة
  
  // المميزات
  features: jsonb("features").$type<string[]>(),
  limits: jsonb("limits").$type<{ key: string; value: number; label: string }[]>(),
  
  // الإعدادات
  trialDays: integer("trial_days").default(0),
  setupFee: text("setup_fee"),
  
  isActive: boolean("is_active").default(true),
  isPublic: boolean("is_public").default(true),
  sortOrder: integer("sort_order").default(0),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * اشتراكات العملاء
 */
export const subscriptions = pgTable("subscriptions", {
  id: text("id").primaryKey(),
  subscriptionNumber: text("subscription_number").notNull().unique(),
  
  // العميل
  customerId: text("customer_id").references(() => customers.id),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email"),
  customerPhone: text("customer_phone"),
  
  // الخطة
  planId: text("plan_id").references(() => subscriptionPlans.id),
  planName: text("plan_name").notNull(),
  
  // التسعير
  price: text("price").notNull(),
  currency: text("currency").default("IQD"),
  
  // الحالة
  status: text("status").default("pending"), // pending, trial, active, past_due, paused, cancelled, expired
  
  // التواريخ
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  trialEndsAt: timestamp("trial_ends_at"),
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  cancelledAt: timestamp("cancelled_at"),
  pausedAt: timestamp("paused_at"),
  
  // الفوترة
  nextBillingDate: timestamp("next_billing_date"),
  lastBillingDate: timestamp("last_billing_date"),
  billingCycle: text("billing_cycle").default("monthly"),
  
  // الإلغاء
  cancellationReason: text("cancellation_reason"),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
  
  // التجديد التلقائي
  autoRenew: boolean("auto_renew").default(true),
  
  // الملاحظات
  notes: text("notes"),
  internalNotes: text("internal_notes"),
  
  // البيانات الإضافية
  metadata: jsonb("metadata").$type<Record<string, any>>(),
  
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * فواتير الاشتراك
 */
export const subscriptionInvoices = pgTable("subscription_invoices", {
  id: text("id").primaryKey(),
  invoiceNumber: text("invoice_number").notNull().unique(),
  subscriptionId: text("subscription_id").notNull().references(() => subscriptions.id),
  
  // الفترة
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  
  // المبالغ
  subtotal: text("subtotal").notNull(),
  discount: text("discount").default("0"),
  tax: text("tax").default("0"),
  total: text("total").notNull(),
  
  // الحالة
  status: text("status").default("draft"), // draft, pending, paid, overdue, cancelled, refunded
  dueDate: timestamp("due_date"),
  paidAt: timestamp("paid_at"),
  
  // الدفع
  paymentMethod: text("payment_method"),
  paymentReference: text("payment_reference"),
  
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * سجل نشاط الاشتراك
 */
export const subscriptionActivities = pgTable("subscription_activities", {
  id: text("id").primaryKey(),
  subscriptionId: text("subscription_id").notNull().references(() => subscriptions.id, { onDelete: "cascade" }),
  
  activityType: text("activity_type").notNull(), // created, activated, renewed, upgraded, downgraded, paused, resumed, cancelled, payment_received, payment_failed
  description: text("description"),
  
  metadata: jsonb("metadata").$type<Record<string, any>>(),
  performedBy: text("performed_by").references(() => users.id),
  
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * تذكيرات التجديد
 */
export const subscriptionReminders = pgTable("subscription_reminders", {
  id: text("id").primaryKey(),
  subscriptionId: text("subscription_id").notNull().references(() => subscriptions.id),
  
  reminderType: text("reminder_type").notNull(), // renewal, expiry, payment_due
  scheduledFor: timestamp("scheduled_for").notNull(),
  
  sentAt: timestamp("sent_at"),
  channel: text("channel").default("email"), // email, sms, both
  
  createdAt: timestamp("created_at").defaultNow(),
});

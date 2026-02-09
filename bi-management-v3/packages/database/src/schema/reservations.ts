/**
 * Schema - نظام الحجوزات
 */
import { pgTable, text, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { users } from "./users";
import { customers } from "./customers";
import { products } from "./products";
import { branches } from "./branches";

/**
 * الحجوزات
 */
export const reservations = pgTable("reservations", {
  id: text("id").primaryKey(),
  reservationNumber: text("reservation_number").notNull().unique(), // RSV-2026-000001
  
  // العميل
  customerId: text("customer_id").references(() => customers.id),
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone"),
  customerEmail: text("customer_email"),
  
  // الفرع
  branchId: text("branch_id").references(() => branches.id),
  
  // الحالة
  status: text("status").default("pending"), // pending, confirmed, ready, completed, cancelled, expired
  
  // التواريخ
  reservationDate: timestamp("reservation_date").defaultNow(),
  expiresAt: timestamp("expires_at"), // تاريخ انتهاء الحجز
  confirmedAt: timestamp("confirmed_at"),
  completedAt: timestamp("completed_at"),
  cancelledAt: timestamp("cancelled_at"),
  
  // المبالغ
  totalAmount: text("total_amount").default("0"),
  depositAmount: text("deposit_amount").default("0"), // العربون
  depositPaid: boolean("deposit_paid").default(false),
  depositPaidAt: timestamp("deposit_paid_at"),
  
  // الملاحظات
  notes: text("notes"),
  internalNotes: text("internal_notes"),
  cancellationReason: text("cancellation_reason"),
  
  // التحويل للفاتورة
  convertedToInvoice: boolean("converted_to_invoice").default(false),
  invoiceId: text("invoice_id"),
  
  // الموظفين
  createdBy: text("created_by").references(() => users.id),
  confirmedBy: text("confirmed_by").references(() => users.id),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * عناصر الحجز
 */
export const reservationItems = pgTable("reservation_items", {
  id: text("id").primaryKey(),
  reservationId: text("reservation_id").notNull().references(() => reservations.id, { onDelete: "cascade" }),
  
  // المنتج
  productId: text("product_id").references(() => products.id),
  productName: text("product_name").notNull(),
  productSku: text("product_sku"),
  
  // الكمية والسعر
  quantity: integer("quantity").notNull().default(1),
  unitPrice: text("unit_price").notNull(),
  totalPrice: text("total_price").notNull(),
  
  // السيريالات المحجوزة
  reservedSerials: jsonb("reserved_serials").$type<string[]>(),
  
  // الحالة
  status: text("status").default("reserved"), // reserved, released, delivered
  
  notes: text("notes"),
  
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * سجل نشاط الحجز
 */
export const reservationActivities = pgTable("reservation_activities", {
  id: text("id").primaryKey(),
  reservationId: text("reservation_id").notNull().references(() => reservations.id, { onDelete: "cascade" }),
  
  activityType: text("activity_type").notNull(), // created, confirmed, deposit_paid, ready, completed, cancelled, expired, extended
  description: text("description"),
  
  performedBy: text("performed_by").references(() => users.id),
  metadata: jsonb("metadata").$type<Record<string, any>>(),
  
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * إعدادات الحجز
 */
export const reservationSettings = pgTable("reservation_settings", {
  id: text("id").primaryKey(),
  branchId: text("branch_id").references(() => branches.id),
  
  // مدة الحجز الافتراضية (بالأيام)
  defaultExpiryDays: integer("default_expiry_days").default(7),
  
  // العربون
  depositRequired: boolean("deposit_required").default(false),
  depositPercentage: integer("deposit_percentage").default(10), // نسبة من المبلغ
  minDepositAmount: text("min_deposit_amount"),
  
  // التذكيرات
  sendExpiryReminder: boolean("send_expiry_reminder").default(true),
  reminderDaysBefore: integer("reminder_days_before").default(2),
  
  // الإلغاء التلقائي
  autoCancel: boolean("auto_cancel").default(true),
  autoCancelAfterDays: integer("auto_cancel_after_days").default(1),
  
  // قواعد إضافية
  maxReservationsPerCustomer: integer("max_reservations_per_customer"),
  allowPartialPickup: boolean("allow_partial_pickup").default(true),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * نظام تتبع المرتجعات
 * Returns Tracking System
 */
import {
  pgTable,
  varchar,
  text,
  timestamp,
  decimal,
  integer,
  boolean,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { suppliers } from "./suppliers";
import { products } from "./products";
import { serialNumbers } from "./serial-numbers";

/**
 * المرتجعات الأساسية (للتوافق مع return-items)
 */
export const returns = pgTable("returns", {
  id: text("id").primaryKey(),
  returnNumber: text("return_number").unique(),
  customerId: text("customer_id"),
  invoiceId: text("invoice_id"),
  returnDate: timestamp("return_date").defaultNow(),
  status: text("status").default("pending"), // pending, approved, rejected, completed
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }),
  notes: text("notes"),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("returns_customer_id_idx").on(table.customerId),
  index("returns_invoice_id_idx").on(table.invoiceId),
  index("returns_status_idx").on(table.status),
  index("returns_created_at_idx").on(table.createdAt),
  index("returns_return_date_idx").on(table.returnDate),
]);

/**
 * طلبات المرتجعات للموردين (نظام التتبع)
 */
export const returnRequests = pgTable("return_requests", {
  id: varchar("id", { length: 36 }).primaryKey(),
  
  // رقم المرتجع التسلسلي
  returnNumber: varchar("return_number", { length: 50 }).unique().notNull(),
  
  // المورد
  supplierId: varchar("supplier_id", { length: 36 }).references(() => suppliers.id),
  supplierName: varchar("supplier_name", { length: 255 }),
  
  // نوع المرتجع
  returnType: varchar("return_type", { length: 50 }).default("defective"), // defective, warranty, exchange, other
  
  // الحالة
  status: varchar("status", { length: 50 }).default("pending"), // pending, sent, received, resolved, cancelled
  
  // تصنيف اللون (للتنبيهات)
  colorCode: varchar("color_code", { length: 20 }).default("green"), // green, yellow, orange, red
  
  // تواريخ
  createdAt: timestamp("created_at").defaultNow(),
  sentAt: timestamp("sent_at"),
  receivedAt: timestamp("received_at"),
  resolvedAt: timestamp("resolved_at"),
  
  // المُنشئ
  createdBy: varchar("created_by", { length: 36 }).references(() => users.id),
  
  // ملاحظات
  notes: text("notes"),
  internalNotes: text("internal_notes"),
  
  // صور قبل الإرسال
  photosBefore: jsonb("photos_before").$type<string[]>(),
  
  // معلومات الشحن
  shippingMethod: varchar("shipping_method", { length: 100 }),
  trackingNumber: varchar("tracking_number", { length: 100 }),
  shippingCost: decimal("shipping_cost", { precision: 12, scale: 2 }),
  
  // الإجمالي
  totalItems: integer("total_items").default(0),
  
  // تاريخ آخر تذكير
  lastReminderAt: timestamp("last_reminder_at"),
  reminderCount: integer("reminder_count").default(0),
  
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("return_requests_supplier_id_idx").on(table.supplierId),
  index("return_requests_created_by_idx").on(table.createdBy),
  index("return_requests_status_idx").on(table.status),
  index("return_requests_return_type_idx").on(table.returnType),
  index("return_requests_color_code_idx").on(table.colorCode),
  index("return_requests_created_at_idx").on(table.createdAt),
  index("return_requests_sent_at_idx").on(table.sentAt),
  index("return_requests_received_at_idx").on(table.receivedAt),
  index("return_requests_resolved_at_idx").on(table.resolvedAt),
]);

/**
 * عناصر المرتجع
 */
export const returnItems = pgTable("return_items", {
  id: varchar("id", { length: 36 }).primaryKey(),
  
  // طلب المرتجع
  returnRequestId: varchar("return_request_id", { length: 36 })
    .references(() => returnRequests.id)
    .notNull(),
  
  // المنتج
  productId: varchar("product_id", { length: 36 }).references(() => products.id),
  productName: varchar("product_name", { length: 255 }),
  productModel: varchar("product_model", { length: 255 }),
  
  // السيريال (إن وجد)
  serialId: varchar("serial_id", { length: 36 }).references(() => serialNumbers.id),
  serialNumber: varchar("serial_number", { length: 100 }),
  
  // الكمية (للمنتجات بدون سيريال)
  quantity: integer("quantity").default(1),
  
  // سبب الإرجاع
  returnReason: varchar("return_reason", { length: 100 }), // defective, wrong_item, damaged, other
  reasonDetails: text("reason_details"),
  
  // حالة العنصر
  itemStatus: varchar("item_status", { length: 50 }).default("pending"), // pending, sent, received, repaired, replaced, rejected
  
  // نتيجة المعالجة
  resolution: varchar("resolution", { length: 50 }), // repaired, replaced, refunded, rejected
  resolutionNotes: text("resolution_notes"),
  resolvedAt: timestamp("resolved_at"),
  
  // سيريال البديل (في حالة الاستبدال)
  replacementSerialId: varchar("replacement_serial_id", { length: 36 }),
  replacementSerialNumber: varchar("replacement_serial_number", { length: 100 }),
  
  // صور
  photos: jsonb("photos").$type<string[]>(),
  
  // تكلفة الإصلاح (إن وجدت)
  repairCost: decimal("repair_cost", { precision: 12, scale: 2 }),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("return_items_return_request_id_idx").on(table.returnRequestId),
  index("return_items_product_id_idx").on(table.productId),
  index("return_items_serial_id_idx").on(table.serialId),
  index("return_items_item_status_idx").on(table.itemStatus),
  index("return_items_return_reason_idx").on(table.returnReason),
  index("return_items_created_at_idx").on(table.createdAt),
]);

/**
 * سجل حركات المرتجعات
 */
export const returnHistory = pgTable("return_history", {
  id: varchar("id", { length: 36 }).primaryKey(),
  
  // طلب المرتجع
  returnRequestId: varchar("return_request_id", { length: 36 })
    .references(() => returnRequests.id)
    .notNull(),
  
  // عنصر المرتجع (اختياري)
  returnItemId: varchar("return_item_id", { length: 36 })
    .references(() => returnItems.id),
  
  // نوع الحدث
  eventType: varchar("event_type", { length: 50 }).notNull(),
  // created, sent, reminder_sent, received, item_resolved, resolved, cancelled, note_added, photo_added
  
  // الحالة قبل/بعد
  fromStatus: varchar("from_status", { length: 50 }),
  toStatus: varchar("to_status", { length: 50 }),
  
  // التفاصيل
  details: text("details"),
  metadata: jsonb("metadata"),
  
  // المنفذ
  performedBy: varchar("performed_by", { length: 36 }).references(() => users.id),
  performedAt: timestamp("performed_at").defaultNow(),
}, (table) => [
  index("return_history_return_request_id_idx").on(table.returnRequestId),
  index("return_history_return_item_id_idx").on(table.returnItemId),
  index("return_history_performed_by_idx").on(table.performedBy),
  index("return_history_event_type_idx").on(table.eventType),
  index("return_history_performed_at_idx").on(table.performedAt),
]);

/**
 * إعدادات تنبيهات المرتجعات
 */
export const returnAlertSettings = pgTable("return_alert_settings", {
  id: varchar("id", { length: 36 }).primaryKey(),
  
  // الأيام للتنبيه
  yellowDays: integer("yellow_days").default(7), // تنبيه أصفر
  orangeDays: integer("orange_days").default(14), // تصعيد برتقالي
  redDays: integer("red_days").default(30), // إنذار أحمر
  
  // قنوات التنبيه
  enableEmailAlerts: boolean("enable_email_alerts").default(true),
  enableSmsAlerts: boolean("enable_sms_alerts").default(false),
  enableWhatsappAlerts: boolean("enable_whatsapp_alerts").default(false),
  enableSystemAlerts: boolean("enable_system_alerts").default(true),
  
  // المستلمين
  alertRecipients: jsonb("alert_recipients").$type<string[]>(), // user IDs
  
  // تكرار التذكير
  reminderIntervalDays: integer("reminder_interval_days").default(3),
  maxReminders: integer("max_reminders").default(5),
  
  // إعدادات التقارير
  autoReportEnabled: boolean("auto_report_enabled").default(false),
  autoReportFrequency: varchar("auto_report_frequency", { length: 20 }).default("weekly"), // daily, weekly, monthly
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * قوالب رسائل المرتجعات
 */
export const returnMessageTemplates = pgTable("return_message_templates", {
  id: varchar("id", { length: 36 }).primaryKey(),
  
  // نوع القالب
  templateType: varchar("template_type", { length: 50 }).notNull(), // reminder, escalation, follow_up, thank_you
  
  // القناة
  channel: varchar("channel", { length: 50 }).notNull(), // email, sms, whatsapp, system
  
  // اللغة
  language: varchar("language", { length: 10 }).default("ar"),
  
  // العنوان
  subject: varchar("subject", { length: 255 }),
  
  // المحتوى (يدعم المتغيرات)
  content: text("content").notNull(),
  // المتغيرات: {{return_number}}, {{supplier_name}}, {{days_pending}}, {{items_count}}, {{link}}
  
  // نشط
  isActive: boolean("is_active").default(true),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("return_message_templates_template_type_idx").on(table.templateType),
  index("return_message_templates_channel_idx").on(table.channel),
  index("return_message_templates_is_active_idx").on(table.isActive),
]);

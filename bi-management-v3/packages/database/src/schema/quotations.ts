/**
 * Schema - نظام عروض الأسعار
 */
import { pgTable, text, timestamp, integer, boolean, jsonb, index } from "drizzle-orm/pg-core";
import { users } from "./users";
import { customers } from "./customers";
import { products } from "./products";
import { branches } from "./branches";

/**
 * عروض الأسعار
 */
export const quotations = pgTable("quotations", {
  id: text("id").primaryKey(),
  quotationNumber: text("quotation_number").notNull().unique(), // QT-2026-000001
  
  // العميل
  customerId: text("customer_id").references(() => customers.id),
  customerName: text("customer_name"),
  customerPhone: text("customer_phone"),
  customerEmail: text("customer_email"),
  customerAddress: text("customer_address"),
  
  // الفرع
  branchId: text("branch_id").references(() => branches.id),
  
  // الموظف
  createdBy: text("created_by").references(() => users.id),
  assignedTo: text("assigned_to").references(() => users.id),
  
  // التواريخ
  quotationDate: timestamp("quotation_date").defaultNow(),
  validUntil: timestamp("valid_until"), // تاريخ انتهاء الصلاحية
  
  // الحالة
  status: text("status").default("draft"), // draft, sent, viewed, accepted, rejected, expired, converted
  
  // المبالغ
  subtotal: text("subtotal").default("0"),
  discountType: text("discount_type"), // percentage, fixed
  discountValue: text("discount_value").default("0"),
  discountAmount: text("discount_amount").default("0"),
  taxRate: text("tax_rate").default("0"),
  taxAmount: text("tax_amount").default("0"),
  totalAmount: text("total_amount").default("0"),
  
  // العملة
  currency: text("currency").default("IQD"),
  
  // الشروط والملاحظات
  terms: text("terms"),
  notes: text("notes"),
  internalNotes: text("internal_notes"),
  
  // التحويل للفاتورة
  convertedToInvoice: boolean("converted_to_invoice").default(false),
  invoiceId: text("invoice_id"),
  convertedAt: timestamp("converted_at"),
  
  // المتابعة
  followUpDate: timestamp("follow_up_date"),
  lastContactedAt: timestamp("last_contacted_at"),
  contactAttempts: integer("contact_attempts").default(0),
  
  // Metadata
  attachments: jsonb("attachments").$type<{ name: string; url: string }[]>(),
  customFields: jsonb("custom_fields").$type<Record<string, any>>(),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("quotations_customer_id_idx").on(table.customerId),
  index("quotations_branch_id_idx").on(table.branchId),
  index("quotations_created_by_idx").on(table.createdBy),
  index("quotations_assigned_to_idx").on(table.assignedTo),
  index("quotations_status_idx").on(table.status),
  index("quotations_created_at_idx").on(table.createdAt),
  index("quotations_quotation_date_idx").on(table.quotationDate),
  index("quotations_valid_until_idx").on(table.validUntil),
  index("quotations_follow_up_date_idx").on(table.followUpDate),
  index("quotations_converted_to_invoice_idx").on(table.convertedToInvoice),
  index("quotations_invoice_id_idx").on(table.invoiceId),
]);

/**
 * عناصر عرض السعر
 */
export const quotationItems = pgTable("quotation_items", {
  id: text("id").primaryKey(),
  quotationId: text("quotation_id").notNull().references(() => quotations.id, { onDelete: "cascade" }),
  
  // المنتج
  productId: text("product_id").references(() => products.id),
  productName: text("product_name").notNull(),
  productSku: text("product_sku"),
  description: text("description"),
  
  // الكمية والسعر
  quantity: integer("quantity").notNull().default(1),
  unitPrice: text("unit_price").notNull(),
  
  // الخصم
  discountType: text("discount_type"), // percentage, fixed
  discountValue: text("discount_value").default("0"),
  discountAmount: text("discount_amount").default("0"),
  
  // المجموع
  lineTotal: text("line_total").notNull(),
  
  // ترتيب العرض
  sortOrder: integer("sort_order").default(0),
  
  // ملاحظات
  notes: text("notes"),
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("quotation_items_quotation_id_idx").on(table.quotationId),
  index("quotation_items_product_id_idx").on(table.productId),
  index("quotation_items_created_at_idx").on(table.createdAt),
]);

/**
 * سجل أنشطة العرض
 */
export const quotationActivities = pgTable("quotation_activities", {
  id: text("id").primaryKey(),
  quotationId: text("quotation_id").notNull().references(() => quotations.id, { onDelete: "cascade" }),
  
  activityType: text("activity_type").notNull(), // created, sent, viewed, followed_up, status_changed, converted
  description: text("description"),
  
  // من قام بالنشاط
  performedBy: text("performed_by").references(() => users.id),
  
  // بيانات إضافية
  metadata: jsonb("metadata").$type<Record<string, any>>(),
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("quotation_activities_quotation_id_idx").on(table.quotationId),
  index("quotation_activities_performed_by_idx").on(table.performedBy),
  index("quotation_activities_activity_type_idx").on(table.activityType),
  index("quotation_activities_created_at_idx").on(table.createdAt),
]);

/**
 * قوالب عروض الأسعار
 */
export const quotationTemplates = pgTable("quotation_templates", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  
  // المحتوى الافتراضي
  defaultTerms: text("default_terms"),
  defaultNotes: text("default_notes"),
  validityDays: integer("validity_days").default(30),
  
  // العناصر الافتراضية
  defaultItems: jsonb("default_items").$type<{
    productId?: string;
    productName: string;
    quantity: number;
    unitPrice: string;
  }[]>(),
  
  // التخصيص
  headerHtml: text("header_html"),
  footerHtml: text("footer_html"),
  
  isActive: boolean("is_active").default(true),
  isDefault: boolean("is_default").default(false),
  
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("quotation_templates_created_by_idx").on(table.createdBy),
  index("quotation_templates_is_active_idx").on(table.isActive),
  index("quotation_templates_is_default_idx").on(table.isDefault),
]);

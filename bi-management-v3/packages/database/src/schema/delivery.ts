/**
 * نظام التوصيل والشحن
 * ─────────────────────
 * - شركات التوصيل (برايم، جني، تكسي، استلام شخصي)
 * - الشحنات وتتبعها
 * - فيديو التغليف الإلزامي
 * - المبالغ المعلقة والتحصيل
 */

import { pgTable, text, integer, real, timestamp } from "drizzle-orm/pg-core";
import { users } from "./users";
import { invoices } from "./invoices";
import { customers } from "./customers";

/**
 * شركات التوصيل
 */
export const deliveryCompanies = pgTable("delivery_companies", {
  id: text("id").primaryKey(),
  code: text("code").unique(),
  name: text("name").notNull(),
  nameAr: text("name_ar"),
  
  type: text("type").notNull().default("company"),
  // company: شركة توصيل (برايم)
  // platform: منصة أقساط (جني - يستلمون)
  // taxi: تكسي
  // pickup: استلام شخصي
  
  // معلومات التواصل
  phone: text("phone"),
  phone2: text("phone2"),
  email: text("email"),
  address: text("address"),
  contactPerson: text("contact_person"),
  
  // الحساب المالي
  balance: real("balance").default(0), // المبلغ المعلق عندهم
  pendingOrders: integer("pending_orders").default(0),
  
  // نسب وعمولات
  feeType: text("fee_type").default("fixed"), // fixed, percentage
  feeAmount: real("fee_amount").default(0), // أجرة ثابتة أو نسبة
  
  // إعدادات
  requiresVideo: integer("requires_video").default(1), // فيديو التغليف إلزامي
  autoTrack: integer("auto_track").default(0), // تتبع تلقائي عبر API
  apiEndpoint: text("api_endpoint"),
  apiKey: text("api_key"),
  
  notes: text("notes"),
  isActive: integer("is_active").default(1),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * الشحنات
 */
export const shipments = pgTable("shipments", {
  id: text("id").primaryKey(),
  shipmentNumber: text("shipment_number").notNull().unique(),
  
  // الفاتورة المرتبطة
  invoiceId: text("invoice_id")
    .notNull()
    .references(() => invoices.id),
  
  // شركة التوصيل
  deliveryCompanyId: text("delivery_company_id")
    .notNull()
    .references(() => deliveryCompanies.id),
  
  // العميل
  customerId: text("customer_id").references(() => customers.id),
  
  // الحالة
  status: text("status").notNull().default("preparing"),
  // preparing: قيد التجهيز
  // ready: جاهزة للتسليم
  // handed_over: سُلمت لشركة التوصيل
  // in_transit: في الطريق
  // delivered: تم التسليم
  // returned: مرتجع
  // partially_returned: مرتجع جزئي
  // cancelled: ملغية
  
  // رقم التتبع
  trackingNumber: text("tracking_number"),
  externalTrackingUrl: text("external_tracking_url"),
  
  // العنوان
  recipientName: text("recipient_name"),
  recipientPhone: text("recipient_phone"),
  recipientPhone2: text("recipient_phone2"),
  deliveryAddress: text("delivery_address"),
  city: text("city"),
  area: text("area"),
  notes: text("notes"),
  
  // المبالغ
  codAmount: real("cod_amount").default(0), // المبلغ المطلوب تحصيله (Cash on Delivery)
  deliveryFee: real("delivery_fee").default(0), // أجرة التوصيل
  collectedAmount: real("collected_amount").default(0), // المبلغ المحصّل فعلياً
  
  // التواريخ
  preparedAt: timestamp("prepared_at"),
  handedOverAt: timestamp("handed_over_at"),
  deliveredAt: timestamp("delivered_at"),
  returnedAt: timestamp("returned_at"),
  expectedDeliveryDate: timestamp("expected_delivery_date"),
  
  // الموظفين
  preparedBy: text("prepared_by").references(() => users.id),
  handedOverBy: text("handed_over_by").references(() => users.id),
  
  // وسائط التوثيق
  packagingVideoUrl: text("packaging_video_url"), // فيديو التغليف
  packagingPhotos: text("packaging_photos"), // JSON array of photo URLs
  deliveryProofPhoto: text("delivery_proof_photo"), // صورة إثبات التسليم
  
  // ملاحظات
  internalNotes: text("internal_notes"),
  deliveryNotes: text("delivery_notes"), // ملاحظات للسائق
  returnReason: text("return_reason"),
  
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * سجل تتبع الشحنة
 */
export const shipmentTracking = pgTable("shipment_tracking", {
  id: text("id").primaryKey(),
  shipmentId: text("shipment_id")
    .notNull()
    .references(() => shipments.id, { onDelete: "cascade" }),
  
  status: text("status").notNull(),
  statusAr: text("status_ar"),
  location: text("location"),
  description: text("description"),
  
  // المصدر
  source: text("source").default("manual"), // manual, api, webhook
  externalId: text("external_id"),
  
  recordedBy: text("recorded_by").references(() => users.id),
  recordedAt: timestamp("recorded_at").defaultNow(),
});

/**
 * بنود الشحنة (الأجهزة)
 */
export const shipmentItems = pgTable("shipment_items", {
  id: text("id").primaryKey(),
  shipmentId: text("shipment_id")
    .notNull()
    .references(() => shipments.id, { onDelete: "cascade" }),
  
  invoiceItemId: text("invoice_item_id"),
  serialNumber: text("serial_number"),
  productName: text("product_name"),
  quantity: integer("quantity").default(1),
  
  // حالة البند
  status: text("status").default("included"),
  // included: ضمن الشحنة
  // delivered: تم تسليمه
  // returned: مرتجع
  
  returnReason: text("return_reason"),
  returnCondition: text("return_condition"), // good, damaged, missing_parts
  
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * تحصيلات شركات التوصيل
 */
export const deliveryCollections = pgTable("delivery_collections", {
  id: text("id").primaryKey(),
  collectionNumber: text("collection_number").unique(),
  
  deliveryCompanyId: text("delivery_company_id")
    .notNull()
    .references(() => deliveryCompanies.id),
  
  // المبالغ
  expectedAmount: real("expected_amount").notNull(),
  receivedAmount: real("received_amount").notNull(),
  difference: real("difference").default(0),
  
  // طريقة الاستلام
  paymentMethod: text("payment_method"), // cash, transfer, check
  referenceNumber: text("reference_number"),
  bankName: text("bank_name"),
  
  // الشحنات المشمولة
  shipmentsCount: integer("shipments_count").default(0),
  shipmentIds: text("shipment_ids"), // JSON array
  
  notes: text("notes"),
  
  receivedBy: text("received_by").references(() => users.id),
  receivedAt: timestamp("received_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * مناطق التوصيل وأسعارها
 */
export const deliveryZones = pgTable("delivery_zones", {
  id: text("id").primaryKey(),
  deliveryCompanyId: text("delivery_company_id")
    .notNull()
    .references(() => deliveryCompanies.id, { onDelete: "cascade" }),
  
  zoneName: text("zone_name").notNull(),
  zoneNameAr: text("zone_name_ar"),
  cities: text("cities"), // JSON array of cities
  
  fee: real("fee").notNull(),
  estimatedDays: integer("estimated_days").default(1),
  
  isActive: integer("is_active").default(1),
  createdAt: timestamp("created_at").defaultNow(),
});

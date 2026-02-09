/**
 * نظام إدارة القطع والترقيات
 * Parts & Upgrades System
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
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { products } from "./products";
import { serialNumbers } from "./serial-numbers";
import { warehouses } from "./warehouses";
import { invoices } from "./invoices";

/**
 * أنواع القطع
 */
export const partTypes = pgTable("part_types", {
  id: varchar("id", { length: 36 }).primaryKey(),
  
  // الاسم
  name: varchar("name", { length: 100 }).notNull(), // RAM, SSD, HDD, Battery, Screen, Keyboard
  nameAr: varchar("name_ar", { length: 100 }).notNull(),
  
  // الفئة
  category: varchar("category", { length: 50 }).default("internal"), // internal, external, accessory
  
  // الأيقونة
  icon: varchar("icon", { length: 50 }),
  
  // هل يتطلب توافق
  requiresCompatibility: boolean("requires_compatibility").default(true),
  
  // إعدادات إضافية
  specifications: jsonb("specifications").$type<string[]>(), // مثل: ["capacity", "speed", "type"]
  
  // الترتيب
  sortOrder: integer("sort_order").default(0),
  
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * مخزون القطع
 */
export const partsInventory = pgTable("parts_inventory", {
  id: varchar("id", { length: 36 }).primaryKey(),
  
  // نوع القطعة
  partTypeId: varchar("part_type_id", { length: 36 })
    .references(() => partTypes.id)
    .notNull(),
  
  // المعلومات الأساسية
  name: varchar("name", { length: 255 }).notNull(),
  brand: varchar("brand", { length: 100 }),
  model: varchar("model", { length: 100 }),
  sku: varchar("sku", { length: 100 }),
  barcode: varchar("barcode", { length: 100 }),
  
  // المواصفات
  specifications: jsonb("specifications").$type<Record<string, string>>(),
  // مثال: { "capacity": "8GB", "speed": "DDR4-3200", "type": "SODIMM" }
  
  // التوافق
  compatibleWith: jsonb("compatible_with").$type<string[]>(), // product IDs أو models
  
  // المخزون
  warehouseId: varchar("warehouse_id", { length: 36 }).references(() => warehouses.id),
  quantity: integer("quantity").default(0),
  minQuantity: integer("min_quantity").default(5),
  
  // الأسعار
  costPrice: decimal("cost_price", { precision: 12, scale: 2 }),
  sellPrice: decimal("sell_price", { precision: 12, scale: 2 }),
  installationFee: decimal("installation_fee", { precision: 12, scale: 2 }).default("0"),
  
  // الحالة
  condition: varchar("condition", { length: 50 }).default("new"), // new, used, refurbished
  
  // ملاحظات
  notes: text("notes"),
  
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * حركات مخزون القطع
 */
export const partsMovements = pgTable("parts_movements", {
  id: varchar("id", { length: 36 }).primaryKey(),
  
  // القطعة
  partId: varchar("part_id", { length: 36 })
    .references(() => partsInventory.id)
    .notNull(),
  
  // نوع الحركة
  movementType: varchar("movement_type", { length: 50 }).notNull(),
  // purchase, sale, upgrade_install, upgrade_remove, transfer, adjustment, return
  
  // الكمية
  quantity: integer("quantity").notNull(),
  
  // المرجع
  referenceType: varchar("reference_type", { length: 50 }), // invoice, upgrade, transfer, adjustment
  referenceId: varchar("reference_id", { length: 36 }),
  
  // المخزون قبل/بعد
  quantityBefore: integer("quantity_before"),
  quantityAfter: integer("quantity_after"),
  
  // السعر
  unitPrice: decimal("unit_price", { precision: 12, scale: 2 }),
  
  // ملاحظات
  notes: text("notes"),
  
  // المنفذ
  performedBy: varchar("performed_by", { length: 36 }).references(() => users.id),
  performedAt: timestamp("performed_at").defaultNow(),
});

/**
 * عمليات الترقية
 */
export const upgradeOrders = pgTable("upgrade_orders", {
  id: varchar("id", { length: 36 }).primaryKey(),
  
  // رقم الطلب
  orderNumber: varchar("order_number", { length: 50 }).unique().notNull(),
  
  // الجهاز المُرقى
  serialId: varchar("serial_id", { length: 36 }).references(() => serialNumbers.id),
  serialNumber: varchar("serial_number", { length: 100 }),
  productId: varchar("product_id", { length: 36 }).references(() => products.id),
  productName: varchar("product_name", { length: 255 }),
  
  // الفاتورة (إن وجدت)
  invoiceId: varchar("invoice_id", { length: 36 }).references(() => invoices.id),
  
  // نوع العملية
  upgradeType: varchar("upgrade_type", { length: 50 }).default("add"), // add, swap, remove
  
  // الحالة
  status: varchar("status", { length: 50 }).default("pending"),
  // pending, in_progress, completed, cancelled
  
  // التكلفة الإجمالية
  partsCost: decimal("parts_cost", { precision: 12, scale: 2 }).default("0"),
  installationFee: decimal("installation_fee", { precision: 12, scale: 2 }).default("0"),
  totalCost: decimal("total_cost", { precision: 12, scale: 2 }).default("0"),
  
  // ملاحظات
  notes: text("notes"),
  customerNotes: text("customer_notes"),
  
  // التواريخ
  requestedAt: timestamp("requested_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  
  // المنفذين
  requestedBy: varchar("requested_by", { length: 36 }).references(() => users.id),
  completedBy: varchar("completed_by", { length: 36 }).references(() => users.id),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * تفاصيل الترقية (القطع المضافة/المسحوبة)
 */
export const upgradeItems = pgTable("upgrade_items", {
  id: varchar("id", { length: 36 }).primaryKey(),
  
  // طلب الترقية
  upgradeOrderId: varchar("upgrade_order_id", { length: 36 })
    .references(() => upgradeOrders.id)
    .notNull(),
  
  // القطعة المُضافة
  partId: varchar("part_id", { length: 36 }).references(() => partsInventory.id),
  partName: varchar("part_name", { length: 255 }),
  partSpecifications: jsonb("part_specifications"),
  
  // نوع العملية لهذه القطعة
  action: varchar("action", { length: 50 }).notNull(), // install, remove, swap
  
  // الكمية
  quantity: integer("quantity").default(1),
  
  // السعر
  unitPrice: decimal("unit_price", { precision: 12, scale: 2 }),
  installationFee: decimal("installation_fee", { precision: 12, scale: 2 }),
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }),
  
  // القطعة المسحوبة (في حالة swap)
  removedPartId: varchar("removed_part_id", { length: 36 }),
  removedPartName: varchar("removed_part_name", { length: 255 }),
  removedPartValue: decimal("removed_part_value", { precision: 12, scale: 2 }),
  // هل أعيدت للمخزون
  returnedToInventory: boolean("returned_to_inventory").default(false),
  
  // ملاحظات
  notes: text("notes"),
  
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * القطع المُركبة على الأجهزة (تاريخ التركيب)
 */
export const installedParts = pgTable("installed_parts", {
  id: varchar("id", { length: 36 }).primaryKey(),
  
  // الجهاز
  serialId: varchar("serial_id", { length: 36 })
    .references(() => serialNumbers.id)
    .notNull(),
  
  // القطعة
  partId: varchar("part_id", { length: 36 }).references(() => partsInventory.id),
  partTypeId: varchar("part_type_id", { length: 36 }).references(() => partTypes.id),
  partName: varchar("part_name", { length: 255 }),
  partSpecifications: jsonb("part_specifications"),
  
  // نوعها
  isOriginal: boolean("is_original").default(false), // هل هي أصلية مع الجهاز
  isUpgrade: boolean("is_upgrade").default(true), // هل هي ترقية
  
  // طلب الترقية المرتبط
  upgradeOrderId: varchar("upgrade_order_id", { length: 36 }).references(() => upgradeOrders.id),
  
  // تاريخ التركيب/الإزالة
  installedAt: timestamp("installed_at").defaultNow(),
  installedBy: varchar("installed_by", { length: 36 }).references(() => users.id),
  
  removedAt: timestamp("removed_at"),
  removedBy: varchar("removed_by", { length: 36 }),
  removalReason: text("removal_reason"),
  
  // حالة القطعة
  status: varchar("status", { length: 50 }).default("active"), // active, removed, replaced
  
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * أسعار التركيب حسب نوع القطعة
 */
export const installationPrices = pgTable("installation_prices", {
  id: varchar("id", { length: 36 }).primaryKey(),
  
  // نوع القطعة
  partTypeId: varchar("part_type_id", { length: 36 })
    .references(() => partTypes.id)
    .notNull(),
  
  // نوع العملية
  action: varchar("action", { length: 50 }).notNull(), // install, remove, swap
  
  // السعر
  price: decimal("price", { precision: 12, scale: 2 }).notNull(),
  
  // وصف
  description: text("description"),
  
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

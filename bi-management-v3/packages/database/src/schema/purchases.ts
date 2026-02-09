/**
 * نظام الشراء والوجبات
 * ─────────────────────────
 * سير العمل:
 * 1. الموظف يضيف وجبة شراء (بدون أسعار) → حالة: awaiting_prices
 * 2. إشعار للمدير ← المدير يضيف سعر الشراء → حالة: ready_for_receiving
 * 3. إشعار للفاحص ← يستلم ويفحص كل جهاز → حالة: received
 * 4. إشعار للمدير ← المدير يحدد أسعار البيع → حالة: ready_to_sell
 */

import { pgTable, text, integer, real, timestamp, index } from "drizzle-orm/pg-core";
import { users } from "./users";
import { suppliers } from "./suppliers";
import { warehouses } from "./warehouses";
import { products } from "./products";

/**
 * جدول وجبات الشراء (Purchase Batches)
 * كل وجبة = مجموعة أجهزة من مورد واحد
 */
export const purchaseBatches = pgTable("purchase_batches", {
  id: text("id").primaryKey(),
  batchNumber: text("batch_number").notNull().unique(),
  
  // المورد
  supplierId: text("supplier_id")
    .notNull()
    .references(() => suppliers.id),
  
  // الحالة
  status: text("status").notNull().default("awaiting_prices"),
  // awaiting_prices: بانتظار الأسعار من المدير
  // ready_for_receiving: جاهزة للاستلام والفحص
  // receiving: قيد الاستلام
  // received: تم الاستلام والفحص
  // ready_to_sell: جاهزة للبيع (بعد تحديد أسعار البيع)
  // cancelled: ملغية
  
  // المبالغ (يضيفها المدير)
  totalCost: real("total_cost").default(0),
  totalItems: integer("total_items").default(0),
  receivedItems: integer("received_items").default(0),
  
  // المخزن المستهدف
  warehouseId: text("warehouse_id").references(() => warehouses.id),
  
  // ملاحظات
  notes: text("notes"),
  internalNotes: text("internal_notes"),
  
  // من أضاف الوجبة (الموظف)
  createdBy: text("created_by")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  
  // من أضاف الأسعار (المدير)
  pricesAddedBy: text("prices_added_by").references(() => users.id),
  pricesAddedAt: timestamp("prices_added_at"),
  
  // من استلم (الفاحص)
  receivedBy: text("received_by").references(() => users.id),
  receivedAt: timestamp("received_at"),
  
  // من حدد أسعار البيع (المدير)
  sellingPricesAddedBy: text("selling_prices_added_by").references(() => users.id),
  sellingPricesAddedAt: timestamp("selling_prices_added_at"),
  
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("purchase_batches_supplier_id_idx").on(table.supplierId),
  index("purchase_batches_warehouse_id_idx").on(table.warehouseId),
  index("purchase_batches_created_by_idx").on(table.createdBy),
  index("purchase_batches_prices_added_by_idx").on(table.pricesAddedBy),
  index("purchase_batches_received_by_idx").on(table.receivedBy),
  index("purchase_batches_selling_prices_added_by_idx").on(table.sellingPricesAddedBy),
  index("purchase_batches_status_idx").on(table.status),
  index("purchase_batches_created_at_idx").on(table.createdAt),
  index("purchase_batches_received_at_idx").on(table.receivedAt),
]);

/**
 * جدول بنود الوجبة (Batch Items)
 * كل بند = نوع منتج معين + الكمية
 */
export const purchaseBatchItems = pgTable("purchase_batch_items", {
  id: text("id").primaryKey(),
  batchId: text("batch_id")
    .notNull()
    .references(() => purchaseBatches.id, { onDelete: "cascade" }),
  
  // المنتج
  productId: text("product_id").references(() => products.id),
  
  // الوصف (اختياري - للمنتجات الجديدة)
  productName: text("product_name"),
  brand: text("brand"),
  model: text("model"),
  specs: text("specs"), // JSON: المواصفات المتوقعة
  
  // الكمية
  quantity: integer("quantity").notNull().default(1),
  receivedQuantity: integer("received_quantity").default(0),
  
  // الأسعار (يضيفها المدير)
  unitCost: real("unit_cost"), // سعر الشراء للوحدة
  totalCost: real("total_cost"), // الإجمالي
  
  // سعر البيع المقترح (يضيفه المدير بعد الفحص)
  suggestedSellingPrice: real("suggested_selling_price"),
  
  // ملاحظات
  notes: text("notes"),
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("purchase_batch_items_batch_id_idx").on(table.batchId),
  index("purchase_batch_items_product_id_idx").on(table.productId),
  index("purchase_batch_items_created_at_idx").on(table.createdAt),
]);

/**
 * جدول الأجهزة الفردية في الوجبة (Batch Devices)
 * كل سجل = جهاز فردي بسيريال فريد
 */
export const purchaseBatchDevices = pgTable("purchase_batch_devices", {
  id: text("id").primaryKey(),
  batchId: text("batch_id")
    .notNull()
    .references(() => purchaseBatches.id, { onDelete: "cascade" }),
  batchItemId: text("batch_item_id")
    .references(() => purchaseBatchItems.id),
  
  // السيريال (يُولد تلقائياً)
  serialNumber: text("serial_number").notNull().unique(),
  
  // المنتج
  productId: text("product_id").references(() => products.id),
  
  // المواصفات الفعلية (بعد الفحص)
  actualSpecs: text("actual_specs"), // JSON
  
  // التكلفة وسعر البيع
  purchaseCost: real("purchase_cost"),
  sellingPrice: real("selling_price"),
  
  // حالة الفحص
  inspectionStatus: text("inspection_status").default("pending"),
  // pending: بانتظار الفحص
  // passed: ناجح
  // passed_with_issues: ناجح مع ملاحظات
  // failed: فشل (معيب)
  // needs_review: يحتاج مراجعة
  
  // نتيجة الفحص
  inspectionNotes: text("inspection_notes"),
  defects: text("defects"), // JSON: العيوب المكتشفة
  specsVariance: text("specs_variance"), // JSON: الفروقات عن المتوقع
  
  // الصور
  inspectionPhotos: text("inspection_photos"), // JSON: روابط الصور
  
  // من فحص
  inspectedBy: text("inspected_by").references(() => users.id),
  inspectedAt: timestamp("inspected_at"),
  
  // الموقع في المخزن
  warehouseId: text("warehouse_id").references(() => warehouses.id),
  locationCode: text("location_code"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("purchase_batch_devices_batch_id_idx").on(table.batchId),
  index("purchase_batch_devices_batch_item_id_idx").on(table.batchItemId),
  index("purchase_batch_devices_product_id_idx").on(table.productId),
  index("purchase_batch_devices_inspected_by_idx").on(table.inspectedBy),
  index("purchase_batch_devices_warehouse_id_idx").on(table.warehouseId),
  index("purchase_batch_devices_inspection_status_idx").on(table.inspectionStatus),
  index("purchase_batch_devices_created_at_idx").on(table.createdAt),
  index("purchase_batch_devices_inspected_at_idx").on(table.inspectedAt),
]);

/**
 * جدول إعدادات السيريال
 */
export const serialSettings = pgTable("serial_settings", {
  id: text("id").primaryKey(),
  prefix: text("prefix").notNull().default("BI"),
  yearFormat: text("year_format").default("YYYY"), // YYYY or YY
  separator: text("separator").default("-"),
  digitCount: integer("digit_count").default(6),
  currentSequence: integer("current_sequence").default(0),
  resetYearly: integer("reset_yearly").default(1), // إعادة الترقيم كل سنة
  currentYear: integer("current_year"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

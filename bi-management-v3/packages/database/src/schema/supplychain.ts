import { pgTable, text, integer, real, timestamp, date } from "drizzle-orm/pg-core";
import { users } from "./users";
import { products } from "./products";
import { warehouses } from "./warehouses";
import { suppliers } from "./suppliers";

// Purchase Requisitions - طلبات الشراء
export const purchaseRequisitions = pgTable("purchase_requisitions", {
  id: text("id").primaryKey(),
  code: text("code").unique(),
  requestedBy: text("requested_by").references(() => users.id),
  departmentId: text("department_id"),
  // Status: draft, pending_approval, approved, rejected, ordered, closed
  status: text("status").default("draft"),
  priority: text("priority").default("normal"), // low, normal, high, urgent
  requiredDate: date("required_date"),
  purpose: text("purpose"),
  notes: text("notes"),
  approvedBy: text("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Requisition Items
export const requisitionItems = pgTable("requisition_items", {
  id: text("id").primaryKey(),
  requisitionId: text("requisition_id").references(() => purchaseRequisitions.id),
  productId: text("product_id").references(() => products.id),
  description: text("description"),
  quantity: real("quantity").notNull(),
  estimatedPrice: real("estimated_price"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Purchase Orders - أوامر الشراء
export const purchaseOrders = pgTable("purchase_orders", {
  id: text("id").primaryKey(),
  code: text("code").unique(),
  requisitionId: text("requisition_id").references(() => purchaseRequisitions.id),
  supplierId: text("supplier_id").references(() => suppliers.id),
  warehouseId: text("warehouse_id").references(() => warehouses.id),
  // Status: draft, sent, confirmed, partial, received, cancelled
  status: text("status").default("draft"),
  orderDate: date("order_date"),
  expectedDate: date("expected_date"),
  subtotal: real("subtotal").default(0),
  discountAmount: real("discount_amount").default(0),
  taxAmount: real("tax_amount").default(0),
  shippingCost: real("shipping_cost").default(0),
  total: real("total").default(0),
  paymentTerms: text("payment_terms"),
  deliveryTerms: text("delivery_terms"),
  notes: text("notes"),
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Purchase Order Items
export const purchaseOrderItems = pgTable("purchase_order_items", {
  id: text("id").primaryKey(),
  orderId: text("order_id").references(() => purchaseOrders.id),
  productId: text("product_id").references(() => products.id),
  description: text("description"),
  quantity: real("quantity").notNull(),
  unitPrice: real("unit_price").notNull(),
  receivedQuantity: real("received_quantity").default(0),
  total: real("total").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Goods Receipts - استلام البضائع
export const goodsReceipts = pgTable("goods_receipts", {
  id: text("id").primaryKey(),
  code: text("code").unique(),
  purchaseOrderId: text("purchase_order_id").references(() => purchaseOrders.id),
  supplierId: text("supplier_id").references(() => suppliers.id),
  warehouseId: text("warehouse_id").references(() => warehouses.id),
  receiptDate: date("receipt_date"),
  // Status: pending, inspecting, accepted, rejected
  status: text("status").default("pending"),
  deliveryNote: text("delivery_note"),
  inspectedBy: text("inspected_by").references(() => users.id),
  inspectedAt: timestamp("inspected_at"),
  notes: text("notes"),
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Goods Receipt Items
export const goodsReceiptItems = pgTable("goods_receipt_items", {
  id: text("id").primaryKey(),
  receiptId: text("receipt_id").references(() => goodsReceipts.id),
  productId: text("product_id").references(() => products.id),
  orderedQuantity: real("ordered_quantity"),
  receivedQuantity: real("received_quantity").notNull(),
  acceptedQuantity: real("accepted_quantity"),
  rejectedQuantity: real("rejected_quantity").default(0),
  rejectionReason: text("rejection_reason"),
  batchNumber: text("batch_number"),
  expiryDate: date("expiry_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Demand Forecasts - توقعات الطلب
export const demandForecasts = pgTable("demand_forecasts", {
  id: text("id").primaryKey(),
  productId: text("product_id").references(() => products.id),
  warehouseId: text("warehouse_id").references(() => warehouses.id),
  forecastPeriod: text("forecast_period"), // monthly, weekly
  periodStart: date("period_start"),
  periodEnd: date("period_end"),
  forecastedQuantity: real("forecasted_quantity"),
  actualQuantity: real("actual_quantity"),
  accuracy: real("accuracy"),
  method: text("method"), // moving_average, exponential_smoothing, etc.
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Reorder Points - نقاط إعادة الطلب
export const reorderPoints = pgTable("reorder_points", {
  id: text("id").primaryKey(),
  productId: text("product_id").references(() => products.id),
  warehouseId: text("warehouse_id").references(() => warehouses.id),
  minimumStock: real("minimum_stock").notNull(),
  reorderPoint: real("reorder_point").notNull(),
  maximumStock: real("maximum_stock"),
  reorderQuantity: real("reorder_quantity"),
  leadTimeDays: integer("lead_time_days"),
  isActive: integer("is_active").default(1),
  lastAlertAt: timestamp("last_alert_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

import { pgTable, text, integer, real, timestamp } from "drizzle-orm/pg-core";
import { products } from "./products";
import { warehouses } from "./warehouses";

export const warehouseLocations = pgTable("warehouse_locations", {
  id: text("id").primaryKey(),
  warehouseId: text("warehouse_id")
    .notNull()
    .references(() => warehouses.id, { onDelete: "cascade" }),
  code: text("code").notNull(),
  name: text("name"),
  area: text("area"),
  shelf: text("shelf"),
  row: text("row"),
  isActive: integer("is_active").default(1),
});

export const serialNumbers = pgTable("serial_numbers", {
  id: text("id").primaryKey(),
  serialNumber: text("serial_number").notNull().unique(),
  productId: text("product_id")
    .notNull()
    .references(() => products.id),
  purchaseCost: real("purchase_cost"),
  purchaseCostEncrypted: text("purchase_cost_encrypted"),
  sellingPrice: real("selling_price"),
  status: text("status").notNull().default("available"),
  warehouseId: text("warehouse_id").references(() => warehouses.id),
  locationId: text("location_id"),
  custodyUserId: text("custody_user_id"),
  custodySince: timestamp("custody_since"),
  custodyReason: text("custody_reason"),
  supplierId: text("supplier_id"),
  purchaseInvoiceId: text("purchase_invoice_id"),
  purchaseDate: timestamp("purchase_date"),
  saleInvoiceId: text("sale_invoice_id"),
  saleDate: timestamp("sale_date"),
  customerId: text("customer_id"),
  warrantyMonths: integer("warranty_months"),
  warrantyStart: timestamp("warranty_start"),
  warrantyEnd: timestamp("warranty_end"),
  supplierWarrantyEnd: timestamp("supplier_warranty_end"),
  condition: text("condition"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdBy: text("created_by"),
});

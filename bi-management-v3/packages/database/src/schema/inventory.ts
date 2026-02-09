import { pgTable, text, integer, timestamp, index } from "drizzle-orm/pg-core";
import { products } from "./products";
import { warehouses } from "./warehouses";

export const inventory = pgTable("inventory", {
  id: text("id").primaryKey(),
  productId: text("product_id")
    .notNull()
    .references(() => products.id),
  warehouseId: text("warehouse_id")
    .notNull()
    .references(() => warehouses.id),
  locationId: text("location_id"),
  quantity: integer("quantity").default(0),
  reservedQuantity: integer("reserved_quantity").default(0),
  minQuantity: integer("min_quantity").default(0),
  maxQuantity: integer("max_quantity"),
  reorderPoint: integer("reorder_point"),
  lastCountDate: timestamp("last_count_date"),
  lastCountQuantity: integer("last_count_quantity"),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("inventory_product_id_idx").on(table.productId),
  index("inventory_warehouse_id_idx").on(table.warehouseId),
]);

export const inventoryMovements = pgTable("inventory_movements", {
  id: text("id").primaryKey(),
  productId: text("product_id")
    .notNull()
    .references(() => products.id),
  warehouseId: text("warehouse_id")
    .notNull()
    .references(() => warehouses.id),
  movementType: text("movement_type").notNull(),
  quantity: integer("quantity").notNull(),
  beforeQuantity: integer("before_quantity"),
  afterQuantity: integer("after_quantity"),
  unitCost: text("unit_cost"),
  totalCost: text("total_cost"),
  referenceType: text("reference_type"),
  referenceId: text("reference_id"),
  notes: text("notes"),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("inventory_movements_product_id_idx").on(table.productId),
  index("inventory_movements_warehouse_id_idx").on(table.warehouseId),
  index("inventory_movements_movement_type_idx").on(table.movementType),
  index("inventory_movements_reference_type_idx").on(table.referenceType),
  index("inventory_movements_reference_id_idx").on(table.referenceId),
  index("inventory_movements_created_at_idx").on(table.createdAt),
]);

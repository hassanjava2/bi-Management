import { pgTable, text, integer, real, timestamp, date } from "drizzle-orm/pg-core";
import { users } from "./users";
import { products } from "./products";
import { warehouses } from "./warehouses";

// Bill of Materials - قائمة المواد
export const billOfMaterials = pgTable("bill_of_materials", {
  id: text("id").primaryKey(),
  code: text("code").unique(),
  productId: text("product_id").references(() => products.id), // Finished product
  name: text("name").notNull(),
  version: text("version").default("1.0"),
  // Status: draft, active, obsolete
  status: text("status").default("draft"),
  // Quantities
  quantity: real("quantity").default(1), // Output quantity
  unitCost: real("unit_cost"),
  totalCost: real("total_cost"),
  // Time
  laborHours: real("labor_hours"),
  machineHours: real("machine_hours"),
  leadTimeDays: integer("lead_time_days"),
  notes: text("notes"),
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// BOM Items - مكونات قائمة المواد
export const bomItems = pgTable("bom_items", {
  id: text("id").primaryKey(),
  bomId: text("bom_id").references(() => billOfMaterials.id),
  productId: text("product_id").references(() => products.id), // Component
  // Type: material, sub_assembly
  itemType: text("item_type").default("material"),
  quantity: real("quantity").notNull(),
  unitCost: real("unit_cost"),
  wastePercent: real("waste_percent").default(0),
  notes: text("notes"),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Work Centers - مراكز العمل
export const workCenters = pgTable("work_centers", {
  id: text("id").primaryKey(),
  code: text("code").unique(),
  name: text("name").notNull(),
  description: text("description"),
  // Capacity
  capacityPerHour: real("capacity_per_hour"),
  efficiency: real("efficiency").default(100),
  // Costs
  hourlyRate: real("hourly_rate"),
  overheadRate: real("overhead_rate"),
  // Status
  isActive: integer("is_active").default(1),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Production Orders - أوامر الإنتاج
export const productionOrders = pgTable("production_orders", {
  id: text("id").primaryKey(),
  code: text("code").unique(),
  bomId: text("bom_id").references(() => billOfMaterials.id),
  productId: text("product_id").references(() => products.id),
  warehouseId: text("warehouse_id").references(() => warehouses.id),
  // Status: planned, released, in_progress, completed, cancelled
  status: text("status").default("planned"),
  priority: text("priority").default("normal"),
  // Quantities
  plannedQuantity: real("planned_quantity").notNull(),
  producedQuantity: real("produced_quantity").default(0),
  scrapQuantity: real("scrap_quantity").default(0),
  // Dates
  plannedStartDate: date("planned_start_date"),
  plannedEndDate: date("planned_end_date"),
  actualStartDate: date("actual_start_date"),
  actualEndDate: date("actual_end_date"),
  // Costs
  estimatedCost: real("estimated_cost"),
  actualCost: real("actual_cost").default(0),
  notes: text("notes"),
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Production Operations - عمليات الإنتاج
export const productionOperations = pgTable("production_operations", {
  id: text("id").primaryKey(),
  orderId: text("order_id").references(() => productionOrders.id),
  workCenterId: text("work_center_id").references(() => workCenters.id),
  operationName: text("operation_name").notNull(),
  sequenceNumber: integer("sequence_number").default(1),
  // Status: pending, in_progress, completed
  status: text("status").default("pending"),
  // Time
  plannedHours: real("planned_hours"),
  actualHours: real("actual_hours").default(0),
  // Quantities
  inputQuantity: real("input_quantity"),
  outputQuantity: real("output_quantity"),
  scrapQuantity: real("scrap_quantity").default(0),
  // Dates
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  operatorId: text("operator_id").references(() => users.id),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Material Consumption - استهلاك المواد
export const materialConsumption = pgTable("material_consumption", {
  id: text("id").primaryKey(),
  orderId: text("order_id").references(() => productionOrders.id),
  operationId: text("operation_id").references(() => productionOperations.id),
  productId: text("product_id").references(() => products.id),
  warehouseId: text("warehouse_id").references(() => warehouses.id),
  plannedQuantity: real("planned_quantity"),
  actualQuantity: real("actual_quantity").notNull(),
  consumedAt: timestamp("consumed_at").defaultNow(),
  consumedBy: text("consumed_by").references(() => users.id),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Quality Checks - فحوصات الجودة
export const qualityChecks = pgTable("quality_checks", {
  id: text("id").primaryKey(),
  orderId: text("order_id").references(() => productionOrders.id),
  operationId: text("operation_id").references(() => productionOperations.id),
  checkName: text("check_name").notNull(),
  checkType: text("check_type"), // visual, measurement, test
  specification: text("specification"),
  actualResult: text("actual_result"),
  // Status: pass, fail, pending
  status: text("status").default("pending"),
  checkedBy: text("checked_by").references(() => users.id),
  checkedAt: timestamp("checked_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

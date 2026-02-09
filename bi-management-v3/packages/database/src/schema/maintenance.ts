import { pgTable, text, integer, real, timestamp } from "drizzle-orm/pg-core";
import { serialNumbers } from "./serial-numbers";
import { products } from "./products";
import { customers } from "./customers";
import { suppliers } from "./suppliers";
import { users } from "./users";

export const maintenanceOrders = pgTable("maintenance_orders", {
  id: text("id").primaryKey(),
  orderNumber: text("order_number").notNull().unique(),
  type: text("type").notNull(),
  serialId: text("serial_id").references(() => serialNumbers.id),
  customerId: text("customer_id").references(() => customers.id),
  supplierId: text("supplier_id").references(() => suppliers.id),
  issueDescription: text("issue_description").notNull(),
  issueCategory: text("issue_category"),
  issueImages: text("issue_images"),
  diagnosis: text("diagnosis"),
  diagnosedBy: text("diagnosed_by").references(() => users.id),
  diagnosedAt: timestamp("diagnosed_at"),
  status: text("status").default("received"),
  assignedTo: text("assigned_to").references(() => users.id),
  assignedAt: timestamp("assigned_at"),
  isWarranty: integer("is_warranty").default(0),
  warrantyClaimId: text("warranty_claim_id"),
  estimatedCost: real("estimated_cost").default(0),
  partsCost: real("parts_cost").default(0),
  laborCost: real("labor_cost").default(0),
  totalCost: real("total_cost").default(0),
  paidAmount: real("paid_amount").default(0),
  paymentStatus: text("payment_status").default("pending"),
  expectedCompletion: timestamp("expected_completion"),
  completedAt: timestamp("completed_at"),
  deliveredAt: timestamp("delivered_at"),
  notes: text("notes"),
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const maintenanceParts = pgTable("maintenance_parts", {
  id: text("id").primaryKey(),
  maintenanceOrderId: text("maintenance_order_id")
    .notNull()
    .references(() => maintenanceOrders.id, { onDelete: "cascade" }),
  partName: text("part_name").notNull(),
  partNumber: text("part_number"),
  productId: text("product_id").references(() => products.id),
  serialId: text("serial_id").references(() => serialNumbers.id),
  quantity: integer("quantity").default(1),
  unitCost: real("unit_cost").default(0),
  totalCost: real("total_cost").default(0),
  source: text("source"),
  notes: text("notes"),
  addedBy: text("added_by").references(() => users.id),
  addedAt: timestamp("added_at").defaultNow(),
});

export const maintenanceHistory = pgTable("maintenance_history", {
  id: text("id").primaryKey(),
  maintenanceOrderId: text("maintenance_order_id")
    .notNull()
    .references(() => maintenanceOrders.id),
  action: text("action").notNull(),
  actionDetails: text("action_details"),
  oldStatus: text("old_status"),
  newStatus: text("new_status"),
  performedBy: text("performed_by").references(() => users.id),
  performedAt: timestamp("performed_at").defaultNow(),
  notes: text("notes"),
});

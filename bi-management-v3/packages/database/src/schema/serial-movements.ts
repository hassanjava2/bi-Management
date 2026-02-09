import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { warehouses } from "./warehouses";
import { users } from "./users";
import { serialNumbers } from "./serial-numbers";

export const serialMovements = pgTable("serial_movements", {
  id: text("id").primaryKey(),
  serialId: text("serial_id")
    .notNull()
    .references(() => serialNumbers.id),
  movementType: text("movement_type").notNull(),
  fromWarehouseId: text("from_warehouse_id").references(() => warehouses.id),
  toWarehouseId: text("to_warehouse_id").references(() => warehouses.id),
  fromStatus: text("from_status"),
  toStatus: text("to_status"),
  referenceType: text("reference_type"),
  referenceId: text("reference_id"),
  performedBy: text("performed_by").references(() => users.id),
  performedAt: timestamp("performed_at").defaultNow(),
  notes: text("notes"),
});

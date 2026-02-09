import { pgTable, text, integer, timestamp, index } from "drizzle-orm/pg-core";
import { branches } from "./branches";

export const warehouses = pgTable("warehouses", {
  id: text("id").primaryKey(),
  branchId: text("branch_id").references(() => branches.id),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  nameAr: text("name_ar"),
  type: text("type").notNull(), // main, inspection, preparation, returns, damaged, display, maintenance
  isActive: integer("is_active").default(1),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("warehouses_branch_id_idx").on(table.branchId),
  index("warehouses_is_active_idx").on(table.isActive),
  index("warehouses_type_idx").on(table.type),
  index("warehouses_created_at_idx").on(table.createdAt),
]);

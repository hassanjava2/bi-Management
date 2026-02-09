import { pgTable, text, integer, timestamp, index } from "drizzle-orm/pg-core";

export const branches = pgTable("branches", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  nameAr: text("name_ar"),
  address: text("address"),
  city: text("city"),
  phone: text("phone"),
  email: text("email"),
  managerId: text("manager_id"),
  isMain: integer("is_main").default(0),
  isActive: integer("is_active").default(1),
  settings: text("settings"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("branches_is_active_idx").on(table.isActive),
  index("branches_created_at_idx").on(table.createdAt),
]);

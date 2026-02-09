import { pgTable, text, integer, timestamp, index } from "drizzle-orm/pg-core";

export const categories = pgTable("categories", {
  id: text("id").primaryKey(),
  parentId: text("parent_id"),
  code: text("code").unique(),
  name: text("name").notNull(),
  nameAr: text("name_ar"),
  slug: text("slug").unique(),
  description: text("description"),
  icon: text("icon"),
  imageUrl: text("image_url"),
  sortOrder: integer("sort_order").default(0),
  isActive: integer("is_active").default(1),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("categories_parent_id_idx").on(table.parentId),
  index("categories_is_active_idx").on(table.isActive),
  index("categories_created_at_idx").on(table.createdAt),
]);

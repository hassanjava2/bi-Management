import { pgTable, text, integer, real, timestamp } from "drizzle-orm/pg-core";
import { returns } from "./returns";
import { products } from "./products";
import { serialNumbers } from "./serial-numbers";

export const returnItems = pgTable("return_items", {
  id: text("id").primaryKey(),
  returnId: text("return_id")
    .notNull()
    .references(() => returns.id, { onDelete: "cascade" }),
  productId: text("product_id").references(() => products.id),
  serialId: text("serial_id").references(() => serialNumbers.id),
  originalInvoiceItemId: text("original_invoice_item_id"),
  quantity: integer("quantity").default(1),
  unitPrice: real("unit_price"),
  itemClassification: text("item_classification"),
  conditionNotes: text("condition_notes"),
  decision: text("decision"),
});

export const returnReasons = pgTable("return_reasons", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(),
  nameAr: text("name_ar").notNull(),
  nameEn: text("name_en"),
  category: text("category"),
  requiresInspection: integer("requires_inspection").default(0),
  defaultClassification: text("default_classification"),
  isActive: integer("is_active").default(1),
  sortOrder: integer("sort_order").default(0),
});

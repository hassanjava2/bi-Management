import { pgTable, text, integer, real, timestamp, index } from "drizzle-orm/pg-core";
import { users } from "./users";

export const customers = pgTable("customers", {
  id: text("id").primaryKey(),
  code: text("code").unique(),
  name: text("name").notNull(),
  type: text("type").default("retail"),
  phone: text("phone").notNull(),
  phone2: text("phone2"),
  email: text("email"),
  addresses: text("addresses").default("[]"),
  defaultAddressIndex: integer("default_address_index").default(0),
  balance: real("balance").default(0),
  creditLimit: real("credit_limit").default(0),
  loyaltyPoints: integer("loyalty_points").default(0),
  loyaltyLevel: text("loyalty_level").default("bronze"),
  totalPurchases: real("total_purchases").default(0),
  purchaseCount: integer("purchase_count").default(0),
  lastPurchaseAt: timestamp("last_purchase_at"),
  customerScore: real("customer_score").default(0),
  paymentScore: real("payment_score").default(0),
  notes: text("notes"),
  tags: text("tags"),
  isActive: integer("is_active").default(1),
  isBlocked: integer("is_blocked").default(0),
  blockedReason: text("blocked_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdBy: text("created_by").references(() => users.id),
  isDeleted: integer("is_deleted").default(0),
  deletedAt: timestamp("deleted_at"),
}, (table) => [
  index("customers_created_by_idx").on(table.createdBy),
  index("customers_is_active_idx").on(table.isActive),
  index("customers_is_blocked_idx").on(table.isBlocked),
  index("customers_is_deleted_idx").on(table.isDeleted),
  index("customers_created_at_idx").on(table.createdAt),
  index("customers_last_purchase_at_idx").on(table.lastPurchaseAt),
]);

export const customerContacts = pgTable("customer_contacts", {
  id: text("id").primaryKey(),
  customerId: text("customer_id")
    .notNull()
    .references(() => customers.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email"),
  position: text("position"),
  isPrimary: integer("is_primary").default(0),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("customer_contacts_customer_id_idx").on(table.customerId),
  index("customer_contacts_created_at_idx").on(table.createdAt),
]);

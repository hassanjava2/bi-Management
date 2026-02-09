import { pgTable, text, integer, real, timestamp } from "drizzle-orm/pg-core";
import { users } from "./users";

export const shareholders = pgTable("shareholders", {
  id: text("id").primaryKey(),
  code: text("code").unique(),
  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  sharePercentage: real("share_percentage").notNull(),
  shareValue: real("share_value"),
  joinDate: text("join_date"),
  bankAccount: text("bank_account"),
  bankName: text("bank_name"),
  isActive: integer("is_active").default(1),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const shareTransactions = pgTable("share_transactions", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  fromShareholderId: text("from_shareholder_id").references(() => shareholders.id),
  toShareholderId: text("to_shareholder_id").references(() => shareholders.id),
  sharePercentage: real("share_percentage").notNull(),
  amount: real("amount").notNull(),
  transactionDate: text("transaction_date").notNull(),
  notes: text("notes"),
  documents: text("documents"),
  approvedBy: text("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const dividends = pgTable("dividends", {
  id: text("id").primaryKey(),
  periodStart: text("period_start").notNull(),
  periodEnd: text("period_end").notNull(),
  totalProfit: real("total_profit").notNull(),
  distributedAmount: real("distributed_amount").notNull(),
  retainedAmount: real("retained_amount").default(0),
  distributionDate: text("distribution_date"),
  status: text("status").default("draft"),
  approvedBy: text("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const dividendDetails = pgTable("dividend_details", {
  id: text("id").primaryKey(),
  dividendId: text("dividend_id")
    .notNull()
    .references(() => dividends.id, { onDelete: "cascade" }),
  shareholderId: text("shareholder_id")
    .notNull()
    .references(() => shareholders.id),
  sharePercentage: real("share_percentage").notNull(),
  amount: real("amount").notNull(),
  paid: integer("paid").default(0),
  paidAt: timestamp("paid_at"),
  paymentMethod: text("payment_method"),
  paymentReference: text("payment_reference"),
});

import { pgTable, text, integer, real, timestamp } from "drizzle-orm/pg-core";

export const accounts = pgTable("accounts", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  nameAr: text("name_ar"),
  parentId: text("parent_id"),
  type: text("type").notNull(),
  nature: text("nature"),
  balance: real("balance").default(0),
  isSystem: integer("is_system").default(0),
  isActive: integer("is_active").default(1),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const journalEntries = pgTable("journal_entries", {
  id: text("id").primaryKey(),
  entryNumber: text("entry_number").notNull().unique(),
  entryDate: text("entry_date").notNull(),
  description: text("description"),
  referenceType: text("reference_type"),
  referenceId: text("reference_id"),
  totalDebit: real("total_debit").default(0),
  totalCredit: real("total_credit").default(0),
  status: text("status").default("draft"),
  postedBy: text("posted_by"),
  postedAt: timestamp("posted_at"),
  isReversal: integer("is_reversal").default(0),
  reversedEntryId: text("reversed_entry_id"),
  reversalDate: timestamp("reversal_date"),
  reversalReason: text("reversal_reason"),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const journalEntryLines = pgTable("journal_entry_lines", {
  id: text("id").primaryKey(),
  journalEntryId: text("journal_entry_id")
    .notNull()
    .references(() => journalEntries.id, { onDelete: "cascade" }),
  accountId: text("account_id")
    .notNull()
    .references(() => accounts.id),
  debit: real("debit").default(0),
  credit: real("credit").default(0),
  description: text("description"),
  costCenter: text("cost_center"),
});

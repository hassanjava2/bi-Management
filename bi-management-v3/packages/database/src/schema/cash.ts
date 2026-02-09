import { pgTable, text, integer, real, timestamp } from "drizzle-orm/pg-core";
import { branches } from "./branches";
import { users } from "./users";
import { accounts, journalEntries } from "./accounts";
import { customers } from "./customers";
import { suppliers } from "./suppliers";

export const cashRegisters = pgTable("cash_registers", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  branchId: text("branch_id").references(() => branches.id),
  responsibleUserId: text("responsible_user_id").references(() => users.id),
  balance: real("balance").default(0),
  currency: text("currency").default("IQD"),
  isActive: integer("is_active").default(1),
  createdAt: timestamp("created_at").defaultNow(),
});

export const cashTransactions = pgTable("cash_transactions", {
  id: text("id").primaryKey(),
  cashRegisterId: text("cash_register_id")
    .notNull()
    .references(() => cashRegisters.id),
  type: text("type").notNull(),
  amount: real("amount").notNull(),
  balanceBefore: real("balance_before"),
  balanceAfter: real("balance_after"),
  referenceType: text("reference_type"),
  referenceId: text("reference_id"),
  description: text("description"),
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const bankAccounts = pgTable("bank_accounts", {
  id: text("id").primaryKey(),
  accountNumber: text("account_number").notNull().unique(),
  bankName: text("bank_name").notNull(),
  accountName: text("account_name"),
  branchName: text("branch_name"),
  balance: real("balance").default(0),
  currency: text("currency").default("IQD"),
  iban: text("iban"),
  swiftCode: text("swift_code"),
  isActive: integer("is_active").default(1),
  createdAt: timestamp("created_at").defaultNow(),
});

export const bankReconciliations = pgTable("bank_reconciliations", {
  id: text("id").primaryKey(),
  bankAccountId: text("bank_account_id")
    .notNull()
    .references(() => bankAccounts.id, { onDelete: "cascade" }),
  statementDate: text("statement_date").notNull(),
  statementBalance: real("statement_balance").notNull(),
  bookBalance: real("book_balance"),
  difference: real("difference"),
  notes: text("notes"),
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const checks = pgTable("checks", {
  id: text("id").primaryKey(),
  checkNumber: text("check_number").notNull(),
  type: text("type").notNull(),
  bankAccountId: text("bank_account_id").references(() => bankAccounts.id),
  amount: real("amount").notNull(),
  customerId: text("customer_id").references(() => customers.id),
  supplierId: text("supplier_id").references(() => suppliers.id),
  payeeName: text("payee_name"),
  checkDate: text("check_date").notNull(),
  dueDate: text("due_date"),
  status: text("status").default("pending"),
  depositedAt: timestamp("deposited_at"),
  clearedAt: timestamp("cleared_at"),
  bouncedAt: timestamp("bounced_at"),
  bounceReason: text("bounce_reason"),
  notes: text("notes"),
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const vouchers = pgTable("vouchers", {
  id: text("id").primaryKey(),
  voucherNumber: text("voucher_number").notNull().unique(),
  type: text("type").notNull(),
  amount: real("amount").notNull(),
  currency: text("currency").default("IQD"),
  customerId: text("customer_id").references(() => customers.id),
  supplierId: text("supplier_id").references(() => suppliers.id),
  employeeId: text("employee_id").references(() => users.id),
  fromAccountId: text("from_account_id").references(() => accounts.id),
  toAccountId: text("to_account_id").references(() => accounts.id),
  referenceType: text("reference_type"),
  referenceId: text("reference_id"),
  paymentMethod: text("payment_method"),
  checkId: text("check_id").references(() => checks.id),
  bankAccountId: text("bank_account_id").references(() => bankAccounts.id),
  cashRegisterId: text("cash_register_id").references(() => cashRegisters.id),
  description: text("description"),
  notes: text("notes"),
  journalEntryId: text("journal_entry_id").references(() => journalEntries.id),
  status: text("status").default("posted"),
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  isDeleted: integer("is_deleted").default(0),
  deletedAt: timestamp("deleted_at"),
});

import { pgTable, text, integer, real, timestamp } from "drizzle-orm/pg-core";
import { users } from "./users";
import { branches } from "./branches";
import { customers } from "./customers";
import { products } from "./products";

// POS Terminals - أجهزة نقاط البيع
export const posTerminals = pgTable("pos_terminals", {
  id: text("id").primaryKey(),
  code: text("code").unique(),
  name: text("name").notNull(),
  branchId: text("branch_id").references(() => branches.id),
  // Settings
  receiptHeader: text("receipt_header"),
  receiptFooter: text("receipt_footer"),
  // Payment methods enabled
  cashEnabled: integer("cash_enabled").default(1),
  cardEnabled: integer("card_enabled").default(1),
  // Status: active, inactive, maintenance
  status: text("status").default("active"),
  lastSyncAt: timestamp("last_sync_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// POS Sessions - جلسات البيع
export const posSessions = pgTable("pos_sessions", {
  id: text("id").primaryKey(),
  code: text("code").unique(),
  terminalId: text("terminal_id").references(() => posTerminals.id),
  branchId: text("branch_id").references(() => branches.id),
  cashierId: text("cashier_id").references(() => users.id),
  // Opening
  openedAt: timestamp("opened_at").defaultNow(),
  openingCash: real("opening_cash").default(0),
  // Closing
  closedAt: timestamp("closed_at"),
  closingCash: real("closing_cash"),
  expectedCash: real("expected_cash"),
  cashDifference: real("cash_difference"),
  // Sales summary
  totalSales: real("total_sales").default(0),
  totalReturns: real("total_returns").default(0),
  totalDiscount: real("total_discount").default(0),
  transactionCount: integer("transaction_count").default(0),
  // Payment breakdown
  cashPayments: real("cash_payments").default(0),
  cardPayments: real("card_payments").default(0),
  // Status: open, closed
  status: text("status").default("open"),
  closingNotes: text("closing_notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// POS Transactions - معاملات نقاط البيع
export const posTransactions = pgTable("pos_transactions", {
  id: text("id").primaryKey(),
  code: text("code").unique(),
  sessionId: text("session_id").references(() => posSessions.id),
  terminalId: text("terminal_id").references(() => posTerminals.id),
  branchId: text("branch_id").references(() => branches.id),
  cashierId: text("cashier_id").references(() => users.id),
  customerId: text("customer_id").references(() => customers.id),
  // Type: sale, return, exchange
  transactionType: text("transaction_type").default("sale"),
  // Amounts
  subtotal: real("subtotal").default(0),
  discountAmount: real("discount_amount").default(0),
  discountPercent: real("discount_percent"),
  taxAmount: real("tax_amount").default(0),
  total: real("total").default(0),
  // Payment
  paymentMethod: text("payment_method").default("cash"), // cash, card, mixed
  cashReceived: real("cash_received"),
  changeAmount: real("change_amount"),
  cardAmount: real("card_amount"),
  cardReference: text("card_reference"),
  // Status: completed, voided, pending
  status: text("status").default("completed"),
  voidedAt: timestamp("voided_at"),
  voidedBy: text("voided_by").references(() => users.id),
  voidReason: text("void_reason"),
  // Reference to invoice (if created)
  invoiceId: text("invoice_id"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// POS Transaction Items - عناصر المعاملة
export const posTransactionItems = pgTable("pos_transaction_items", {
  id: text("id").primaryKey(),
  transactionId: text("transaction_id").references(() => posTransactions.id),
  productId: text("product_id").references(() => products.id),
  productName: text("product_name").notNull(),
  productCode: text("product_code"),
  barcode: text("barcode"),
  quantity: real("quantity").default(1),
  unitPrice: real("unit_price").notNull(),
  discountAmount: real("discount_amount").default(0),
  discountPercent: real("discount_percent"),
  taxAmount: real("tax_amount").default(0),
  total: real("total").notNull(),
  // For returns
  returnedQuantity: real("returned_quantity").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Cash Movements - حركات النقد في الجلسة
export const posCashMovements = pgTable("pos_cash_movements", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").references(() => posSessions.id),
  // Type: cash_in, cash_out, float_adjustment
  movementType: text("movement_type").notNull(),
  amount: real("amount").notNull(),
  reason: text("reason"),
  reference: text("reference"),
  performedBy: text("performed_by").references(() => users.id),
  approvedBy: text("approved_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Quick Products - المنتجات السريعة للكاشير
export const posQuickProducts = pgTable("pos_quick_products", {
  id: text("id").primaryKey(),
  terminalId: text("terminal_id").references(() => posTerminals.id),
  productId: text("product_id").references(() => products.id),
  displayName: text("display_name"),
  displayOrder: integer("display_order").default(0),
  color: text("color"),
  categoryGroup: text("category_group"),
  isActive: integer("is_active").default(1),
  createdAt: timestamp("created_at").defaultNow(),
});

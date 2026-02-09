import { pgTable, text, integer, real, timestamp, index } from "drizzle-orm/pg-core";
import { branches } from "./branches";
import { warehouses } from "./warehouses";
import { users } from "./users";
import { customers } from "./customers";
import { suppliers } from "./suppliers";
import { products } from "./products";
import { serialNumbers } from "./serial-numbers";

export const invoices = pgTable("invoices", {
  id: text("id").primaryKey(),
  invoiceNumber: text("invoice_number").notNull().unique(),
  type: text("type").notNull(),
  paymentType: text("payment_type"),
  customerId: text("customer_id").references(() => customers.id),
  supplierId: text("supplier_id").references(() => suppliers.id),
  branchId: text("branch_id").references(() => branches.id),
  warehouseId: text("warehouse_id").references(() => warehouses.id),
  subtotal: real("subtotal").default(0),
  discountAmount: real("discount_amount").default(0),
  discountPercent: real("discount_percent").default(0),
  taxAmount: real("tax_amount").default(0),
  shippingCost: real("shipping_cost").default(0),
  total: real("total").default(0),
  installmentPlatform: text("installment_platform"),
  platformFee: real("platform_fee").default(0),
  platformFeePercent: real("platform_fee_percent").default(0),
  downPayment: real("down_payment").default(0),
  installmentMonths: integer("installment_months"),
  monthlyPayment: real("monthly_payment"),
  totalWithFees: real("total_with_fees"),
  paymentMethod: text("payment_method"),
  paymentStatus: text("payment_status").default("pending"),
  paidAmount: real("paid_amount").default(0),
  remainingAmount: real("remaining_amount").default(0),
  dueDate: timestamp("due_date"),
  status: text("status").default("draft"),
  requiresApproval: integer("requires_approval").default(0),
  approvedBy: text("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  deliveryRequired: integer("delivery_required").default(0),
  deliveryCompany: text("delivery_company"),
  deliveryTracking: text("delivery_tracking"),
  deliveryStatus: text("delivery_status"),
  deliveryDate: timestamp("delivery_date"),
  deliveryAddress: text("delivery_address"),
  notes: text("notes"),
  internalNotes: text("internal_notes"),
  relatedInvoiceId: text("related_invoice_id"),
  journalEntryId: text("journal_entry_id"),
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  isDeleted: integer("is_deleted").default(0),
  deletedAt: timestamp("deleted_at"),
  voidedAt: timestamp("voided_at"),
  voidedBy: text("voided_by"),
  voidReason: text("void_reason"),
}, (table) => [
  index("invoices_customer_id_idx").on(table.customerId),
  index("invoices_supplier_id_idx").on(table.supplierId),
  index("invoices_branch_id_idx").on(table.branchId),
  index("invoices_warehouse_id_idx").on(table.warehouseId),
  index("invoices_approved_by_idx").on(table.approvedBy),
  index("invoices_created_by_idx").on(table.createdBy),
  index("invoices_payment_status_idx").on(table.paymentStatus),
  index("invoices_status_idx").on(table.status),
  index("invoices_delivery_status_idx").on(table.deliveryStatus),
  index("invoices_created_at_idx").on(table.createdAt),
  index("invoices_due_date_idx").on(table.dueDate),
  index("invoices_delivery_date_idx").on(table.deliveryDate),
  index("invoices_is_deleted_idx").on(table.isDeleted),
]);

export const invoiceItems = pgTable("invoice_items", {
  id: text("id").primaryKey(),
  invoiceId: text("invoice_id")
    .notNull()
    .references(() => invoices.id, { onDelete: "cascade" }),
  productId: text("product_id").references(() => products.id),
  serialId: text("serial_id").references(() => serialNumbers.id),
  description: text("description"),
  quantity: integer("quantity").default(1),
  unitPrice: real("unit_price").notNull(),
  costPrice: real("cost_price"),
  discount: real("discount").default(0),
  discountPercent: real("discount_percent").default(0),
  tax: real("tax").default(0),
  total: real("total").notNull(),
  warrantyMonths: integer("warranty_months"),
  warrantyStart: timestamp("warranty_start"),
  warrantyEnd: timestamp("warranty_end"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const invoicePayments = pgTable("invoice_payments", {
  id: text("id").primaryKey(),
  invoiceId: text("invoice_id")
    .notNull()
    .references(() => invoices.id),
  amount: real("amount").notNull(),
  paymentMethod: text("payment_method").notNull(),
  referenceNumber: text("reference_number"),
  bankName: text("bank_name"),
  checkNumber: text("check_number"),
  checkDate: timestamp("check_date"),
  receivedBy: text("received_by").references(() => users.id),
  receivedAt: timestamp("received_at").defaultNow(),
  notes: text("notes"),
}, (table) => [
  index("invoice_payments_invoice_id_idx").on(table.invoiceId),
  index("invoice_payments_received_by_idx").on(table.receivedBy),
  index("invoice_payments_received_at_idx").on(table.receivedAt),
]);

export const installmentSchedules = pgTable("installment_schedules", {
  id: text("id").primaryKey(),
  invoiceId: text("invoice_id")
    .notNull()
    .references(() => invoices.id, { onDelete: "cascade" }),
  installmentNumber: integer("installment_number").notNull(),
  amount: real("amount").notNull(),
  dueDate: text("due_date").notNull(),
  status: text("status").default("pending"),
  paidAmount: real("paid_amount").default(0),
  paidDate: timestamp("paid_date"),
  paidBy: text("paid_by").references(() => users.id),
  lateFee: real("late_fee").default(0),
  notes: text("notes"),
}, (table) => [
  index("installment_schedules_invoice_id_idx").on(table.invoiceId),
  index("installment_schedules_paid_by_idx").on(table.paidBy),
  index("installment_schedules_status_idx").on(table.status),
  index("installment_schedules_paid_date_idx").on(table.paidDate),
]);

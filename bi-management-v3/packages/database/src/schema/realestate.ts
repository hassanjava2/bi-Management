/**
 * Schema - نظام إدارة العقارات والإيجارات
 */
import { pgTable, text, timestamp, boolean, jsonb, integer, decimal } from "drizzle-orm/pg-core";
import { users } from "./users";
import { branches } from "./branches";
import { customers } from "./customers";

/**
 * العقارات
 */
export const properties = pgTable("properties", {
  id: text("id").primaryKey(),
  propertyNumber: text("property_number").notNull().unique(),
  
  // المعلومات الأساسية
  name: text("name").notNull(),
  description: text("description"),
  
  // النوع
  propertyType: text("property_type").default("commercial"), // commercial, residential, industrial, land, mixed
  
  // الموقع
  address: text("address").notNull(),
  city: text("city"),
  region: text("region"),
  postalCode: text("postal_code"),
  coordinates: jsonb("coordinates").$type<{ lat: number; lng: number }>(),
  
  // المساحة
  totalArea: decimal("total_area"), // متر مربع
  usableArea: decimal("usable_area"),
  floors: integer("floors"),
  
  // الملكية
  ownershipType: text("ownership_type").default("owned"), // owned, leased
  purchaseDate: timestamp("purchase_date"),
  purchasePrice: decimal("purchase_price"),
  currentValue: decimal("current_value"),
  
  // الحالة
  status: text("status").default("available"), // available, occupied, maintenance, reserved, sold
  
  // الميزات
  features: jsonb("features").$type<string[]>(),
  
  // الصور
  images: jsonb("images").$type<string[]>(),
  documents: jsonb("documents").$type<{ name: string; url: string }[]>(),
  
  // الإدارة
  managedBy: text("managed_by").references(() => users.id),
  branchId: text("branch_id").references(() => branches.id),
  
  notes: text("notes"),
  isActive: boolean("is_active").default(true),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * الوحدات
 */
export const propertyUnits = pgTable("property_units", {
  id: text("id").primaryKey(),
  unitNumber: text("unit_number").notNull(),
  propertyId: text("property_id").notNull().references(() => properties.id),
  
  // المعلومات
  name: text("name"),
  floor: integer("floor"),
  
  // النوع
  unitType: text("unit_type").default("office"), // office, shop, apartment, warehouse, parking
  
  // المساحة
  area: decimal("area"),
  
  // الإيجار
  monthlyRent: decimal("monthly_rent"),
  annualRent: decimal("annual_rent"),
  
  // الحالة
  status: text("status").default("vacant"), // vacant, occupied, maintenance, reserved
  
  // المستأجر الحالي
  currentTenantId: text("current_tenant_id").references(() => customers.id),
  
  features: jsonb("features").$type<string[]>(),
  
  isActive: boolean("is_active").default(true),
  
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * عقود الإيجار
 */
export const leaseContracts = pgTable("lease_contracts", {
  id: text("id").primaryKey(),
  contractNumber: text("contract_number").notNull().unique(),
  
  // العقار والوحدة
  propertyId: text("property_id").notNull().references(() => properties.id),
  unitId: text("unit_id").references(() => propertyUnits.id),
  
  // المستأجر
  tenantId: text("tenant_id").notNull().references(() => customers.id),
  tenantType: text("tenant_type").default("individual"), // individual, company
  
  // الفترة
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  
  // الإيجار
  monthlyRent: decimal("monthly_rent").notNull(),
  annualRent: decimal("annual_rent"),
  paymentFrequency: text("payment_frequency").default("monthly"), // monthly, quarterly, yearly
  
  // التأمين
  securityDeposit: decimal("security_deposit"),
  depositPaid: boolean("deposit_paid").default(false),
  
  // الشروط
  terms: text("terms"),
  specialConditions: text("special_conditions"),
  
  // الحالة
  status: text("status").default("active"), // draft, active, expired, terminated, renewed
  
  // التجديد
  autoRenew: boolean("auto_renew").default(false),
  renewalTerms: text("renewal_terms"),
  
  // المستندات
  documents: jsonb("documents").$type<{ name: string; url: string }[]>(),
  
  // التوقيع
  signedAt: timestamp("signed_at"),
  signedBy: text("signed_by").references(() => users.id),
  
  terminatedAt: timestamp("terminated_at"),
  terminationReason: text("termination_reason"),
  
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * مدفوعات الإيجار
 */
export const rentPayments = pgTable("rent_payments", {
  id: text("id").primaryKey(),
  paymentNumber: text("payment_number").notNull().unique(),
  
  contractId: text("contract_id").notNull().references(() => leaseContracts.id),
  
  // الفترة
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  
  // المبلغ
  amount: decimal("amount").notNull(),
  lateFee: decimal("late_fee").default("0"),
  totalAmount: decimal("total_amount").notNull(),
  
  // تاريخ الاستحقاق
  dueDate: timestamp("due_date").notNull(),
  
  // الحالة
  status: text("status").default("pending"), // pending, paid, partial, overdue, cancelled
  
  // الدفع
  paidAmount: decimal("paid_amount").default("0"),
  paidAt: timestamp("paid_at"),
  paymentMethod: text("payment_method"),
  paymentReference: text("payment_reference"),
  
  notes: text("notes"),
  
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * صيانة العقارات
 */
export const propertyMaintenance = pgTable("property_maintenance", {
  id: text("id").primaryKey(),
  maintenanceNumber: text("maintenance_number").notNull().unique(),
  
  propertyId: text("property_id").notNull().references(() => properties.id),
  unitId: text("unit_id").references(() => propertyUnits.id),
  
  // النوع
  maintenanceType: text("maintenance_type").default("repair"), // repair, preventive, emergency, inspection
  
  // التفاصيل
  title: text("title").notNull(),
  description: text("description"),
  
  // الأولوية
  priority: text("priority").default("medium"),
  
  // التكلفة
  estimatedCost: decimal("estimated_cost"),
  actualCost: decimal("actual_cost"),
  paidBy: text("paid_by"), // landlord, tenant
  
  // الجدولة
  scheduledDate: timestamp("scheduled_date"),
  completedDate: timestamp("completed_date"),
  
  // المقاول
  vendor: text("vendor"),
  vendorContact: text("vendor_contact"),
  
  // الحالة
  status: text("status").default("pending"), // pending, scheduled, in_progress, completed, cancelled
  
  // التقرير
  reportedBy: text("reported_by").references(() => users.id),
  assignedTo: text("assigned_to").references(() => users.id),
  
  images: jsonb("images").$type<string[]>(),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * فحص العقارات
 */
export const propertyInspections = pgTable("property_inspections", {
  id: text("id").primaryKey(),
  
  propertyId: text("property_id").notNull().references(() => properties.id),
  unitId: text("unit_id").references(() => propertyUnits.id),
  contractId: text("contract_id").references(() => leaseContracts.id),
  
  // النوع
  inspectionType: text("inspection_type").default("routine"), // routine, move_in, move_out, complaint
  
  // التاريخ
  scheduledAt: timestamp("scheduled_at"),
  completedAt: timestamp("completed_at"),
  
  // المفتش
  inspectorId: text("inspector_id").references(() => users.id),
  
  // النتائج
  overallCondition: text("overall_condition"), // excellent, good, fair, poor
  findings: jsonb("findings").$type<{ area: string; condition: string; notes: string }[]>(),
  
  // الصور
  images: jsonb("images").$type<string[]>(),
  
  // الحالة
  status: text("status").default("scheduled"), // scheduled, completed, cancelled
  
  notes: text("notes"),
  
  createdAt: timestamp("created_at").defaultNow(),
});

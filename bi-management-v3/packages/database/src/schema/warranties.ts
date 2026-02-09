/**
 * Schema - نظام الضمانات
 */
import { pgTable, text, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { users } from "./users";
import { customers } from "./customers";
import { products } from "./products";
import { serialNumbers } from "./serial-numbers";
import { invoices } from "./invoices";

/**
 * سياسات الضمان
 */
export const warrantyPolicies = pgTable("warranty_policies", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  
  // مدة الضمان
  durationMonths: integer("duration_months").notNull().default(12),
  
  // ما يغطيه الضمان
  coverageType: text("coverage_type").default("standard"), // standard, extended, limited
  coversHardware: boolean("covers_hardware").default(true),
  coversSoftware: boolean("covers_software").default(false),
  coversAccidentalDamage: boolean("covers_accidental_damage").default(false),
  coversWaterDamage: boolean("covers_water_damage").default(false),
  
  // الاستثناءات
  exclusions: jsonb("exclusions").$type<string[]>(),
  
  // الشروط
  terms: text("terms"),
  
  // التطبيق
  appliesTo: text("applies_to"), // all, category_id, product_id
  appliesToId: text("applies_to_id"),
  
  isActive: boolean("is_active").default(true),
  isDefault: boolean("is_default").default(false),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * ضمانات المنتجات المباعة
 */
export const productWarranties = pgTable("product_warranties", {
  id: text("id").primaryKey(),
  warrantyNumber: text("warranty_number").notNull().unique(), // WR-2026-000001
  
  // المنتج والسيريال
  productId: text("product_id").references(() => products.id),
  serialNumberId: text("serial_number_id").references(() => serialNumbers.id),
  serialNumber: text("serial_number"), // للعرض السريع
  
  // العميل
  customerId: text("customer_id").references(() => customers.id),
  customerName: text("customer_name"),
  customerPhone: text("customer_phone"),
  customerEmail: text("customer_email"),
  
  // الفاتورة
  invoiceId: text("invoice_id").references(() => invoices.id),
  invoiceNumber: text("invoice_number"),
  
  // سياسة الضمان
  policyId: text("policy_id").references(() => warrantyPolicies.id),
  
  // تواريخ الضمان
  purchaseDate: timestamp("purchase_date").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  
  // الحالة
  status: text("status").default("active"), // active, expired, voided, claimed
  
  // عدد المطالبات
  claimsCount: integer("claims_count").default(0),
  maxClaims: integer("max_claims"), // null = unlimited
  
  // الملاحظات
  notes: text("notes"),
  
  // Metadata
  registeredBy: text("registered_by").references(() => users.id),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * مطالبات الضمان
 */
export const warrantyClaims = pgTable("warranty_claims", {
  id: text("id").primaryKey(),
  claimNumber: text("claim_number").notNull().unique(), // WC-2026-000001
  
  warrantyId: text("warranty_id").notNull().references(() => productWarranties.id),
  
  // المشكلة
  issueType: text("issue_type").notNull(), // hardware, software, defect, damage, other
  issueDescription: text("issue_description").notNull(),
  
  // الحالة
  status: text("status").default("pending"), // pending, approved, rejected, in_repair, completed, cancelled
  
  // التقييم
  diagnosisNotes: text("diagnosis_notes"),
  isUnderWarranty: boolean("is_under_warranty"),
  rejectionReason: text("rejection_reason"),
  
  // الإصلاح
  repairType: text("repair_type"), // repair, replace, refund
  repairNotes: text("repair_notes"),
  repairCost: text("repair_cost").default("0"),
  customerPays: boolean("customer_pays").default(false), // إذا كان خارج الضمان
  
  // التواريخ
  claimDate: timestamp("claim_date").defaultNow(),
  approvedAt: timestamp("approved_at"),
  completedAt: timestamp("completed_at"),
  
  // المرفقات
  attachments: jsonb("attachments").$type<{ name: string; url: string; type: string }[]>(),
  
  // الموظفين
  submittedBy: text("submitted_by").references(() => users.id),
  reviewedBy: text("reviewed_by").references(() => users.id),
  repairedBy: text("repaired_by").references(() => users.id),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * سجل أنشطة الضمان
 */
export const warrantyActivities = pgTable("warranty_activities", {
  id: text("id").primaryKey(),
  warrantyId: text("warranty_id").references(() => productWarranties.id),
  claimId: text("claim_id").references(() => warrantyClaims.id),
  
  activityType: text("activity_type").notNull(), // registered, extended, claimed, repaired, voided
  description: text("description"),
  
  performedBy: text("performed_by").references(() => users.id),
  metadata: jsonb("metadata").$type<Record<string, any>>(),
  
  createdAt: timestamp("created_at").defaultNow(),
});

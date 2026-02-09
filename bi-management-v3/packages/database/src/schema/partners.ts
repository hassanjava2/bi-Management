/**
 * Schema - نظام إدارة الشركاء والتعاون
 */
import { pgTable, text, timestamp, boolean, jsonb, integer, decimal } from "drizzle-orm/pg-core";
import { users } from "./users";
import { branches } from "./branches";

/**
 * الشركاء
 */
export const partners = pgTable("partners", {
  id: text("id").primaryKey(),
  
  // معلومات الشريك
  name: text("name").notNull(),
  nameEn: text("name_en"),
  type: text("type").default("business"), // business, strategic, technology, distribution, service
  
  // معلومات الاتصال
  contactPerson: text("contact_person"),
  email: text("email"),
  phone: text("phone"),
  website: text("website"),
  
  // العنوان
  country: text("country"),
  city: text("city"),
  address: text("address"),
  
  // المعلومات التجارية
  industry: text("industry"),
  companySize: text("company_size"), // small, medium, large, enterprise
  registrationNumber: text("registration_number"),
  taxNumber: text("tax_number"),
  
  // الحالة
  status: text("status").default("prospect"), // prospect, active, inactive, suspended
  partnershipLevel: text("partnership_level").default("standard"), // standard, silver, gold, platinum
  
  // العقد
  contractStartDate: timestamp("contract_start_date"),
  contractEndDate: timestamp("contract_end_date"),
  contractValue: decimal("contract_value"),
  
  // التقييم
  rating: integer("rating"), // 1-5
  totalRevenue: decimal("total_revenue").default("0"),
  totalTransactions: integer("total_transactions").default(0),
  
  // ملاحظات
  notes: text("notes"),
  tags: jsonb("tags").$type<string[]>(),
  
  // الصور
  logo: text("logo"),
  
  assignedTo: text("assigned_to").references(() => users.id),
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * جهات الاتصال لدى الشركاء
 */
export const partnerContacts = pgTable("partner_contacts", {
  id: text("id").primaryKey(),
  partnerId: text("partner_id").notNull().references(() => partners.id, { onDelete: "cascade" }),
  
  // المعلومات
  name: text("name").notNull(),
  position: text("position"),
  department: text("department"),
  
  // التواصل
  email: text("email"),
  phone: text("phone"),
  mobile: text("mobile"),
  
  // التفضيلات
  isPrimary: boolean("is_primary").default(false),
  preferredContactMethod: text("preferred_contact_method").default("email"),
  
  notes: text("notes"),
  
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * اتفاقيات الشراكة
 */
export const partnerAgreements = pgTable("partner_agreements", {
  id: text("id").primaryKey(),
  partnerId: text("partner_id").notNull().references(() => partners.id, { onDelete: "cascade" }),
  
  // المعلومات
  title: text("title").notNull(),
  description: text("description"),
  agreementType: text("agreement_type").default("partnership"), // partnership, distribution, service, nda, mou
  
  // التواريخ
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  
  // القيمة
  value: decimal("value"),
  currency: text("currency").default("IQD"),
  
  // الحالة
  status: text("status").default("draft"), // draft, pending, active, expired, terminated
  
  // المستند
  documentUrl: text("document_url"),
  
  // الشروط
  terms: jsonb("terms").$type<Record<string, any>>(),
  
  // التوقيع
  signedByPartner: boolean("signed_by_partner").default(false),
  signedByUs: boolean("signed_by_us").default(false),
  signedAt: timestamp("signed_at"),
  
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * أنشطة الشراكة
 */
export const partnerActivities = pgTable("partner_activities", {
  id: text("id").primaryKey(),
  partnerId: text("partner_id").notNull().references(() => partners.id, { onDelete: "cascade" }),
  
  // النوع
  activityType: text("activity_type").notNull(), // meeting, call, email, visit, presentation, deal
  
  // التفاصيل
  title: text("title").notNull(),
  description: text("description"),
  
  // التاريخ
  scheduledAt: timestamp("scheduled_at"),
  completedAt: timestamp("completed_at"),
  
  // الحالة
  status: text("status").default("scheduled"), // scheduled, completed, cancelled
  
  // النتيجة
  outcome: text("outcome"),
  nextSteps: text("next_steps"),
  
  // المشاركون
  participants: jsonb("participants").$type<string[]>(),
  
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * عمولات الشركاء
 */
export const partnerCommissions = pgTable("partner_commissions", {
  id: text("id").primaryKey(),
  partnerId: text("partner_id").notNull().references(() => partners.id),
  
  // المعاملة المرتبطة
  transactionType: text("transaction_type"), // sale, referral, subscription
  transactionId: text("transaction_id"),
  transactionValue: decimal("transaction_value"),
  
  // العمولة
  commissionRate: decimal("commission_rate"), // percentage
  commissionAmount: decimal("commission_amount"),
  currency: text("currency").default("IQD"),
  
  // الحالة
  status: text("status").default("pending"), // pending, approved, paid, cancelled
  
  // الدفع
  paidAt: timestamp("paid_at"),
  paymentReference: text("payment_reference"),
  
  // الفترة
  periodStart: timestamp("period_start"),
  periodEnd: timestamp("period_end"),
  
  notes: text("notes"),
  
  approvedBy: text("approved_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * بوابة الشركاء - المستخدمون
 */
export const partnerPortalUsers = pgTable("partner_portal_users", {
  id: text("id").primaryKey(),
  partnerId: text("partner_id").notNull().references(() => partners.id, { onDelete: "cascade" }),
  
  // بيانات الدخول
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"),
  
  // المعلومات
  name: text("name").notNull(),
  role: text("role").default("viewer"), // admin, manager, viewer
  
  // الحالة
  isActive: boolean("is_active").default(true),
  lastLoginAt: timestamp("last_login_at"),
  
  // الصلاحيات
  permissions: jsonb("permissions").$type<string[]>(),
  
  createdAt: timestamp("created_at").defaultNow(),
});

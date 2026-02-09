/**
 * نظام إدارة الرخص والتصاريح
 * Licenses and Permits Management System
 */
import { pgTable, text, timestamp, boolean, integer, jsonb, decimal } from "drizzle-orm/pg-core";
import { users } from "./users";
import { departments } from "./hr";
import { branches } from "./branches";

// الرخص والتصاريح
export const licenses = pgTable("licenses", {
  id: text("id").primaryKey(),
  licenseNumber: text("license_number").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  
  licenseType: text("license_type").default("commercial"), // commercial, professional, operational, health, safety, environmental, import_export, construction, other
  category: text("category").default("general"), // general, government, industry_specific
  
  // الجهة المصدرة
  issuingAuthority: text("issuing_authority").notNull(),
  authorityContact: text("authority_contact"),
  authorityPhone: text("authority_phone"),
  authorityEmail: text("authority_email"),
  authorityWebsite: text("authority_website"),
  
  // تفاصيل الرخصة
  externalLicenseNumber: text("external_license_number"), // رقم الرخصة لدى الجهة المصدرة
  issueDate: timestamp("issue_date").notNull(),
  expiryDate: timestamp("expiry_date").notNull(),
  effectiveDate: timestamp("effective_date"),
  
  // التكلفة
  licenseFee: decimal("license_fee"),
  renewalFee: decimal("renewal_fee"),
  currency: text("currency").default("IQD"),
  
  // الحالة
  status: text("status").default("active"), // pending, active, expiring_soon, expired, suspended, cancelled, under_renewal
  
  // النطاق والتطبيق
  scope: text("scope").default("organization"), // organization, branch, department, specific
  applicableBranchIds: jsonb("applicable_branch_ids").$type<string[]>(),
  applicableDepartmentIds: jsonb("applicable_department_ids").$type<string[]>(),
  
  // المسؤول
  responsibleUserId: text("responsible_user_id").references(() => users.id),
  responsibleDepartmentId: text("responsible_department_id").references(() => departments.id),
  
  // التجديد
  renewalPeriodMonths: integer("renewal_period_months").default(12),
  autoRenewal: boolean("auto_renewal").default(false),
  renewalReminderDays: integer("renewal_reminder_days").default(60),
  lastRenewalDate: timestamp("last_renewal_date"),
  renewalCount: integer("renewal_count").default(0),
  
  // المتطلبات
  requirements: jsonb("requirements").$type<{
    item: string;
    description?: string;
    mandatory: boolean;
    documentUrl?: string;
  }[]>(),
  
  // الشروط
  conditions: jsonb("conditions").$type<{
    condition: string;
    description?: string;
  }[]>(),
  
  // المرفقات
  attachments: jsonb("attachments").$type<{
    name: string;
    url: string;
    type: string;
    uploadedAt?: string;
  }[]>(),
  
  // الروابط
  relatedLicenseIds: jsonb("related_license_ids").$type<string[]>(),
  
  notes: text("notes"),
  tags: jsonb("tags").$type<string[]>(),
  
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// طلبات الرخص
export const licenseApplications = pgTable("license_applications", {
  id: text("id").primaryKey(),
  applicationNumber: text("application_number").notNull().unique(),
  licenseId: text("license_id").references(() => licenses.id), // null للرخص الجديدة
  
  applicationType: text("application_type").default("new"), // new, renewal, amendment, replacement
  licenseType: text("license_type"), // نوع الرخصة المطلوبة للرخص الجديدة
  
  // تفاصيل الطلب
  title: text("title").notNull(),
  description: text("description"),
  issuingAuthority: text("issuing_authority"),
  
  // التواريخ
  applicationDate: timestamp("application_date").notNull(),
  submissionDate: timestamp("submission_date"),
  expectedIssueDate: timestamp("expected_issue_date"),
  actualIssueDate: timestamp("actual_issue_date"),
  
  // الحالة
  status: text("status").default("draft"), // draft, submitted, under_review, approved, rejected, completed, cancelled
  
  // المتطلبات المرفقة
  submittedDocuments: jsonb("submitted_documents").$type<{
    name: string;
    url: string;
    required: boolean;
    verified: boolean;
    verifiedAt?: string;
    verifiedBy?: string;
  }[]>(),
  
  // الرسوم
  applicationFee: decimal("application_fee"),
  feesPaid: boolean("fees_paid").default(false),
  paymentDate: timestamp("payment_date"),
  paymentReference: text("payment_reference"),
  
  // المراجعة
  reviewedBy: text("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"),
  rejectionReason: text("rejection_reason"),
  
  // مقدم الطلب
  applicantId: text("applicant_id").references(() => users.id),
  applicantDepartmentId: text("applicant_department_id").references(() => departments.id),
  branchId: text("branch_id").references(() => branches.id),
  
  notes: text("notes"),
  
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// سجل التجديدات
export const licenseRenewals = pgTable("license_renewals", {
  id: text("id").primaryKey(),
  licenseId: text("license_id").references(() => licenses.id).notNull(),
  applicationId: text("application_id").references(() => licenseApplications.id),
  
  renewalNumber: text("renewal_number").notNull(),
  previousExpiryDate: timestamp("previous_expiry_date").notNull(),
  newExpiryDate: timestamp("new_expiry_date").notNull(),
  renewalDate: timestamp("renewal_date").notNull(),
  
  renewalFee: decimal("renewal_fee"),
  feesPaid: boolean("fees_paid").default(false),
  paymentDate: timestamp("payment_date"),
  paymentReference: text("payment_reference"),
  
  status: text("status").default("completed"), // pending, completed, failed
  
  processedBy: text("processed_by").references(() => users.id),
  notes: text("notes"),
  
  createdAt: timestamp("created_at").defaultNow(),
});

// التنبيهات والتذكيرات
export const licenseAlerts = pgTable("license_alerts", {
  id: text("id").primaryKey(),
  licenseId: text("license_id").references(() => licenses.id).notNull(),
  alertType: text("alert_type").notNull(), // expiring_soon, expired, renewal_due, document_missing, compliance_issue
  alertDate: timestamp("alert_date").notNull(),
  message: text("message"),
  severity: text("severity").default("medium"), // low, medium, high, critical
  isRead: boolean("is_read").default(false),
  readAt: timestamp("read_at"),
  readBy: text("read_by").references(() => users.id),
  isResolved: boolean("is_resolved").default(false),
  resolvedAt: timestamp("resolved_at"),
  resolvedBy: text("resolved_by").references(() => users.id),
  resolutionNotes: text("resolution_notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// فحوصات الامتثال
export const licenseComplianceChecks = pgTable("license_compliance_checks", {
  id: text("id").primaryKey(),
  licenseId: text("license_id").references(() => licenses.id).notNull(),
  checkDate: timestamp("check_date").notNull(),
  checkType: text("check_type").default("routine"), // routine, audit, incident, renewal
  conductedBy: text("conducted_by").references(() => users.id),
  
  checklist: jsonb("checklist").$type<{
    item: string;
    status: string; // compliant, non_compliant, not_applicable
    notes?: string;
  }[]>(),
  
  overallStatus: text("overall_status").default("compliant"), // compliant, partial, non_compliant
  findings: text("findings"),
  recommendations: text("recommendations"),
  correctiveActions: text("corrective_actions"),
  followUpDate: timestamp("follow_up_date"),
  
  attachments: jsonb("attachments").$type<{
    name: string;
    url: string;
    type: string;
  }[]>(),
  
  createdAt: timestamp("created_at").defaultNow(),
});

// سجل أحداث الرخصة
export const licenseHistory = pgTable("license_history", {
  id: text("id").primaryKey(),
  licenseId: text("license_id").references(() => licenses.id).notNull(),
  action: text("action").notNull(), // created, renewed, amended, suspended, reactivated, expired, cancelled
  fromStatus: text("from_status"),
  toStatus: text("to_status"),
  details: text("details"),
  performedBy: text("performed_by").references(() => users.id),
  performedAt: timestamp("performed_at").defaultNow(),
});

// فئات الرخص
export const licenseCategories = pgTable("license_categories", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  parentCategoryId: text("parent_category_id"),
  requiredDocuments: jsonb("required_documents").$type<string[]>(),
  defaultRenewalPeriod: integer("default_renewal_period").default(12),
  defaultReminderDays: integer("default_reminder_days").default(60),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

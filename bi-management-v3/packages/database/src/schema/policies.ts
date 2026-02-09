/**
 * نظام إدارة اللوائح والسياسات
 * Policies and Regulations Management System
 */
import { pgTable, text, timestamp, boolean, integer, jsonb, decimal } from "drizzle-orm/pg-core";
import { users } from "./users";
import { departments } from "./hr";
import { branches } from "./branches";

// اللوائح والسياسات
export const policies = pgTable("policies", {
  id: text("id").primaryKey(),
  policyNumber: text("policy_number").notNull().unique(),
  title: text("title").notNull(),
  description: text("description"),
  content: text("content"), // المحتوى الكامل
  summary: text("summary"), // ملخص
  
  policyType: text("policy_type").default("policy"), // policy, regulation, procedure, guideline, standard, bylaw
  category: text("category").default("general"), // hr, finance, operations, it, safety, quality, compliance, admin
  subcategory: text("subcategory"),
  
  // النطاق
  scope: text("scope").default("organization"), // organization, department, branch, specific
  applicableDepartments: jsonb("applicable_departments").$type<string[]>(),
  applicableBranches: jsonb("applicable_branches").$type<string[]>(),
  applicableRoles: jsonb("applicable_roles").$type<string[]>(),
  
  // الإصدار
  version: text("version").default("1.0"),
  previousVersionId: text("previous_version_id"),
  changeLog: text("change_log"),
  
  // التواريخ
  effectiveDate: timestamp("effective_date").notNull(),
  expirationDate: timestamp("expiration_date"),
  reviewDate: timestamp("review_date"),
  lastReviewedAt: timestamp("last_reviewed_at"),
  lastReviewedBy: text("last_reviewed_by").references(() => users.id),
  
  // الحالة
  status: text("status").default("draft"), // draft, pending_approval, approved, active, suspended, expired, archived
  
  // الموافقات
  requiresApproval: boolean("requires_approval").default(true),
  approvalWorkflow: jsonb("approval_workflow").$type<{
    step: number;
    approverRole?: string;
    approverId?: string;
    status: string;
    date?: string;
    comments?: string;
  }[]>(),
  approvedBy: text("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  
  // المالك والمسؤول
  ownerId: text("owner_id").references(() => users.id),
  ownerDepartmentId: text("owner_department_id").references(() => departments.id),
  custodianId: text("custodian_id").references(() => users.id), // المسؤول عن تحديث اللائحة
  
  // الأولوية والأهمية
  priority: text("priority").default("medium"), // low, medium, high, critical
  complianceLevel: text("compliance_level").default("mandatory"), // mandatory, recommended, optional
  
  // المرفقات
  attachments: jsonb("attachments").$type<{
    name: string;
    url: string;
    type: string;
    size?: number;
  }[]>(),
  
  // الروابط
  relatedPolicies: jsonb("related_policies").$type<string[]>(),
  references: jsonb("references").$type<{
    title: string;
    url?: string;
    description?: string;
  }[]>(),
  
  // البحث والفهرسة
  keywords: jsonb("keywords").$type<string[]>(),
  tags: jsonb("tags").$type<string[]>(),
  
  // الإحصائيات
  viewCount: integer("view_count").default(0),
  downloadCount: integer("download_count").default(0),
  
  notes: text("notes"),
  
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// أقسام اللائحة
export const policySections = pgTable("policy_sections", {
  id: text("id").primaryKey(),
  policyId: text("policy_id").references(() => policies.id).notNull(),
  sectionNumber: text("section_number").notNull(),
  title: text("title").notNull(),
  content: text("content"),
  orderIndex: integer("order_index").default(0),
  parentSectionId: text("parent_section_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// إقرارات الاطلاع
export const policyAcknowledgments = pgTable("policy_acknowledgments", {
  id: text("id").primaryKey(),
  policyId: text("policy_id").references(() => policies.id).notNull(),
  userId: text("user_id").references(() => users.id).notNull(),
  acknowledgedAt: timestamp("acknowledged_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  method: text("method").default("digital"), // digital, signed, email
  signatureUrl: text("signature_url"),
  notes: text("notes"),
  version: text("version"), // إصدار اللائحة وقت الإقرار
});

// طلبات الإقرار
export const acknowledgmentRequests = pgTable("acknowledgment_requests", {
  id: text("id").primaryKey(),
  policyId: text("policy_id").references(() => policies.id).notNull(),
  requestedBy: text("requested_by").references(() => users.id),
  targetType: text("target_type").default("all"), // all, department, branch, specific
  targetDepartmentId: text("target_department_id").references(() => departments.id),
  targetBranchId: text("target_branch_id").references(() => branches.id),
  targetUserIds: jsonb("target_user_ids").$type<string[]>(),
  deadline: timestamp("deadline"),
  message: text("message"),
  reminderSent: boolean("reminder_sent").default(false),
  lastReminderAt: timestamp("last_reminder_at"),
  status: text("status").default("active"), // active, completed, cancelled
  createdAt: timestamp("created_at").defaultNow(),
});

// مقترحات التعديل
export const policyChangeRequests = pgTable("policy_change_requests", {
  id: text("id").primaryKey(),
  requestNumber: text("request_number").notNull().unique(),
  policyId: text("policy_id").references(() => policies.id).notNull(),
  changeType: text("change_type").default("amendment"), // amendment, addition, deletion, clarification, review
  title: text("title").notNull(),
  description: text("description"),
  proposedChanges: text("proposed_changes"),
  justification: text("justification"),
  impactAnalysis: text("impact_analysis"),
  priority: text("priority").default("normal"),
  requestedBy: text("requested_by").references(() => users.id),
  requestedAt: timestamp("requested_at").defaultNow(),
  status: text("status").default("submitted"), // submitted, under_review, approved, rejected, implemented
  reviewedBy: text("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  reviewComments: text("review_comments"),
  implementedAt: timestamp("implemented_at"),
  attachments: jsonb("attachments").$type<{
    name: string;
    url: string;
    type: string;
  }[]>(),
});

// انتهاكات السياسات
export const policyViolations = pgTable("policy_violations", {
  id: text("id").primaryKey(),
  violationNumber: text("violation_number").notNull().unique(),
  policyId: text("policy_id").references(() => policies.id).notNull(),
  violatorId: text("violator_id").references(() => users.id),
  violatorName: text("violator_name"),
  departmentId: text("department_id").references(() => departments.id),
  branchId: text("branch_id").references(() => branches.id),
  violationDate: timestamp("violation_date").notNull(),
  description: text("description").notNull(),
  severity: text("severity").default("minor"), // minor, moderate, major, critical
  evidence: jsonb("evidence").$type<{
    name: string;
    url: string;
    type: string;
  }[]>(),
  reportedBy: text("reported_by").references(() => users.id),
  reportedAt: timestamp("reported_at").defaultNow(),
  investigatedBy: text("investigated_by").references(() => users.id),
  investigationStartedAt: timestamp("investigation_started_at"),
  investigationCompletedAt: timestamp("investigation_completed_at"),
  investigationFindings: text("investigation_findings"),
  correctiveAction: text("corrective_action"),
  correctiveActionDeadline: timestamp("corrective_action_deadline"),
  correctiveActionCompletedAt: timestamp("corrective_action_completed_at"),
  status: text("status").default("reported"), // reported, investigating, confirmed, resolved, dismissed
  penaltyApplied: text("penalty_applied"),
  notes: text("notes"),
});

// تاريخ مراجعات اللوائح
export const policyReviews = pgTable("policy_reviews", {
  id: text("id").primaryKey(),
  policyId: text("policy_id").references(() => policies.id).notNull(),
  reviewType: text("review_type").default("scheduled"), // scheduled, triggered, ad_hoc
  reviewDate: timestamp("review_date").notNull(),
  reviewerId: text("reviewer_id").references(() => users.id),
  findings: text("findings"),
  recommendations: text("recommendations"),
  outcome: text("outcome").default("no_change"), // no_change, minor_update, major_update, retirement
  nextReviewDate: timestamp("next_review_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

// قوالب اللوائح
export const policyTemplates = pgTable("policy_templates", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  policyType: text("policy_type").notNull(),
  category: text("category"),
  structure: jsonb("structure").$type<{
    sectionTitle: string;
    content?: string;
    subsections?: { title: string; content?: string }[];
  }[]>(),
  defaultContent: text("default_content"),
  isActive: boolean("is_active").default(true),
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// أسئلة شائعة عن اللوائح
export const policyFAQs = pgTable("policy_faqs", {
  id: text("id").primaryKey(),
  policyId: text("policy_id").references(() => policies.id).notNull(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  orderIndex: integer("order_index").default(0),
  isPublished: boolean("is_published").default(true),
  viewCount: integer("view_count").default(0),
  helpfulCount: integer("helpful_count").default(0),
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

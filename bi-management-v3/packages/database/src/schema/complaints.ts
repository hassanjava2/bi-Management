/**
 * Schema - نظام إدارة الشكاوى والاقتراحات
 */
import { pgTable, text, timestamp, boolean, jsonb, integer } from "drizzle-orm/pg-core";
import { users } from "./users";
import { departments } from "./departments";
import { branches } from "./branches";
import { customers } from "./customers";

/**
 * الشكاوى
 */
export const complaints = pgTable("complaints", {
  id: text("id").primaryKey(),
  complaintNumber: text("complaint_number").notNull().unique(),
  
  // مقدم الشكوى
  submitterType: text("submitter_type").default("customer"), // customer, employee, external
  customerId: text("customer_id").references(() => customers.id),
  employeeId: text("employee_id").references(() => users.id),
  externalName: text("external_name"),
  externalPhone: text("external_phone"),
  externalEmail: text("external_email"),
  
  // التصنيف
  category: text("category").default("service"), // service, product, employee, billing, delivery, other
  subcategory: text("subcategory"),
  
  // التفاصيل
  subject: text("subject").notNull(),
  description: text("description").notNull(),
  
  // الأولوية
  priority: text("priority").default("medium"), // low, medium, high, urgent
  
  // المرجع
  relatedType: text("related_type"), // invoice, order, ticket, etc
  relatedId: text("related_id"),
  
  // التخصيص
  departmentId: text("department_id").references(() => departments.id),
  branchId: text("branch_id").references(() => branches.id),
  assignedTo: text("assigned_to").references(() => users.id),
  
  // الحالة
  status: text("status").default("new"), // new, acknowledged, investigating, resolved, closed, escalated
  
  // التصعيد
  escalationLevel: integer("escalation_level").default(0),
  escalatedTo: text("escalated_to").references(() => users.id),
  escalatedAt: timestamp("escalated_at"),
  escalationReason: text("escalation_reason"),
  
  // الحل
  resolution: text("resolution"),
  resolvedBy: text("resolved_by").references(() => users.id),
  resolvedAt: timestamp("resolved_at"),
  
  // رضا العميل
  satisfactionRating: integer("satisfaction_rating"), // 1-5
  satisfactionComment: text("satisfaction_comment"),
  
  // المرفقات
  attachments: jsonb("attachments").$type<{ name: string; url: string }[]>(),
  
  // SLA
  slaDeadline: timestamp("sla_deadline"),
  isSlaBreach: boolean("is_sla_breach").default(false),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * الردود على الشكاوى
 */
export const complaintReplies = pgTable("complaint_replies", {
  id: text("id").primaryKey(),
  complaintId: text("complaint_id").notNull().references(() => complaints.id, { onDelete: "cascade" }),
  
  // الراد
  userId: text("user_id").references(() => users.id),
  isCustomerReply: boolean("is_customer_reply").default(false),
  
  // الرد
  message: text("message").notNull(),
  
  // المرفقات
  attachments: jsonb("attachments").$type<{ name: string; url: string }[]>(),
  
  // داخلي أم خارجي
  isInternal: boolean("is_internal").default(false),
  
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * الاقتراحات
 */
export const suggestions = pgTable("suggestions", {
  id: text("id").primaryKey(),
  suggestionNumber: text("suggestion_number").notNull().unique(),
  
  // مقدم الاقتراح
  submitterType: text("submitter_type").default("customer"), // customer, employee, external
  customerId: text("customer_id").references(() => customers.id),
  employeeId: text("employee_id").references(() => users.id),
  externalName: text("external_name"),
  externalEmail: text("external_email"),
  
  // التصنيف
  category: text("category").default("general"), // product, service, process, technology, general
  
  // التفاصيل
  title: text("title").notNull(),
  description: text("description").notNull(),
  expectedBenefit: text("expected_benefit"),
  
  // التقييم
  status: text("status").default("submitted"), // submitted, under_review, accepted, implemented, rejected
  feasibility: text("feasibility"), // high, medium, low
  impact: text("impact"), // high, medium, low
  
  // المراجعة
  reviewedBy: text("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"),
  
  // التنفيذ
  implementedBy: text("implemented_by").references(() => users.id),
  implementedAt: timestamp("implemented_at"),
  implementationNotes: text("implementation_notes"),
  
  // المكافأة
  rewardGiven: boolean("reward_given").default(false),
  rewardDetails: text("reward_details"),
  
  // التصويت
  upvotes: integer("upvotes").default(0),
  downvotes: integer("downvotes").default(0),
  
  // المرفقات
  attachments: jsonb("attachments").$type<{ name: string; url: string }[]>(),
  
  isPublic: boolean("is_public").default(false),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * سجل الشكاوى
 */
export const complaintHistory = pgTable("complaint_history", {
  id: text("id").primaryKey(),
  complaintId: text("complaint_id").notNull().references(() => complaints.id, { onDelete: "cascade" }),
  
  // التغيير
  action: text("action").notNull(), // status_change, assignment, escalation, etc
  fromValue: text("from_value"),
  toValue: text("to_value"),
  
  // المستخدم
  performedBy: text("performed_by").references(() => users.id),
  
  notes: text("notes"),
  
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * فئات الشكاوى
 */
export const complaintCategories = pgTable("complaint_categories", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  nameEn: text("name_en"),
  
  parentId: text("parent_id"),
  
  // SLA
  slaHours: integer("sla_hours").default(48),
  
  // التخصيص
  defaultDepartmentId: text("default_department_id").references(() => departments.id),
  
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
  
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * استبيانات الرضا
 */
export const satisfactionSurveys = pgTable("satisfaction_surveys", {
  id: text("id").primaryKey(),
  complaintId: text("complaint_id").references(() => complaints.id),
  
  // المقيم
  customerId: text("customer_id").references(() => customers.id),
  
  // التقييمات
  overallRating: integer("overall_rating"), // 1-5
  responseTimeRating: integer("response_time_rating"),
  solutionQualityRating: integer("solution_quality_rating"),
  staffProfessionalismRating: integer("staff_professionalism_rating"),
  
  // التعليق
  comment: text("comment"),
  
  // المتابعة
  wouldRecommend: boolean("would_recommend"),
  needsFollowUp: boolean("needs_follow_up").default(false),
  
  submittedAt: timestamp("submitted_at").defaultNow(),
});

/**
 * نظام إدارة المراسلات الصادرة والواردة
 * Correspondence Management System
 */
import { pgTable, text, timestamp, boolean, integer, jsonb } from "drizzle-orm/pg-core";
import { users } from "./users";
import { departments } from "./hr";
import { branches } from "./branches";
import { customers } from "./customers";
import { suppliers } from "./suppliers";

// المراسلات الصادرة
export const outgoingCorrespondence = pgTable("outgoing_correspondence", {
  id: text("id").primaryKey(),
  referenceNumber: text("reference_number").notNull().unique(),
  subject: text("subject").notNull(),
  content: text("content"),
  correspondenceType: text("correspondence_type").default("letter"), // letter, memo, circular, report, request, decision, contract
  category: text("category").default("general"), // general, official, confidential, urgent, personal
  priority: text("priority").default("normal"), // low, normal, high, urgent
  
  // المرسل
  senderId: text("sender_id").references(() => users.id),
  senderDepartmentId: text("sender_department_id").references(() => departments.id),
  senderBranchId: text("sender_branch_id").references(() => branches.id),
  
  // المستلم
  recipientType: text("recipient_type").default("external"), // internal, external, customer, supplier, government
  recipientName: text("recipient_name"),
  recipientOrganization: text("recipient_organization"),
  recipientDepartment: text("recipient_department"),
  recipientAddress: text("recipient_address"),
  recipientEmail: text("recipient_email"),
  recipientPhone: text("recipient_phone"),
  customerId: text("customer_id").references(() => customers.id),
  supplierId: text("supplier_id").references(() => suppliers.id),
  internalRecipientId: text("internal_recipient_id").references(() => users.id),
  internalDepartmentId: text("internal_department_id").references(() => departments.id),
  
  // نسخ إلى
  ccRecipients: jsonb("cc_recipients").$type<{
    name: string;
    email?: string;
    type: string;
  }[]>(),
  
  // التواريخ
  issueDate: timestamp("issue_date").notNull(),
  dueDate: timestamp("due_date"),
  sentDate: timestamp("sent_date"),
  deliveryDate: timestamp("delivery_date"),
  
  // الحالة
  status: text("status").default("draft"), // draft, pending_approval, approved, sent, delivered, returned, archived
  
  // التوقيعات والموافقات
  requiresApproval: boolean("requires_approval").default(false),
  approvalChain: jsonb("approval_chain").$type<{
    userId: string;
    role: string;
    status: string;
    date?: string;
    notes?: string;
  }[]>(),
  approvedBy: text("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  signedBy: text("signed_by").references(() => users.id),
  signedAt: timestamp("signed_at"),
  signatureImage: text("signature_image"),
  
  // المرفقات
  attachments: jsonb("attachments").$type<{
    name: string;
    url: string;
    type: string;
    size?: number;
  }[]>(),
  
  // الأرشفة
  isArchived: boolean("is_archived").default(false),
  archiveNumber: text("archive_number"),
  archiveLocation: text("archive_location"),
  archivedAt: timestamp("archived_at"),
  archivedBy: text("archived_by").references(() => users.id),
  retentionPeriod: integer("retention_period"), // بالأشهر
  destructionDate: timestamp("destruction_date"),
  
  // الربط
  relatedCorrespondenceId: text("related_correspondence_id"),
  parentCorrespondenceId: text("parent_correspondence_id"),
  threadId: text("thread_id"),
  
  // تفاصيل الإرسال
  deliveryMethod: text("delivery_method").default("email"), // email, fax, post, hand, courier
  trackingNumber: text("tracking_number"),
  
  notes: text("notes"),
  tags: jsonb("tags").$type<string[]>(),
  
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// المراسلات الواردة
export const incomingCorrespondence = pgTable("incoming_correspondence", {
  id: text("id").primaryKey(),
  referenceNumber: text("reference_number").notNull().unique(),
  externalReferenceNumber: text("external_reference_number"), // رقم مرجع المرسل
  subject: text("subject").notNull(),
  content: text("content"),
  correspondenceType: text("correspondence_type").default("letter"),
  category: text("category").default("general"),
  priority: text("priority").default("normal"),
  
  // المرسل
  senderType: text("sender_type").default("external"), // internal, external, customer, supplier, government
  senderName: text("sender_name").notNull(),
  senderOrganization: text("sender_organization"),
  senderDepartment: text("sender_department"),
  senderAddress: text("sender_address"),
  senderEmail: text("sender_email"),
  senderPhone: text("sender_phone"),
  customerId: text("customer_id").references(() => customers.id),
  supplierId: text("supplier_id").references(() => suppliers.id),
  
  // الاستلام
  receivedDate: timestamp("received_date").notNull(),
  receivedBy: text("received_by").references(() => users.id),
  receivedAtBranchId: text("received_at_branch_id").references(() => branches.id),
  
  // الإحالة
  assignedTo: text("assigned_to").references(() => users.id),
  assignedDepartmentId: text("assigned_department_id").references(() => departments.id),
  assignedAt: timestamp("assigned_at"),
  assignedBy: text("assigned_by").references(() => users.id),
  
  // المتابعة
  requiresAction: boolean("requires_action").default(false),
  actionRequired: text("action_required"),
  actionDeadline: timestamp("action_deadline"),
  actionTakenDate: timestamp("action_taken_date"),
  actionTaken: text("action_taken"),
  
  // الحالة
  status: text("status").default("received"), // received, under_review, assigned, in_progress, responded, closed, archived
  
  // المرفقات
  attachments: jsonb("attachments").$type<{
    name: string;
    url: string;
    type: string;
    size?: number;
  }[]>(),
  
  // الأرشفة
  isArchived: boolean("is_archived").default(false),
  archiveNumber: text("archive_number"),
  archiveLocation: text("archive_location"),
  archivedAt: timestamp("archived_at"),
  archivedBy: text("archived_by").references(() => users.id),
  
  // الربط
  responseCorrespondenceId: text("response_correspondence_id"), // رابط الرد الصادر
  relatedCorrespondenceId: text("related_correspondence_id"),
  threadId: text("thread_id"),
  
  notes: text("notes"),
  tags: jsonb("tags").$type<string[]>(),
  
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// سجل تتبع المراسلات
export const correspondenceTracking = pgTable("correspondence_tracking", {
  id: text("id").primaryKey(),
  correspondenceId: text("correspondence_id").notNull(),
  correspondenceDirection: text("correspondence_direction").notNull(), // outgoing, incoming
  action: text("action").notNull(), // created, edited, submitted, approved, rejected, sent, received, assigned, responded, closed, archived
  fromStatus: text("from_status"),
  toStatus: text("to_status"),
  details: text("details"),
  performedBy: text("performed_by").references(() => users.id),
  performedAt: timestamp("performed_at").defaultNow(),
});

// تعليقات المراسلات
export const correspondenceComments = pgTable("correspondence_comments", {
  id: text("id").primaryKey(),
  correspondenceId: text("correspondence_id").notNull(),
  correspondenceDirection: text("correspondence_direction").notNull(),
  comment: text("comment").notNull(),
  isInternal: boolean("is_internal").default(true),
  parentCommentId: text("parent_comment_id"),
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// إعدادات الترقيم
export const correspondenceNumbering = pgTable("correspondence_numbering", {
  id: text("id").primaryKey(),
  direction: text("direction").notNull(), // outgoing, incoming
  departmentId: text("department_id").references(() => departments.id),
  branchId: text("branch_id").references(() => branches.id),
  prefix: text("prefix"),
  suffix: text("suffix"),
  currentNumber: integer("current_number").default(1),
  yearlyReset: boolean("yearly_reset").default(true),
  lastResetDate: timestamp("last_reset_date"),
  format: text("format").default("{prefix}/{year}/{number}"), // تنسيق الرقم
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// قوالب المراسلات
export const correspondenceTemplates = pgTable("correspondence_templates", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  correspondenceType: text("correspondence_type").notNull(),
  category: text("category"),
  subject: text("subject"),
  content: text("content"),
  headerTemplate: text("header_template"),
  footerTemplate: text("footer_template"),
  variables: jsonb("variables").$type<{
    name: string;
    label: string;
    type: string;
    required: boolean;
  }[]>(),
  departmentId: text("department_id").references(() => departments.id),
  isActive: boolean("is_active").default(true),
  isDefault: boolean("is_default").default(false),
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

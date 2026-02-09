/**
 * Schema - نظام إدارة المستندات والتوقيعات
 */
import { pgTable, text, timestamp, boolean, jsonb, integer } from "drizzle-orm/pg-core";
import { users } from "./users";
import { branches } from "./branches";
import { departments } from "./departments";

/**
 * المستندات
 */
export const documents = pgTable("documents", {
  id: text("id").primaryKey(),
  documentNumber: text("document_number").notNull().unique(),
  
  // معلومات المستند
  title: text("title").notNull(),
  description: text("description"),
  
  // النوع والتصنيف
  documentType: text("document_type").default("general"), // contract, policy, form, report, invoice, other
  category: text("category"),
  
  // الملف
  fileName: text("file_name"),
  fileUrl: text("file_url"),
  fileType: text("file_type"), // pdf, docx, xlsx, etc.
  fileSize: integer("file_size"), // bytes
  
  // الإصدار
  version: integer("version").default(1),
  isLatestVersion: boolean("is_latest_version").default(true),
  parentDocumentId: text("parent_document_id"),
  
  // الحالة
  status: text("status").default("draft"), // draft, pending_review, approved, rejected, archived
  
  // التوقيعات
  requiresSignature: boolean("requires_signature").default(false),
  signatureStatus: text("signature_status"), // pending, partial, completed
  signedAt: timestamp("signed_at"),
  
  // الصلاحيات
  isPublic: boolean("is_public").default(false),
  isConfidential: boolean("is_confidential").default(false),
  accessLevel: text("access_level").default("standard"), // public, standard, confidential, top_secret
  
  // النطاق
  branchId: text("branch_id").references(() => branches.id),
  departmentId: text("department_id").references(() => departments.id),
  
  // التواريخ
  effectiveDate: timestamp("effective_date"),
  expiryDate: timestamp("expiry_date"),
  
  // العلامات
  tags: jsonb("tags").$type<string[]>(),
  metadata: jsonb("metadata").$type<Record<string, any>>(),
  
  createdBy: text("created_by").references(() => users.id),
  updatedBy: text("updated_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * التوقيعات الإلكترونية
 */
export const signatures = pgTable("signatures", {
  id: text("id").primaryKey(),
  documentId: text("document_id").notNull().references(() => documents.id, { onDelete: "cascade" }),
  
  // الموقع
  signerId: text("signer_id").references(() => users.id),
  signerName: text("signer_name").notNull(),
  signerEmail: text("signer_email"),
  signerRole: text("signer_role"), // approver, reviewer, witness
  
  // التوقيع
  signatureType: text("signature_type").default("electronic"), // electronic, digital, drawn
  signatureData: text("signature_data"), // base64 image or certificate hash
  signaturePosition: jsonb("signature_position").$type<{ page: number; x: number; y: number }>(),
  
  // الحالة
  status: text("status").default("pending"), // pending, signed, declined, expired
  
  // التحقق
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  verificationCode: text("verification_code"),
  isVerified: boolean("is_verified").default(false),
  
  // الترتيب
  signOrder: integer("sign_order").default(1),
  
  // التواريخ
  requestedAt: timestamp("requested_at").defaultNow(),
  signedAt: timestamp("signed_at"),
  expiresAt: timestamp("expires_at"),
  declinedAt: timestamp("declined_at"),
  declineReason: text("decline_reason"),
});

/**
 * مجلدات المستندات
 */
export const documentFolders = pgTable("document_folders", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  parentId: text("parent_id"),
  
  // المسار
  path: text("path"), // /folder1/folder2
  
  // الإعدادات
  color: text("color"),
  icon: text("icon"),
  
  // الصلاحيات
  isShared: boolean("is_shared").default(false),
  accessLevel: text("access_level").default("standard"),
  
  branchId: text("branch_id").references(() => branches.id),
  departmentId: text("department_id").references(() => departments.id),
  
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * صلاحيات الوصول للمستندات
 */
export const documentAccess = pgTable("document_access", {
  id: text("id").primaryKey(),
  documentId: text("document_id").references(() => documents.id, { onDelete: "cascade" }),
  folderId: text("folder_id").references(() => documentFolders.id, { onDelete: "cascade" }),
  
  // الكيان المستهدف
  userId: text("user_id").references(() => users.id),
  departmentId: text("department_id").references(() => departments.id),
  
  // الصلاحيات
  canView: boolean("can_view").default(true),
  canEdit: boolean("can_edit").default(false),
  canDelete: boolean("can_delete").default(false),
  canShare: boolean("can_share").default(false),
  canSign: boolean("can_sign").default(false),
  
  grantedBy: text("granted_by").references(() => users.id),
  grantedAt: timestamp("granted_at").defaultNow(),
  expiresAt: timestamp("expires_at"),
});

/**
 * سجل عرض المستندات
 */
export const documentViews = pgTable("document_views", {
  id: text("id").primaryKey(),
  documentId: text("document_id").notNull().references(() => documents.id, { onDelete: "cascade" }),
  viewerId: text("viewer_id").references(() => users.id),
  
  viewedAt: timestamp("viewed_at").defaultNow(),
  duration: integer("duration"), // seconds
  ipAddress: text("ip_address"),
});

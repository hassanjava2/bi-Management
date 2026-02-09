/**
 * Schema - نظام المرفقات والملفات
 */
import { pgTable, text, timestamp, boolean, jsonb, integer, bigint } from "drizzle-orm/pg-core";
import { users } from "./users";

/**
 * المجلدات
 */
export const folders = pgTable("folders", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  
  parentId: text("parent_id"),
  path: text("path").notNull(), // /root/folder1/folder2
  
  // النوع
  folderType: text("folder_type").default("general"), // general, documents, images, invoices, contracts
  
  // الصلاحيات
  isPublic: boolean("is_public").default(false),
  allowedRoles: jsonb("allowed_roles").$type<string[]>(),
  
  // اللون والأيقونة
  color: text("color"),
  icon: text("icon"),
  
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * الملفات
 */
export const files = pgTable("files", {
  id: text("id").primaryKey(),
  
  // المعلومات الأساسية
  name: text("name").notNull(),
  originalName: text("original_name").notNull(),
  
  // المسار
  folderId: text("folder_id").references(() => folders.id),
  path: text("path").notNull(),
  url: text("url").notNull(),
  
  // النوع والحجم
  mimeType: text("mime_type").notNull(),
  extension: text("extension"),
  size: bigint("size", { mode: "number" }).notNull(), // بالبايت
  
  // الارتباط بكيان
  entityType: text("entity_type"), // invoice, customer, product, contract, employee
  entityId: text("entity_id"),
  
  // الوصف والتصنيف
  description: text("description"),
  tags: jsonb("tags").$type<string[]>(),
  category: text("category"), // document, image, video, audio, archive, other
  
  // البيانات الوصفية
  metadata: jsonb("metadata").$type<{
    width?: number;
    height?: number;
    duration?: number;
    pages?: number;
  }>(),
  
  // الحالة
  isPublic: boolean("is_public").default(false),
  isArchived: boolean("is_archived").default(false),
  
  // التحميلات
  downloadCount: integer("download_count").default(0),
  lastDownloadedAt: timestamp("last_downloaded_at"),
  
  // الإصدارات
  version: integer("version").default(1),
  previousVersionId: text("previous_version_id"),
  
  uploadedBy: text("uploaded_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * مشاركة الملفات
 */
export const fileShares = pgTable("file_shares", {
  id: text("id").primaryKey(),
  fileId: text("file_id").notNull().references(() => files.id, { onDelete: "cascade" }),
  
  // نوع المشاركة
  shareType: text("share_type").default("link"), // link, user, role
  
  // المستلم
  sharedWithUserId: text("shared_with_user_id").references(() => users.id),
  sharedWithRole: text("shared_with_role"),
  
  // رابط المشاركة
  shareToken: text("share_token").unique(),
  shareUrl: text("share_url"),
  
  // الصلاحيات
  permissions: text("permissions").default("view"), // view, download, edit
  
  // الصلاحية
  expiresAt: timestamp("expires_at"),
  maxDownloads: integer("max_downloads"),
  downloadCount: integer("download_count").default(0),
  
  // الحماية
  password: text("password"),
  
  sharedBy: text("shared_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * سجل تحميل الملفات
 */
export const fileDownloads = pgTable("file_downloads", {
  id: text("id").primaryKey(),
  fileId: text("file_id").notNull().references(() => files.id),
  
  downloadedBy: text("downloaded_by").references(() => users.id),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  
  shareId: text("share_id").references(() => fileShares.id),
  
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * إعدادات التخزين
 */
export const storageSettings = pgTable("storage_settings", {
  id: text("id").primaryKey(),
  
  // الحدود
  maxFileSize: bigint("max_file_size", { mode: "number" }).default(52428800), // 50MB
  maxStoragePerUser: bigint("max_storage_per_user", { mode: "number" }),
  
  // الأنواع المسموحة
  allowedMimeTypes: jsonb("allowed_mime_types").$type<string[]>(),
  blockedExtensions: jsonb("blocked_extensions").$type<string[]>(),
  
  // التخزين
  storageProvider: text("storage_provider").default("local"), // local, s3, azure, gcp
  storageConfig: jsonb("storage_config").$type<Record<string, any>>(),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

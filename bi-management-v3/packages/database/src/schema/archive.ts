/**
 * Schema - نظام الأرشيف والتوثيق
 */
import { pgTable, text, timestamp, boolean, jsonb, integer } from "drizzle-orm/pg-core";
import { users } from "./users";

/**
 * العناصر المؤرشفة
 */
export const archivedItems = pgTable("archived_items", {
  id: text("id").primaryKey(),
  
  // نوع العنصر
  entityType: text("entity_type").notNull(), // invoice, customer, product, order, employee, etc.
  entityId: text("entity_id").notNull(),
  
  // معلومات العرض
  title: text("title").notNull(),
  description: text("description"),
  
  // البيانات الأصلية
  originalData: jsonb("original_data").$type<Record<string, any>>(),
  
  // التصنيف
  category: text("category"), // financial, sales, hr, inventory
  tags: jsonb("tags").$type<string[]>(),
  
  // الفترة
  archivePeriod: text("archive_period"), // 2024-Q1, 2024-01, etc.
  
  // سبب الأرشفة
  archiveReason: text("archive_reason"), // completed, expired, deleted, migrated
  
  // الاحتفاظ
  retentionPeriod: integer("retention_period"), // بالأشهر
  expiresAt: timestamp("expires_at"),
  
  // البحث
  searchText: text("search_text"), // نص مجمع للبحث
  
  // الحالة
  isLocked: boolean("is_locked").default(false),
  isExpired: boolean("is_expired").default(false),
  
  archivedBy: text("archived_by").references(() => users.id),
  archivedAt: timestamp("archived_at").defaultNow(),
  
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * النسخ الاحتياطية
 */
export const backups = pgTable("backups", {
  id: text("id").primaryKey(),
  
  name: text("name").notNull(),
  description: text("description"),
  
  // النوع
  backupType: text("backup_type").default("full"), // full, incremental, differential
  
  // النطاق
  scope: text("scope").default("all"), // all, specific_tables
  includedTables: jsonb("included_tables").$type<string[]>(),
  
  // الحجم والموقع
  size: text("size"), // بالبايت
  location: text("location"), // مسار الملف
  storageType: text("storage_type").default("local"), // local, cloud, external
  
  // الحالة
  status: text("status").default("pending"), // pending, in_progress, completed, failed
  progress: integer("progress").default(0),
  
  // التوقيت
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  
  // الأخطاء
  errorMessage: text("error_message"),
  
  // الاستعادة
  lastRestoredAt: timestamp("last_restored_at"),
  restoreCount: integer("restore_count").default(0),
  
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * سياسات الاحتفاظ
 */
export const retentionPolicies = pgTable("retention_policies", {
  id: text("id").primaryKey(),
  
  name: text("name").notNull(),
  description: text("description"),
  
  // النطاق
  entityType: text("entity_type").notNull(),
  
  // الفترة
  retentionPeriod: integer("retention_period").notNull(), // بالأشهر
  
  // الإجراء
  action: text("action").default("archive"), // archive, delete, notify
  
  // الشروط
  conditions: jsonb("conditions").$type<{ field: string; operator: string; value: string }[]>(),
  
  // الجدولة
  runFrequency: text("run_frequency").default("monthly"), // daily, weekly, monthly
  lastRunAt: timestamp("last_run_at"),
  nextRunAt: timestamp("next_run_at"),
  
  isActive: boolean("is_active").default(true),
  
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * سجل عمليات الأرشفة
 */
export const archiveLog = pgTable("archive_log", {
  id: text("id").primaryKey(),
  
  // العملية
  operation: text("operation").notNull(), // archive, restore, delete, export
  
  // التفاصيل
  entityType: text("entity_type"),
  entityId: text("entity_id"),
  itemCount: integer("item_count").default(1),
  
  // النتيجة
  status: text("status").default("success"), // success, failed, partial
  details: text("details"),
  errorMessage: text("error_message"),
  
  performedBy: text("performed_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

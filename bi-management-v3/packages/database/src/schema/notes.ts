/**
 * Schema - نظام الملاحظات
 */
import { pgTable, text, timestamp, boolean, jsonb, integer } from "drizzle-orm/pg-core";
import { users } from "./users";
import { customers } from "./customers";

/**
 * الملاحظات
 */
export const notes = pgTable("notes", {
  id: text("id").primaryKey(),
  
  // المحتوى
  title: text("title"),
  content: text("content").notNull(),
  
  // الارتباط
  entityType: text("entity_type").notNull(), // customer, invoice, supplier, product, order, lead, contract, employee
  entityId: text("entity_id").notNull(),
  entityName: text("entity_name"), // لعرض سريع
  
  // النوع
  noteType: text("note_type").default("general"), // general, important, warning, followup, reminder, feedback
  
  // الأولوية
  isPinned: boolean("is_pinned").default(false),
  isPrivate: boolean("is_private").default(false), // خاصة بالمستخدم فقط
  
  // اللون
  color: text("color"), // للتمييز البصري
  
  // التذكير
  reminderAt: timestamp("reminder_at"),
  reminderSent: boolean("reminder_sent").default(false),
  
  // المرفقات
  attachments: jsonb("attachments").$type<{ name: string; url: string; type: string }[]>(),
  
  // الإشارات
  mentions: jsonb("mentions").$type<string[]>(), // user IDs
  
  // الموظف
  createdBy: text("created_by").references(() => users.id),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * قوالب الملاحظات
 */
export const noteTemplates = pgTable("note_templates", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  content: text("content").notNull(),
  
  category: text("category"), // sales, support, followup
  entityType: text("entity_type"), // customer, invoice, etc.
  
  isActive: boolean("is_active").default(true),
  usageCount: integer("usage_count").default(0),
  
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * ملاحظات سريعة / مفضلات
 */
export const quickNotes = pgTable("quick_notes", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  
  content: text("content").notNull(),
  color: text("color"),
  
  sortOrder: integer("sort_order").default(0),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

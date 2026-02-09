/**
 * Schema - نظام التذاكر والدعم الفني
 */
import { pgTable, text, timestamp, boolean, jsonb, integer, index } from "drizzle-orm/pg-core";
import { users } from "./users";
import { branches } from "./branches";
import { departments } from "./departments";

/**
 * التذاكر
 */
export const tickets = pgTable("tickets", {
  id: text("id").primaryKey(),
  ticketNumber: text("ticket_number").notNull().unique(),
  
  // معلومات التذكرة
  title: text("title").notNull(),
  description: text("description"),
  
  // التصنيف
  category: text("category").default("technical"), // technical, sales, finance, hr, other
  subCategory: text("sub_category"),
  
  // الأولوية والحالة
  priority: text("priority").default("medium"), // low, medium, high, urgent
  status: text("status").default("open"), // open, in_progress, pending, resolved, closed
  
  // المصدر
  source: text("source").default("internal"), // internal, email, phone, web
  
  // النطاق
  branchId: text("branch_id").references(() => branches.id),
  departmentId: text("department_id").references(() => departments.id),
  
  // المُنشئ والمسؤول
  createdBy: text("created_by").references(() => users.id),
  assignedTo: text("assigned_to").references(() => users.id),
  
  // التواريخ
  dueDate: timestamp("due_date"),
  firstResponseAt: timestamp("first_response_at"),
  resolvedAt: timestamp("resolved_at"),
  closedAt: timestamp("closed_at"),
  
  // الوقت المستغرق
  timeSpentMinutes: integer("time_spent_minutes").default(0),
  
  // التقييم
  satisfactionRating: integer("satisfaction_rating"), // 1-5
  satisfactionComment: text("satisfaction_comment"),
  
  // المرفقات
  attachments: jsonb("attachments").$type<{ name: string; url: string; type: string }[]>(),
  
  // العلامات
  tags: jsonb("tags").$type<string[]>(),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("tickets_branch_id_idx").on(table.branchId),
  index("tickets_department_id_idx").on(table.departmentId),
  index("tickets_created_by_idx").on(table.createdBy),
  index("tickets_assigned_to_idx").on(table.assignedTo),
  index("tickets_status_idx").on(table.status),
  index("tickets_priority_idx").on(table.priority),
  index("tickets_created_at_idx").on(table.createdAt),
  index("tickets_due_date_idx").on(table.dueDate),
  index("tickets_resolved_at_idx").on(table.resolvedAt),
]);

/**
 * ردود التذاكر
 */
export const ticketReplies = pgTable("ticket_replies", {
  id: text("id").primaryKey(),
  ticketId: text("ticket_id").notNull().references(() => tickets.id, { onDelete: "cascade" }),
  
  // الرد
  content: text("content").notNull(),
  
  // النوع
  replyType: text("reply_type").default("reply"), // reply, note, system
  isInternal: boolean("is_internal").default(false),
  
  // المرفقات
  attachments: jsonb("attachments").$type<{ name: string; url: string; type: string }[]>(),
  
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("ticket_replies_ticket_id_idx").on(table.ticketId),
  index("ticket_replies_created_by_idx").on(table.createdBy),
  index("ticket_replies_created_at_idx").on(table.createdAt),
]);

/**
 * سجل تغييرات التذاكر
 */
export const ticketHistory = pgTable("ticket_history", {
  id: text("id").primaryKey(),
  ticketId: text("ticket_id").notNull().references(() => tickets.id, { onDelete: "cascade" }),
  
  // التغيير
  field: text("field").notNull(),
  oldValue: text("old_value"),
  newValue: text("new_value"),
  
  changedBy: text("changed_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("ticket_history_ticket_id_idx").on(table.ticketId),
  index("ticket_history_changed_by_idx").on(table.changedBy),
  index("ticket_history_created_at_idx").on(table.createdAt),
]);

/**
 * فئات التذاكر
 */
export const ticketCategories = pgTable("ticket_categories", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  nameEn: text("name_en"),
  description: text("description"),
  parentId: text("parent_id"),
  
  // الإعدادات الافتراضية
  defaultPriority: text("default_priority").default("medium"),
  defaultAssignee: text("default_assignee").references(() => users.id),
  slaHours: integer("sla_hours").default(24),
  
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
  
  createdAt: timestamp("created_at").defaultNow(),
});

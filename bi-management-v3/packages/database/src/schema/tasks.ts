/**
 * Schema - نظام إدارة المهام
 */
import { pgTable, text, timestamp, integer, boolean, jsonb, index } from "drizzle-orm/pg-core";
import { users } from "./users";
import { departments } from "./departments";

/**
 * المهام
 */
export const tasks = pgTable("tasks", {
  id: text("id").primaryKey(),
  taskNumber: text("task_number").notNull().unique(), // TSK-2026-000001
  
  // التفاصيل
  title: text("title").notNull(),
  description: text("description"),
  
  // النوع والتصنيف
  taskType: text("task_type").default("general"), // general, maintenance, sales, support, inventory, other
  category: text("category"),
  tags: jsonb("tags").$type<string[]>(),
  
  // الأولوية والحالة
  priority: text("priority").default("medium"), // low, medium, high, urgent
  status: text("status").default("pending"), // pending, in_progress, on_hold, completed, cancelled
  
  // التعيين
  assignedTo: text("assigned_to").references(() => users.id),
  assignedBy: text("assigned_by").references(() => users.id),
  departmentId: text("department_id").references(() => departments.id),
  
  // المواعيد
  dueDate: timestamp("due_date"),
  startDate: timestamp("start_date"),
  completedAt: timestamp("completed_at"),
  
  // الوقت المقدر والفعلي (بالدقائق)
  estimatedMinutes: integer("estimated_minutes"),
  actualMinutes: integer("actual_minutes"),
  
  // الارتباطات
  relatedType: text("related_type"), // customer, invoice, maintenance, contract, product
  relatedId: text("related_id"),
  relatedTitle: text("related_title"),
  
  // التكرار
  isRecurring: boolean("is_recurring").default(false),
  recurringPattern: text("recurring_pattern"), // daily, weekly, monthly
  recurringEndDate: timestamp("recurring_end_date"),
  parentTaskId: text("parent_task_id"), // للمهام الفرعية
  
  // التقدم
  progressPercentage: integer("progress_percentage").default(0),
  
  // المرفقات
  attachments: jsonb("attachments").$type<{ name: string; url: string; type: string }[]>(),
  
  // ملاحظات
  notes: text("notes"),
  
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("tasks_assigned_to_idx").on(table.assignedTo),
  index("tasks_assigned_by_idx").on(table.assignedBy),
  index("tasks_department_id_idx").on(table.departmentId),
  index("tasks_created_by_idx").on(table.createdBy),
  index("tasks_status_idx").on(table.status),
  index("tasks_priority_idx").on(table.priority),
  index("tasks_created_at_idx").on(table.createdAt),
  index("tasks_due_date_idx").on(table.dueDate),
  index("tasks_start_date_idx").on(table.startDate),
  index("tasks_completed_at_idx").on(table.completedAt),
]);

/**
 * المهام الفرعية (قائمة المراجعة)
 */
export const taskChecklists = pgTable("task_checklists", {
  id: text("id").primaryKey(),
  taskId: text("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  
  title: text("title").notNull(),
  isCompleted: boolean("is_completed").default(false),
  completedAt: timestamp("completed_at"),
  completedBy: text("completed_by").references(() => users.id),
  
  sortOrder: integer("sort_order").default(0),
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("task_checklists_task_id_idx").on(table.taskId),
  index("task_checklists_completed_by_idx").on(table.completedBy),
  index("task_checklists_is_completed_idx").on(table.isCompleted),
]);

/**
 * تعليقات المهام
 */
export const taskComments = pgTable("task_comments", {
  id: text("id").primaryKey(),
  taskId: text("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  
  userId: text("user_id").references(() => users.id),
  userName: text("user_name"),
  
  content: text("content").notNull(),
  
  // المرفقات
  attachments: jsonb("attachments").$type<{ name: string; url: string }[]>(),
  
  // تعليق داخلي (للموظفين فقط)
  isInternal: boolean("is_internal").default(false),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * سجل نشاط المهام
 */
export const taskActivities = pgTable("task_activities", {
  id: text("id").primaryKey(),
  taskId: text("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  
  activityType: text("activity_type").notNull(), // created, assigned, status_changed, comment_added, completed, etc.
  description: text("description"),
  
  // التغييرات
  oldValue: text("old_value"),
  newValue: text("new_value"),
  
  performedBy: text("performed_by").references(() => users.id),
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("task_activities_task_id_idx").on(table.taskId),
  index("task_activities_performed_by_idx").on(table.performedBy),
  index("task_activities_created_at_idx").on(table.createdAt),
]);

/**
 * التذكيرات
 */
export const taskReminders = pgTable("task_reminders", {
  id: text("id").primaryKey(),
  taskId: text("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  
  userId: text("user_id").references(() => users.id),
  
  reminderAt: timestamp("reminder_at").notNull(),
  reminderType: text("reminder_type").default("notification"), // notification, email, sms
  
  message: text("message"),
  
  isSent: boolean("is_sent").default(false),
  sentAt: timestamp("sent_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("task_reminders_task_id_idx").on(table.taskId),
  index("task_reminders_user_id_idx").on(table.userId),
  index("task_reminders_reminder_at_idx").on(table.reminderAt),
  index("task_reminders_is_sent_idx").on(table.isSent),
]);

/**
 * قوالب المهام
 */
export const taskTemplates = pgTable("task_templates", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  
  // التفاصيل الافتراضية
  defaultTitle: text("default_title"),
  defaultDescription: text("default_description"),
  defaultTaskType: text("default_task_type"),
  defaultPriority: text("default_priority"),
  defaultEstimatedMinutes: integer("default_estimated_minutes"),
  
  // قائمة المراجعة الافتراضية
  defaultChecklist: jsonb("default_checklist").$type<string[]>(),
  
  // التعيين الافتراضي
  defaultAssignTo: text("default_assign_to").references(() => users.id),
  defaultDepartmentId: text("default_department_id").references(() => departments.id),
  
  isActive: boolean("is_active").default(true),
  usageCount: integer("usage_count").default(0),
  
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("task_templates_default_assign_to_idx").on(table.defaultAssignTo),
  index("task_templates_default_department_id_idx").on(table.defaultDepartmentId),
  index("task_templates_is_active_idx").on(table.isActive),
  index("task_templates_created_by_idx").on(table.createdBy),
]);

/**
 * تتبع الوقت
 */
export const taskTimeEntries = pgTable("task_time_entries", {
  id: text("id").primaryKey(),
  taskId: text("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  userId: text("user_id").references(() => users.id),
  
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  
  durationMinutes: integer("duration_minutes"),
  description: text("description"),
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("task_time_entries_task_id_idx").on(table.taskId),
  index("task_time_entries_user_id_idx").on(table.userId),
  index("task_time_entries_start_time_idx").on(table.startTime),
]);

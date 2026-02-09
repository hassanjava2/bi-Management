import { pgTable, text, integer, real, timestamp, date } from "drizzle-orm/pg-core";
import { users } from "./users";
import { customers } from "./customers";

// Projects - المشاريع
export const projects = pgTable("projects", {
  id: text("id").primaryKey(),
  code: text("code").unique(),
  name: text("name").notNull(),
  nameAr: text("name_ar"),
  description: text("description"),
  customerId: text("customer_id").references(() => customers.id),
  managerId: text("manager_id").references(() => users.id),
  // Status: planning, active, on_hold, completed, cancelled
  status: text("status").default("planning"),
  priority: text("priority").default("normal"),
  // Type: internal, client, fixed_price, time_material
  projectType: text("project_type"),
  // Dates
  startDate: date("start_date"),
  endDate: date("end_date"),
  actualStartDate: date("actual_start_date"),
  actualEndDate: date("actual_end_date"),
  // Budget
  estimatedBudget: real("estimated_budget"),
  actualCost: real("actual_cost").default(0),
  // Progress
  progress: real("progress").default(0),
  completedTasks: integer("completed_tasks").default(0),
  totalTasks: integer("total_tasks").default(0),
  // Settings
  isBillable: integer("is_billable").default(1),
  hourlyRate: real("hourly_rate"),
  notes: text("notes"),
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Project Tasks - مهام المشروع
export const projectTasks = pgTable("project_tasks", {
  id: text("id").primaryKey(),
  code: text("code").unique(),
  projectId: text("project_id").references(() => projects.id),
  parentTaskId: text("parent_task_id"),
  name: text("name").notNull(),
  description: text("description"),
  assigneeId: text("assignee_id").references(() => users.id),
  // Status: todo, in_progress, review, done, cancelled
  status: text("status").default("todo"),
  priority: text("priority").default("normal"),
  // Dates
  startDate: date("start_date"),
  dueDate: date("due_date"),
  completedAt: timestamp("completed_at"),
  // Time tracking
  estimatedHours: real("estimated_hours"),
  actualHours: real("actual_hours").default(0),
  // Display order
  sortOrder: integer("sort_order").default(0),
  notes: text("notes"),
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Project Milestones - معالم المشروع
export const projectMilestones = pgTable("project_milestones", {
  id: text("id").primaryKey(),
  projectId: text("project_id").references(() => projects.id),
  name: text("name").notNull(),
  description: text("description"),
  dueDate: date("due_date"),
  completedAt: timestamp("completed_at"),
  // Status: pending, completed
  status: text("status").default("pending"),
  isBillingMilestone: integer("is_billing_milestone").default(0),
  invoiceAmount: real("invoice_amount"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Time Entries - سجل الوقت
export const timeEntries = pgTable("time_entries", {
  id: text("id").primaryKey(),
  projectId: text("project_id").references(() => projects.id),
  taskId: text("task_id").references(() => projectTasks.id),
  userId: text("user_id").references(() => users.id),
  date: date("date"),
  hours: real("hours").notNull(),
  description: text("description"),
  isBillable: integer("is_billable").default(1),
  hourlyRate: real("hourly_rate"),
  // Status: draft, submitted, approved, rejected
  status: text("status").default("draft"),
  approvedBy: text("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Project Team Members - فريق المشروع
export const projectMembers = pgTable("project_members", {
  id: text("id").primaryKey(),
  projectId: text("project_id").references(() => projects.id),
  userId: text("user_id").references(() => users.id),
  role: text("role"), // manager, developer, designer, qa, etc.
  hourlyRate: real("hourly_rate"),
  startDate: date("start_date"),
  endDate: date("end_date"),
  isActive: integer("is_active").default(1),
  createdAt: timestamp("created_at").defaultNow(),
});

// Project Expenses - مصاريف المشروع
export const projectExpenses = pgTable("project_expenses", {
  id: text("id").primaryKey(),
  projectId: text("project_id").references(() => projects.id),
  category: text("category"),
  description: text("description"),
  amount: real("amount").notNull(),
  date: date("date"),
  receipt: text("receipt"),
  isBillable: integer("is_billable").default(1),
  // Status: pending, approved, rejected
  status: text("status").default("pending"),
  submittedBy: text("submitted_by").references(() => users.id),
  approvedBy: text("approved_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

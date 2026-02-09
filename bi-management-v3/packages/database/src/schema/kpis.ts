/**
 * Schema - نظام الأهداف ومؤشرات الأداء
 */
import { pgTable, text, timestamp, boolean, jsonb, integer } from "drizzle-orm/pg-core";
import { users } from "./users";
import { departments } from "./departments";
import { branches } from "./branches";

/**
 * مؤشرات الأداء الرئيسية
 */
export const kpis = pgTable("kpis", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  nameEn: text("name_en"),
  description: text("description"),
  
  // التصنيف
  category: text("category").default("sales"), // sales, finance, operations, hr, customer, inventory
  
  // النوع
  kpiType: text("kpi_type").default("value"), // value, percentage, ratio, count
  unit: text("unit"), // IQD, %, units, orders
  
  // الحساب
  calculationMethod: text("calculation_method"), // sum, average, count, formula
  formula: text("formula"), // معادلة الحساب إن وجدت
  dataSource: text("data_source"), // invoices, orders, inventory, etc.
  
  // الاتجاه
  direction: text("direction").default("higher_is_better"), // higher_is_better, lower_is_better, target_is_best
  
  // الحالة
  isActive: boolean("is_active").default(true),
  
  // التحديث
  updateFrequency: text("update_frequency").default("daily"), // realtime, hourly, daily, weekly, monthly
  lastCalculatedAt: timestamp("last_calculated_at"),
  
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * الأهداف
 */
export const goals = pgTable("goals", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  
  // مؤشر الأداء
  kpiId: text("kpi_id").references(() => kpis.id),
  
  // النطاق
  scope: text("scope").default("company"), // company, branch, department, user
  branchId: text("branch_id").references(() => branches.id),
  departmentId: text("department_id").references(() => departments.id),
  userId: text("user_id").references(() => users.id),
  
  // الفترة
  period: text("period").default("monthly"), // daily, weekly, monthly, quarterly, yearly
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  
  // القيم
  targetValue: text("target_value").notNull(),
  currentValue: text("current_value").default("0"),
  startingValue: text("starting_value").default("0"),
  
  // الحدود
  minThreshold: text("min_threshold"), // الحد الأدنى المقبول
  stretchTarget: text("stretch_target"), // الهدف الطموح
  
  // التقدم
  progressPercentage: integer("progress_percentage").default(0),
  
  // الحالة
  status: text("status").default("on_track"), // not_started, on_track, at_risk, behind, achieved, exceeded
  
  // الأولوية
  priority: text("priority").default("medium"), // low, medium, high, critical
  
  // الملاحظات
  notes: text("notes"),
  
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * قيم المؤشرات (تاريخي)
 */
export const kpiValues = pgTable("kpi_values", {
  id: text("id").primaryKey(),
  kpiId: text("kpi_id").notNull().references(() => kpis.id),
  
  // النطاق
  branchId: text("branch_id").references(() => branches.id),
  departmentId: text("department_id").references(() => departments.id),
  userId: text("user_id").references(() => users.id),
  
  // القيمة
  value: text("value").notNull(),
  previousValue: text("previous_value"),
  changePercentage: text("change_percentage"),
  
  // الفترة
  periodType: text("period_type").default("daily"), // hourly, daily, weekly, monthly
  periodDate: timestamp("period_date").notNull(),
  
  // البيانات الإضافية
  breakdown: jsonb("breakdown").$type<{ label: string; value: string }[]>(),
  
  calculatedAt: timestamp("calculated_at").defaultNow(),
});

/**
 * تحديثات الأهداف
 */
export const goalUpdates = pgTable("goal_updates", {
  id: text("id").primaryKey(),
  goalId: text("goal_id").notNull().references(() => goals.id, { onDelete: "cascade" }),
  
  // القيم
  previousValue: text("previous_value"),
  newValue: text("new_value").notNull(),
  progressPercentage: integer("progress_percentage"),
  
  // الحالة
  previousStatus: text("previous_status"),
  newStatus: text("new_status"),
  
  // الملاحظات
  notes: text("notes"),
  
  updatedBy: text("updated_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * لوحات المؤشرات
 */
export const kpiDashboards = pgTable("kpi_dashboards", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  
  // المؤشرات المعروضة
  widgets: jsonb("widgets").$type<{
    id: string;
    kpiId: string;
    type: string; // number, chart, gauge, table
    position: { x: number; y: number; w: number; h: number };
    config?: Record<string, any>;
  }[]>(),
  
  // الصلاحيات
  isPublic: boolean("is_public").default(false),
  allowedRoles: jsonb("allowed_roles").$type<string[]>(),
  
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

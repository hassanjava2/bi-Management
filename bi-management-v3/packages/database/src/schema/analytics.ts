/**
 * Schema - نظام التحليلات المتقدمة
 */
import { pgTable, text, timestamp, boolean, jsonb, integer, decimal } from "drizzle-orm/pg-core";
import { users } from "./users";
import { departments } from "./departments";
import { branches } from "./branches";

/**
 * لوحات المعلومات
 */
export const dashboards = pgTable("dashboards", {
  id: text("id").primaryKey(),
  
  // المعلومات
  name: text("name").notNull(),
  description: text("description"),
  
  // النوع
  dashboardType: text("dashboard_type").default("custom"), // custom, department, executive, operational
  
  // الإعدادات
  layout: jsonb("layout").$type<{ columns: number; rows: number }>(),
  theme: text("theme").default("light"),
  refreshInterval: integer("refresh_interval"), // seconds
  
  // المشاركة
  isPublic: boolean("is_public").default(false),
  isDefault: boolean("is_default").default(false),
  
  // النطاق
  departmentId: text("department_id").references(() => departments.id),
  branchId: text("branch_id").references(() => branches.id),
  
  // الحالة
  isActive: boolean("is_active").default(true),
  
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * عناصر اللوحة (Widgets)
 */
export const dashboardWidgets = pgTable("dashboard_widgets", {
  id: text("id").primaryKey(),
  dashboardId: text("dashboard_id").notNull().references(() => dashboards.id, { onDelete: "cascade" }),
  
  // المعلومات
  title: text("title").notNull(),
  widgetType: text("widget_type").notNull(), // chart, metric, table, list, map, gauge
  
  // الموضع
  positionX: integer("position_x").default(0),
  positionY: integer("position_y").default(0),
  width: integer("width").default(1),
  height: integer("height").default(1),
  
  // مصدر البيانات
  dataSource: text("data_source"), // endpoint or query name
  dataConfig: jsonb("data_config").$type<Record<string, any>>(),
  
  // إعدادات العرض
  chartType: text("chart_type"), // line, bar, pie, area, donut
  colors: jsonb("colors").$type<string[]>(),
  displayOptions: jsonb("display_options").$type<Record<string, any>>(),
  
  // الفلاتر
  filters: jsonb("filters").$type<{ field: string; operator: string; value: any }[]>(),
  
  // التحديث
  autoRefresh: boolean("auto_refresh").default(false),
  refreshInterval: integer("refresh_interval"),
  
  sortOrder: integer("sort_order").default(0),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * التقارير المجدولة
 */
export const scheduledReports = pgTable("scheduled_reports", {
  id: text("id").primaryKey(),
  
  // المعلومات
  name: text("name").notNull(),
  description: text("description"),
  
  // التقرير
  reportType: text("report_type").notNull(), // sales, inventory, financial, hr, custom
  reportConfig: jsonb("report_config").$type<Record<string, any>>(),
  
  // الجدولة
  frequency: text("frequency").default("daily"), // daily, weekly, monthly, quarterly
  scheduleTime: text("schedule_time"), // HH:MM
  dayOfWeek: integer("day_of_week"), // 0-6
  dayOfMonth: integer("day_of_month"), // 1-31
  
  // الإرسال
  deliveryMethod: text("delivery_method").default("email"), // email, download, dashboard
  recipients: jsonb("recipients").$type<string[]>(),
  
  // التنسيق
  format: text("format").default("pdf"), // pdf, excel, csv
  
  // الحالة
  isActive: boolean("is_active").default(true),
  lastRunAt: timestamp("last_run_at"),
  nextRunAt: timestamp("next_run_at"),
  
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * سجل التقارير
 */
export const reportLogs = pgTable("report_logs", {
  id: text("id").primaryKey(),
  scheduledReportId: text("scheduled_report_id").references(() => scheduledReports.id),
  
  // المعلومات
  reportName: text("report_name").notNull(),
  reportType: text("report_type"),
  
  // التنفيذ
  status: text("status").default("pending"), // pending, running, completed, failed
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  duration: integer("duration"), // milliseconds
  
  // النتيجة
  recordCount: integer("record_count"),
  fileUrl: text("file_url"),
  fileSize: integer("file_size"),
  
  // الأخطاء
  errorMessage: text("error_message"),
  
  // المستخدم
  generatedBy: text("generated_by").references(() => users.id),
  
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * مؤشرات الأداء المخصصة
 */
export const customMetrics = pgTable("custom_metrics", {
  id: text("id").primaryKey(),
  
  // المعلومات
  name: text("name").notNull(),
  code: text("code").unique(),
  description: text("description"),
  
  // الحساب
  formula: text("formula"), // SQL or expression
  dataSource: text("data_source"),
  aggregationType: text("aggregation_type").default("sum"), // sum, avg, count, min, max
  
  // الوحدة والتنسيق
  unit: text("unit"),
  format: text("format"), // number, currency, percentage
  decimals: integer("decimals").default(2),
  
  // الأهداف
  targetValue: decimal("target_value"),
  warningThreshold: decimal("warning_threshold"),
  criticalThreshold: decimal("critical_threshold"),
  
  // الاتجاه
  direction: text("direction").default("higher_is_better"), // higher_is_better, lower_is_better
  
  // التصنيف
  category: text("category"),
  
  // النطاق
  departmentId: text("department_id").references(() => departments.id),
  
  isActive: boolean("is_active").default(true),
  
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * قيم المؤشرات
 */
export const metricValues = pgTable("metric_values", {
  id: text("id").primaryKey(),
  metricId: text("metric_id").notNull().references(() => customMetrics.id, { onDelete: "cascade" }),
  
  // القيمة
  value: decimal("value").notNull(),
  previousValue: decimal("previous_value"),
  changePercentage: decimal("change_percentage"),
  
  // الفترة
  periodType: text("period_type").default("daily"), // daily, weekly, monthly
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  
  // النطاق
  branchId: text("branch_id").references(() => branches.id),
  departmentId: text("department_id").references(() => departments.id),
  
  calculatedAt: timestamp("calculated_at").defaultNow(),
});

/**
 * التنبيهات الذكية
 */
export const smartAlerts = pgTable("smart_alerts", {
  id: text("id").primaryKey(),
  
  // المعلومات
  name: text("name").notNull(),
  description: text("description"),
  
  // الشرط
  conditionType: text("condition_type").default("threshold"), // threshold, trend, anomaly, comparison
  metricId: text("metric_id").references(() => customMetrics.id),
  
  // الحدود
  operator: text("operator"), // gt, gte, lt, lte, eq, neq
  thresholdValue: decimal("threshold_value"),
  
  // للمقارنة
  comparisonPeriod: text("comparison_period"), // previous_day, previous_week, previous_month
  comparisonPercentage: decimal("comparison_percentage"),
  
  // الإجراء
  alertLevel: text("alert_level").default("warning"), // info, warning, critical
  notificationChannels: jsonb("notification_channels").$type<string[]>(), // email, sms, push, slack
  recipients: jsonb("recipients").$type<string[]>(),
  
  // الحالة
  isActive: boolean("is_active").default(true),
  lastTriggeredAt: timestamp("last_triggered_at"),
  triggerCount: integer("trigger_count").default(0),
  
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * Schema - نظام التقارير المتقدمة
 */
import { pgTable, varchar, text, timestamp, boolean, jsonb, integer } from "drizzle-orm/pg-core";
import { users } from "./users";

/**
 * قوالب التقارير
 */
export const reportTemplates = pgTable("report_templates", {
  id: varchar("id", { length: 36 }).primaryKey(),
  
  // الاسم
  name: varchar("name", { length: 255 }).notNull(),
  nameAr: varchar("name_ar", { length: 255 }),
  
  // الوصف
  description: text("description"),
  
  // الفئة
  category: varchar("category", { length: 50 }).notNull(),
  // inventory, purchases, sales, hr, finance, maintenance, general
  
  // نوع التقرير
  reportType: varchar("report_type", { length: 50 }).default("table"),
  // table, chart, summary, detailed
  
  // مصدر البيانات (اسم الجدول أو الـ view)
  dataSource: varchar("data_source", { length: 100 }).notNull(),
  
  // الأعمدة المتاحة
  availableColumns: jsonb("available_columns").$type<{
    field: string;
    label: string;
    type: string; // text, number, date, currency, boolean
    sortable?: boolean;
    filterable?: boolean;
    aggregatable?: boolean;
  }[]>(),
  
  // الأعمدة الافتراضية
  defaultColumns: jsonb("default_columns").$type<string[]>(),
  
  // الفلاتر المتاحة
  availableFilters: jsonb("available_filters").$type<{
    field: string;
    label: string;
    type: string; // text, select, date, dateRange, number, boolean
    options?: { value: string; label: string }[];
  }[]>(),
  
  // الفلاتر الافتراضية
  defaultFilters: jsonb("default_filters"),
  
  // الترتيب الافتراضي
  defaultSort: jsonb("default_sort").$type<{ field: string; direction: "asc" | "desc" }[]>(),
  
  // إعدادات التجميع
  groupByOptions: jsonb("group_by_options").$type<string[]>(),
  
  // إعدادات الرسم البياني
  chartConfig: jsonb("chart_config").$type<{
    type: string; // bar, line, pie, area
    xAxis?: string;
    yAxis?: string[];
    colors?: string[];
  }>(),
  
  // الأيقونة
  icon: varchar("icon", { length: 50 }),
  
  // هل نشط
  isActive: boolean("is_active").default(true),
  
  // هل نظام (لا يمكن حذفه)
  isSystem: boolean("is_system").default(false),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * التقارير المحفوظة
 */
export const savedReports = pgTable("saved_reports", {
  id: varchar("id", { length: 36 }).primaryKey(),
  
  // القالب الأساسي
  templateId: varchar("template_id", { length: 36 }).references(() => reportTemplates.id),
  
  // الاسم
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  
  // المالك
  userId: varchar("user_id", { length: 36 }).references(() => users.id),
  
  // هل عام (مرئي للجميع)
  isPublic: boolean("is_public").default(false),
  
  // التكوين
  configuration: jsonb("configuration").$type<{
    columns: string[];
    filters: Record<string, any>;
    sort: { field: string; direction: "asc" | "desc" }[];
    groupBy?: string;
    chartConfig?: any;
  }>(),
  
  // الجدولة
  schedule: jsonb("schedule").$type<{
    enabled: boolean;
    frequency: "daily" | "weekly" | "monthly";
    time: string; // HH:mm
    dayOfWeek?: number; // 0-6
    dayOfMonth?: number; // 1-31
    recipients: string[]; // email addresses
    format: "pdf" | "excel" | "csv";
  }>(),
  
  // آخر تشغيل
  lastRunAt: timestamp("last_run_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * سجل تشغيل التقارير
 */
export const reportExecutions = pgTable("report_executions", {
  id: varchar("id", { length: 36 }).primaryKey(),
  
  // التقرير
  reportId: varchar("report_id", { length: 36 }).references(() => savedReports.id),
  templateId: varchar("template_id", { length: 36 }).references(() => reportTemplates.id),
  
  // المستخدم
  userId: varchar("user_id", { length: 36 }).references(() => users.id),
  
  // الفلاتر المستخدمة
  filters: jsonb("filters"),
  
  // النتيجة
  rowCount: integer("row_count"),
  executionTimeMs: integer("execution_time_ms"),
  
  // الحالة
  status: varchar("status", { length: 20 }).default("completed"),
  // pending, running, completed, failed
  
  // رسالة الخطأ
  errorMessage: text("error_message"),
  
  // ملف التصدير
  exportFormat: varchar("export_format", { length: 10 }),
  exportUrl: text("export_url"),
  
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * لوحات المعلومات المخصصة
 */
export const customDashboards = pgTable("custom_dashboards", {
  id: varchar("id", { length: 36 }).primaryKey(),
  
  // الاسم
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  
  // المالك
  userId: varchar("user_id", { length: 36 }).references(() => users.id),
  
  // هل عام
  isPublic: boolean("is_public").default(false),
  
  // هل افتراضي للمستخدم
  isDefault: boolean("is_default").default(false),
  
  // تكوين الـ widgets
  layout: jsonb("layout").$type<{
    widgets: {
      id: string;
      type: string; // chart, table, stat, gauge
      title: string;
      reportId?: string;
      templateId?: string;
      config: any;
      position: { x: number; y: number; w: number; h: number };
    }[];
  }>(),
  
  // فترة التحديث التلقائي (بالثواني)
  refreshInterval: integer("refresh_interval"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * مؤشرات الأداء KPIs
 */
export const kpiDefinitions = pgTable("kpi_definitions", {
  id: varchar("id", { length: 36 }).primaryKey(),
  
  // الاسم
  name: varchar("name", { length: 255 }).notNull(),
  nameAr: varchar("name_ar", { length: 255 }),
  
  // الفئة
  category: varchar("category", { length: 50 }).notNull(),
  
  // الوصف
  description: text("description"),
  
  // الصيغة/الاستعلام
  formula: text("formula").notNull(),
  // مثال: SELECT COUNT(*) FROM purchases WHERE status = 'completed' AND date >= :startDate
  
  // نوع القيمة
  valueType: varchar("value_type", { length: 20 }).default("number"),
  // number, currency, percentage, count
  
  // الوحدة
  unit: varchar("unit", { length: 20 }),
  
  // القيمة المستهدفة
  targetValue: integer("target_value"),
  
  // حدود التنبيه
  warningThreshold: integer("warning_threshold"),
  criticalThreshold: integer("critical_threshold"),
  
  // اتجاه الأفضل (للألوان)
  betterDirection: varchar("better_direction", { length: 10 }).default("higher"),
  // higher, lower
  
  // الأيقونة
  icon: varchar("icon", { length: 50 }),
  
  // اللون
  color: varchar("color", { length: 20 }),
  
  // هل نشط
  isActive: boolean("is_active").default(true),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * Schema - نظام إدارة الجودة
 */
import { pgTable, text, timestamp, boolean, jsonb, integer, decimal } from "drizzle-orm/pg-core";
import { users } from "./users";
import { departments } from "./departments";
import { branches } from "./branches";
import { products } from "./products";

/**
 * معايير الجودة
 */
export const qualityStandards = pgTable("quality_standards", {
  id: text("id").primaryKey(),
  
  // المعلومات
  name: text("name").notNull(),
  code: text("code").unique(),
  description: text("description"),
  
  // التصنيف
  category: text("category").default("product"), // product, process, service, safety
  type: text("type").default("internal"), // internal, iso, regulatory
  
  // المتطلبات
  requirements: jsonb("requirements").$type<{ id: string; description: string; mandatory: boolean }[]>(),
  
  // القيم المقبولة
  minValue: decimal("min_value"),
  maxValue: decimal("max_value"),
  targetValue: decimal("target_value"),
  unit: text("unit"),
  
  // الحالة
  isActive: boolean("is_active").default(true),
  effectiveDate: timestamp("effective_date"),
  expiryDate: timestamp("expiry_date"),
  
  // النطاق
  departmentId: text("department_id").references(() => departments.id),
  
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * فحوصات الجودة
 */
export const qualityInspections = pgTable("quality_inspections", {
  id: text("id").primaryKey(),
  inspectionNumber: text("inspection_number").notNull().unique(),
  
  // نوع الفحص
  inspectionType: text("inspection_type").default("routine"), // routine, random, complaint, audit
  
  // المستهدف
  targetType: text("target_type").default("product"), // product, batch, process, supplier
  targetId: text("target_id"),
  productId: text("product_id").references(() => products.id),
  
  // المعيار
  standardId: text("standard_id").references(() => qualityStandards.id),
  
  // التاريخ
  scheduledAt: timestamp("scheduled_at"),
  inspectedAt: timestamp("inspected_at"),
  
  // النتيجة
  result: text("result"), // pass, fail, conditional
  score: integer("score"),
  
  // القياسات
  measurements: jsonb("measurements").$type<{ name: string; value: number; unit: string; pass: boolean }[]>(),
  
  // الملاحظات
  findings: text("findings"),
  recommendations: text("recommendations"),
  
  // الحالة
  status: text("status").default("scheduled"), // scheduled, in_progress, completed, cancelled
  
  // المفتش
  inspectorId: text("inspector_id").references(() => users.id),
  
  // المرفقات
  attachments: jsonb("attachments").$type<{ name: string; url: string }[]>(),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * عدم المطابقة
 */
export const nonConformances = pgTable("non_conformances", {
  id: text("id").primaryKey(),
  ncNumber: text("nc_number").notNull().unique(),
  
  // المعلومات
  title: text("title").notNull(),
  description: text("description"),
  
  // المصدر
  sourceType: text("source_type").default("inspection"), // inspection, complaint, audit, internal
  sourceId: text("source_id"),
  inspectionId: text("inspection_id").references(() => qualityInspections.id),
  
  // التصنيف
  category: text("category"), // defect, deviation, violation
  severity: text("severity").default("minor"), // minor, major, critical
  
  // المنتج/العملية المتأثرة
  productId: text("product_id").references(() => products.id),
  affectedQuantity: integer("affected_quantity"),
  
  // الحالة
  status: text("status").default("open"), // open, investigating, action_required, closed
  
  // التحقيق
  rootCause: text("root_cause"),
  containmentAction: text("containment_action"),
  correctiveAction: text("corrective_action"),
  preventiveAction: text("preventive_action"),
  
  // التواريخ
  detectedAt: timestamp("detected_at").defaultNow(),
  dueDate: timestamp("due_date"),
  closedAt: timestamp("closed_at"),
  
  // المسؤول
  reportedBy: text("reported_by").references(() => users.id),
  assignedTo: text("assigned_to").references(() => users.id),
  
  // التكلفة
  costImpact: decimal("cost_impact"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * الإجراءات التصحيحية
 */
export const correctiveActions = pgTable("corrective_actions", {
  id: text("id").primaryKey(),
  caNumber: text("ca_number").notNull().unique(),
  
  // الربط
  nonConformanceId: text("non_conformance_id").references(() => nonConformances.id),
  
  // المعلومات
  title: text("title").notNull(),
  description: text("description"),
  actionType: text("action_type").default("corrective"), // corrective, preventive, improvement
  
  // الخطوات
  steps: jsonb("steps").$type<{ step: string; completed: boolean; completedAt: string | null }[]>(),
  
  // الحالة
  status: text("status").default("planned"), // planned, in_progress, completed, verified
  priority: text("priority").default("medium"),
  
  // التواريخ
  startDate: timestamp("start_date"),
  targetDate: timestamp("target_date"),
  completedAt: timestamp("completed_at"),
  verifiedAt: timestamp("verified_at"),
  
  // التحقق
  verificationMethod: text("verification_method"),
  verificationResult: text("verification_result"),
  effectiveness: integer("effectiveness"), // 1-5
  
  // المسؤول
  assignedTo: text("assigned_to").references(() => users.id),
  verifiedBy: text("verified_by").references(() => users.id),
  
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * تدقيقات الجودة
 */
export const qualityAudits = pgTable("quality_audits", {
  id: text("id").primaryKey(),
  auditNumber: text("audit_number").notNull().unique(),
  
  // المعلومات
  title: text("title").notNull(),
  description: text("description"),
  auditType: text("audit_type").default("internal"), // internal, external, supplier, certification
  scope: text("scope"),
  
  // النطاق
  departmentId: text("department_id").references(() => departments.id),
  branchId: text("branch_id").references(() => branches.id),
  
  // التواريخ
  plannedDate: timestamp("planned_date"),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  
  // الفريق
  leadAuditorId: text("lead_auditor_id").references(() => users.id),
  auditTeam: jsonb("audit_team").$type<string[]>(),
  
  // النتائج
  status: text("status").default("planned"), // planned, in_progress, completed, cancelled
  overallRating: text("overall_rating"), // satisfactory, needs_improvement, unsatisfactory
  
  // النتائج التفصيلية
  findings: jsonb("findings").$type<{ area: string; finding: string; type: string; severity: string }[]>(),
  strengths: text("strengths"),
  weaknesses: text("weaknesses"),
  opportunities: text("opportunities"),
  
  // التقرير
  reportUrl: text("report_url"),
  
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

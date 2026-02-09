/**
 * Schema - نظام إدارة المخاطر
 */
import { pgTable, text, timestamp, boolean, jsonb, integer, decimal } from "drizzle-orm/pg-core";
import { users } from "./users";
import { departments } from "./departments";
import { branches } from "./branches";

/**
 * المخاطر
 */
export const risks = pgTable("risks", {
  id: text("id").primaryKey(),
  riskNumber: text("risk_number").notNull().unique(),
  
  // معلومات المخاطرة
  title: text("title").notNull(),
  description: text("description"),
  
  // التصنيف
  category: text("category").default("operational"), // operational, financial, strategic, compliance, technology, market
  subcategory: text("subcategory"),
  
  // التقييم
  probability: integer("probability"), // 1-5
  impact: integer("impact"), // 1-5
  riskScore: integer("risk_score"), // probability * impact
  riskLevel: text("risk_level"), // low, medium, high, critical
  
  // التقييم المتبقي
  residualProbability: integer("residual_probability"),
  residualImpact: integer("residual_impact"),
  residualScore: integer("residual_score"),
  
  // الحالة
  status: text("status").default("identified"), // identified, analyzed, treatment, monitoring, closed
  
  // النطاق
  branchId: text("branch_id").references(() => branches.id),
  departmentId: text("department_id").references(() => departments.id),
  
  // المسؤولية
  ownerId: text("owner_id").references(() => users.id),
  
  // التواريخ
  identifiedAt: timestamp("identified_at").defaultNow(),
  reviewDate: timestamp("review_date"),
  closedAt: timestamp("closed_at"),
  
  // ملاحظات
  notes: text("notes"),
  tags: jsonb("tags").$type<string[]>(),
  
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * خطط معالجة المخاطر
 */
export const riskTreatments = pgTable("risk_treatments", {
  id: text("id").primaryKey(),
  riskId: text("risk_id").notNull().references(() => risks.id, { onDelete: "cascade" }),
  
  // المعلومات
  title: text("title").notNull(),
  description: text("description"),
  
  // نوع المعالجة
  treatmentType: text("treatment_type").default("mitigate"), // avoid, mitigate, transfer, accept
  
  // التكلفة
  estimatedCost: decimal("estimated_cost"),
  actualCost: decimal("actual_cost"),
  
  // الحالة
  status: text("status").default("planned"), // planned, in_progress, completed, cancelled
  priority: text("priority").default("medium"),
  
  // التواريخ
  startDate: timestamp("start_date"),
  dueDate: timestamp("due_date"),
  completedAt: timestamp("completed_at"),
  
  // الفعالية
  effectiveness: integer("effectiveness"), // 1-5
  effectivenessNotes: text("effectiveness_notes"),
  
  // المسؤول
  assignedTo: text("assigned_to").references(() => users.id),
  
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * تقييمات المخاطر
 */
export const riskAssessments = pgTable("risk_assessments", {
  id: text("id").primaryKey(),
  riskId: text("risk_id").notNull().references(() => risks.id, { onDelete: "cascade" }),
  
  // التقييم
  probability: integer("probability").notNull(),
  impact: integer("impact").notNull(),
  score: integer("score").notNull(),
  level: text("level"),
  
  // الملاحظات
  justification: text("justification"),
  assumptions: text("assumptions"),
  
  // المُقيّم
  assessedBy: text("assessed_by").references(() => users.id),
  assessedAt: timestamp("assessed_at").defaultNow(),
});

/**
 * حوادث المخاطر
 */
export const riskIncidents = pgTable("risk_incidents", {
  id: text("id").primaryKey(),
  riskId: text("risk_id").references(() => risks.id),
  
  // المعلومات
  title: text("title").notNull(),
  description: text("description"),
  
  // التأثير
  severity: text("severity").default("medium"), // low, medium, high, critical
  financialImpact: decimal("financial_impact"),
  operationalImpact: text("operational_impact"),
  
  // التواريخ
  occurredAt: timestamp("occurred_at").notNull(),
  reportedAt: timestamp("reported_at").defaultNow(),
  resolvedAt: timestamp("resolved_at"),
  
  // الحالة
  status: text("status").default("reported"), // reported, investigating, resolved, closed
  
  // التحقيق
  rootCause: text("root_cause"),
  lessonsLearned: text("lessons_learned"),
  preventiveMeasures: text("preventive_measures"),
  
  // المسؤول
  reportedBy: text("reported_by").references(() => users.id),
  assignedTo: text("assigned_to").references(() => users.id),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * سجل المخاطر
 */
export const riskRegister = pgTable("risk_register", {
  id: text("id").primaryKey(),
  
  // المعلومات
  name: text("name").notNull(),
  description: text("description"),
  
  // الفترة
  year: integer("year"),
  quarter: integer("quarter"),
  
  // النطاق
  branchId: text("branch_id").references(() => branches.id),
  departmentId: text("department_id").references(() => departments.id),
  
  // الإحصائيات
  totalRisks: integer("total_risks").default(0),
  highRisks: integer("high_risks").default(0),
  mitigatedRisks: integer("mitigated_risks").default(0),
  
  // الحالة
  status: text("status").default("draft"), // draft, active, archived
  
  approvedBy: text("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * مصفوفة المخاطر
 */
export const riskMatrix = pgTable("risk_matrix", {
  id: text("id").primaryKey(),
  
  // الإحداثيات
  probabilityLevel: integer("probability_level").notNull(), // 1-5
  impactLevel: integer("impact_level").notNull(), // 1-5
  
  // المسميات
  probabilityLabel: text("probability_label"),
  impactLabel: text("impact_label"),
  
  // النتيجة
  riskLevel: text("risk_level").notNull(), // low, medium, high, critical
  color: text("color"),
  
  // الوصف
  description: text("description"),
  
  createdAt: timestamp("created_at").defaultNow(),
});

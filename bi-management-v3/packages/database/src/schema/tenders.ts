/**
 * Schema - نظام إدارة المناقصات والعطاءات
 */
import { pgTable, text, timestamp, boolean, jsonb, integer, decimal } from "drizzle-orm/pg-core";
import { users } from "./users";
import { departments } from "./hr";
import { branches } from "./branches";
import { suppliers } from "./suppliers";

/**
 * المناقصات
 */
export const tenders = pgTable("tenders", {
  id: text("id").primaryKey(),
  tenderNumber: text("tender_number").notNull().unique(),
  
  // المعلومات الأساسية
  title: text("title").notNull(),
  description: text("description"),
  
  // النوع
  tenderType: text("tender_type").default("open"), // open, limited, direct, framework
  category: text("category").default("goods"), // goods, services, works, consultancy
  
  // النطاق
  departmentId: text("department_id").references(() => departments.id),
  branchId: text("branch_id").references(() => branches.id),
  projectId: text("project_id"),
  
  // القيمة
  estimatedValue: decimal("estimated_value"),
  currency: text("currency").default("IQD"),
  budgetAllocated: boolean("budget_allocated").default(false),
  
  // التواريخ
  publishDate: timestamp("publish_date"),
  clarificationDeadline: timestamp("clarification_deadline"),
  submissionDeadline: timestamp("submission_deadline").notNull(),
  openingDate: timestamp("opening_date"),
  awardDate: timestamp("award_date"),
  contractStartDate: timestamp("contract_start_date"),
  contractEndDate: timestamp("contract_end_date"),
  
  // الحالة
  status: text("status").default("draft"), // draft, published, clarification, submission, evaluation, awarded, cancelled, completed
  
  // المتطلبات
  requirements: jsonb("requirements").$type<{
    item: string;
    description?: string;
    mandatory: boolean;
  }[]>(),
  
  // معايير التقييم
  evaluationCriteria: jsonb("evaluation_criteria").$type<{
    criterion: string;
    weight: number;
    description?: string;
  }[]>(),
  
  // المستندات
  documents: jsonb("documents").$type<{ name: string; url: string; type: string }[]>(),
  
  // رسوم المشاركة
  participationFee: decimal("participation_fee"),
  bidBondRequired: boolean("bid_bond_required").default(false),
  bidBondPercentage: decimal("bid_bond_percentage"),
  
  // الإعدادات
  allowPartialBids: boolean("allow_partial_bids").default(false),
  allowAlternativeBids: boolean("allow_alternative_bids").default(false),
  
  // الفائز
  winnerId: text("winner_id").references(() => suppliers.id),
  winnerBidId: text("winner_bid_id"),
  awardValue: decimal("award_value"),
  awardJustification: text("award_justification"),
  
  notes: text("notes"),
  
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * العروض/العطاءات
 */
export const bids = pgTable("bids", {
  id: text("id").primaryKey(),
  bidNumber: text("bid_number").notNull().unique(),
  tenderId: text("tender_id").notNull().references(() => tenders.id, { onDelete: "cascade" }),
  
  // المورد
  supplierId: text("supplier_id").notNull().references(() => suppliers.id),
  
  // القيمة
  totalValue: decimal("total_value").notNull(),
  currency: text("currency").default("IQD"),
  
  // التفاصيل
  technicalProposal: text("technical_proposal"),
  financialProposal: text("financial_proposal"),
  
  // البنود
  lineItems: jsonb("line_items").$type<{
    item: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    specifications?: string;
  }[]>(),
  
  // المستندات
  documents: jsonb("documents").$type<{ name: string; url: string; type: string }[]>(),
  
  // الضمان
  bidBondSubmitted: boolean("bid_bond_submitted").default(false),
  bidBondAmount: decimal("bid_bond_amount"),
  bidBondExpiry: timestamp("bid_bond_expiry"),
  
  // الحالة
  status: text("status").default("submitted"), // draft, submitted, under_evaluation, shortlisted, awarded, rejected, withdrawn
  
  // التقييم
  technicalScore: decimal("technical_score"),
  financialScore: decimal("financial_score"),
  totalScore: decimal("total_score"),
  evaluationNotes: text("evaluation_notes"),
  
  // الاستبعاد
  disqualified: boolean("disqualified").default(false),
  disqualificationReason: text("disqualification_reason"),
  
  submittedAt: timestamp("submitted_at").defaultNow(),
  evaluatedAt: timestamp("evaluated_at"),
  evaluatedBy: text("evaluated_by").references(() => users.id),
});

/**
 * لجنة المناقصات
 */
export const tenderCommittees = pgTable("tender_committees", {
  id: text("id").primaryKey(),
  tenderId: text("tender_id").notNull().references(() => tenders.id, { onDelete: "cascade" }),
  
  // العضو
  userId: text("user_id").notNull().references(() => users.id),
  
  // الدور
  role: text("role").default("member"), // chairman, member, secretary, observer
  
  // الصلاحيات
  canEvaluate: boolean("can_evaluate").default(true),
  canVote: boolean("can_vote").default(true),
  
  assignedAt: timestamp("assigned_at").defaultNow(),
  assignedBy: text("assigned_by").references(() => users.id),
});

/**
 * أسئلة التوضيح
 */
export const tenderClarifications = pgTable("tender_clarifications", {
  id: text("id").primaryKey(),
  tenderId: text("tender_id").notNull().references(() => tenders.id, { onDelete: "cascade" }),
  
  // السائل
  supplierId: text("supplier_id").references(() => suppliers.id),
  
  // السؤال
  question: text("question").notNull(),
  submittedAt: timestamp("submitted_at").defaultNow(),
  
  // الإجابة
  answer: text("answer"),
  answeredBy: text("answered_by").references(() => users.id),
  answeredAt: timestamp("answered_at"),
  
  // النشر
  isPublic: boolean("is_public").default(true),
  publishedAt: timestamp("published_at"),
});

/**
 * تقييم العروض
 */
export const bidEvaluations = pgTable("bid_evaluations", {
  id: text("id").primaryKey(),
  bidId: text("bid_id").notNull().references(() => bids.id, { onDelete: "cascade" }),
  
  // المقيم
  evaluatorId: text("evaluator_id").notNull().references(() => users.id),
  
  // التقييم
  criterionId: text("criterion_id"),
  criterionName: text("criterion_name"),
  score: decimal("score"),
  maxScore: decimal("max_score"),
  weight: decimal("weight"),
  weightedScore: decimal("weighted_score"),
  
  // التعليقات
  comments: text("comments"),
  
  evaluatedAt: timestamp("evaluated_at").defaultNow(),
});

/**
 * سجل المناقصات
 */
export const tenderHistory = pgTable("tender_history", {
  id: text("id").primaryKey(),
  tenderId: text("tender_id").notNull().references(() => tenders.id, { onDelete: "cascade" }),
  
  // الحدث
  action: text("action").notNull(),
  fromStatus: text("from_status"),
  toStatus: text("to_status"),
  
  // التفاصيل
  details: text("details"),
  
  performedBy: text("performed_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * قوالب المناقصات
 */
export const tenderTemplates = pgTable("tender_templates", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  
  category: text("category"),
  
  // المحتوى
  description: text("description"),
  requirements: jsonb("requirements"),
  evaluationCriteria: jsonb("evaluation_criteria"),
  terms: text("terms"),
  
  isActive: boolean("is_active").default(true),
  
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * Schema - نظام تقييم الأداء
 */
import { pgTable, text, timestamp, boolean, jsonb, integer, decimal } from "drizzle-orm/pg-core";
import { users } from "./users";
import { departments } from "./departments";

/**
 * دورات التقييم
 */
export const evaluationCycles = pgTable("evaluation_cycles", {
  id: text("id").primaryKey(),
  
  // المعلومات
  name: text("name").notNull(),
  description: text("description"),
  
  // النوع
  cycleType: text("cycle_type").default("annual"), // annual, semi_annual, quarterly, monthly
  year: integer("year"),
  quarter: integer("quarter"),
  
  // التواريخ
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  reviewDeadline: timestamp("review_deadline"),
  
  // الحالة
  status: text("status").default("draft"), // draft, active, completed, archived
  
  // الإعدادات
  selfReviewEnabled: boolean("self_review_enabled").default(true),
  managerReviewEnabled: boolean("manager_review_enabled").default(true),
  peerReviewEnabled: boolean("peer_review_enabled").default(false),
  goalsWeight: integer("goals_weight").default(50),
  competenciesWeight: integer("competencies_weight").default(50),
  
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * معايير التقييم
 */
export const evaluationCriteria = pgTable("evaluation_criteria", {
  id: text("id").primaryKey(),
  
  // المعلومات
  name: text("name").notNull(),
  nameEn: text("name_en"),
  description: text("description"),
  
  // التصنيف
  category: text("category").default("competency"), // competency, skill, behavior, goal
  
  // الوزن
  weight: integer("weight").default(1),
  maxScore: integer("max_score").default(5),
  
  // للأقسام المحددة
  departmentId: text("department_id").references(() => departments.id),
  
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
  
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * تقييمات الموظفين
 */
export const performanceReviews = pgTable("performance_reviews", {
  id: text("id").primaryKey(),
  cycleId: text("cycle_id").notNull().references(() => evaluationCycles.id),
  employeeId: text("employee_id").notNull().references(() => users.id),
  
  // المُقيّم
  reviewerId: text("reviewer_id").references(() => users.id),
  reviewType: text("review_type").default("manager"), // self, manager, peer, 360
  
  // الحالة
  status: text("status").default("pending"), // pending, in_progress, submitted, approved, rejected
  
  // الدرجات
  overallScore: decimal("overall_score"),
  goalsScore: decimal("goals_score"),
  competenciesScore: decimal("competencies_score"),
  
  // التقييم العام
  rating: text("rating"), // exceptional, exceeds, meets, below, unsatisfactory
  
  // الملاحظات
  strengths: text("strengths"),
  areasForImprovement: text("areas_for_improvement"),
  managerComments: text("manager_comments"),
  employeeComments: text("employee_comments"),
  
  // الأهداف
  nextPeriodGoals: jsonb("next_period_goals").$type<string[]>(),
  developmentPlan: text("development_plan"),
  
  // التوقيعات
  employeeSignedAt: timestamp("employee_signed_at"),
  reviewerSignedAt: timestamp("reviewer_signed_at"),
  
  submittedAt: timestamp("submitted_at"),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * درجات المعايير
 */
export const criteriaScores = pgTable("criteria_scores", {
  id: text("id").primaryKey(),
  reviewId: text("review_id").notNull().references(() => performanceReviews.id, { onDelete: "cascade" }),
  criteriaId: text("criteria_id").notNull().references(() => evaluationCriteria.id),
  
  // الدرجة
  score: integer("score"),
  weight: integer("weight"),
  weightedScore: decimal("weighted_score"),
  
  // الملاحظات
  comment: text("comment"),
  
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * أهداف الأداء
 */
export const performanceGoals = pgTable("performance_goals", {
  id: text("id").primaryKey(),
  cycleId: text("cycle_id").references(() => evaluationCycles.id),
  employeeId: text("employee_id").notNull().references(() => users.id),
  
  // الهدف
  title: text("title").notNull(),
  description: text("description"),
  
  // القياس
  measureType: text("measure_type").default("quantitative"), // quantitative, qualitative, milestone
  targetValue: decimal("target_value"),
  currentValue: decimal("current_value"),
  unit: text("unit"),
  
  // الوزن
  weight: integer("weight").default(1),
  
  // التواريخ
  startDate: timestamp("start_date"),
  dueDate: timestamp("due_date"),
  
  // الحالة
  status: text("status").default("not_started"), // not_started, in_progress, completed, cancelled
  progress: integer("progress").default(0),
  achievementPercentage: integer("achievement_percentage"),
  
  // التقييم
  finalScore: decimal("final_score"),
  managerRating: text("manager_rating"),
  
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * ملاحظات الأداء المستمرة
 */
export const performanceNotes = pgTable("performance_notes", {
  id: text("id").primaryKey(),
  employeeId: text("employee_id").notNull().references(() => users.id),
  
  // الملاحظة
  noteType: text("note_type").default("general"), // general, achievement, concern, feedback
  content: text("content").notNull(),
  
  // السرية
  isPrivate: boolean("is_private").default(false),
  visibleToEmployee: boolean("visible_to_employee").default(false),
  
  // المرتبط
  relatedGoalId: text("related_goal_id").references(() => performanceGoals.id),
  
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * مقياس التقييم
 */
export const ratingScales = pgTable("rating_scales", {
  id: text("id").primaryKey(),
  
  // المعلومات
  name: text("name").notNull(),
  value: integer("value").notNull(),
  
  // الوصف
  description: text("description"),
  descriptionEn: text("description_en"),
  
  // اللون
  color: text("color"),
  
  isDefault: boolean("is_default").default(false),
  sortOrder: integer("sort_order").default(0),
  
  createdAt: timestamp("created_at").defaultNow(),
});

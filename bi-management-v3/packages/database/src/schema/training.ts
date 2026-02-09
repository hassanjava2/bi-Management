/**
 * Schema - نظام التدريب والتطوير
 */
import { pgTable, text, timestamp, boolean, jsonb, integer, decimal } from "drizzle-orm/pg-core";
import { users } from "./users";
import { departments } from "./departments";

/**
 * الدورات التدريبية
 */
export const courses = pgTable("courses", {
  id: text("id").primaryKey(),
  
  // معلومات الدورة
  title: text("title").notNull(),
  titleEn: text("title_en"),
  description: text("description"),
  
  // التصنيف
  category: text("category").default("general"), // technical, soft_skills, compliance, management, sales
  level: text("level").default("beginner"), // beginner, intermediate, advanced
  
  // المدرب
  instructorId: text("instructor_id").references(() => users.id),
  instructorName: text("instructor_name"),
  instructorExternal: boolean("instructor_external").default(false),
  
  // المدة
  durationHours: integer("duration_hours"),
  durationDays: integer("duration_days"),
  
  // النوع
  courseType: text("course_type").default("classroom"), // classroom, online, hybrid, self_paced
  
  // التكلفة
  cost: decimal("cost"),
  currency: text("currency").default("IQD"),
  
  // المواد
  materials: jsonb("materials").$type<{ name: string; url: string; type: string }[]>(),
  syllabus: jsonb("syllabus").$type<{ title: string; description: string; duration: string }[]>(),
  
  // المتطلبات
  prerequisites: jsonb("prerequisites").$type<string[]>(),
  targetAudience: text("target_audience"),
  maxParticipants: integer("max_participants"),
  
  // الحالة
  status: text("status").default("draft"), // draft, published, archived
  isActive: boolean("is_active").default(true),
  
  // الصورة
  thumbnail: text("thumbnail"),
  
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * جلسات التدريب
 */
export const trainingSessions = pgTable("training_sessions", {
  id: text("id").primaryKey(),
  courseId: text("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  
  // المعلومات
  title: text("title"),
  description: text("description"),
  
  // التاريخ والوقت
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  
  // الموقع
  locationType: text("location_type").default("onsite"), // onsite, online, hybrid
  location: text("location"),
  onlineLink: text("online_link"),
  
  // السعة
  maxParticipants: integer("max_participants"),
  currentParticipants: integer("current_participants").default(0),
  
  // الحالة
  status: text("status").default("scheduled"), // scheduled, in_progress, completed, cancelled
  
  // المدرب
  instructorId: text("instructor_id").references(() => users.id),
  
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * تسجيل المتدربين
 */
export const trainingEnrollments = pgTable("training_enrollments", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull().references(() => trainingSessions.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id),
  
  // الحالة
  status: text("status").default("enrolled"), // enrolled, attended, completed, failed, cancelled
  
  // الحضور
  attendancePercentage: integer("attendance_percentage").default(0),
  attendedSessions: integer("attended_sessions").default(0),
  
  // التقييم
  score: integer("score"),
  grade: text("grade"),
  certificateIssued: boolean("certificate_issued").default(false),
  certificateUrl: text("certificate_url"),
  
  // الملاحظات
  feedback: text("feedback"),
  rating: integer("rating"), // 1-5
  
  enrolledAt: timestamp("enrolled_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

/**
 * الشهادات
 */
export const certificates = pgTable("certificates", {
  id: text("id").primaryKey(),
  
  // المعلومات
  certificateNumber: text("certificate_number").notNull().unique(),
  title: text("title").notNull(),
  
  // المتدرب
  userId: text("user_id").notNull().references(() => users.id),
  userName: text("user_name").notNull(),
  
  // الدورة
  courseId: text("course_id").references(() => courses.id),
  courseName: text("course_name"),
  
  // التواريخ
  issueDate: timestamp("issue_date").notNull(),
  expiryDate: timestamp("expiry_date"),
  
  // الحالة
  status: text("status").default("valid"), // valid, expired, revoked
  
  // التحقق
  verificationCode: text("verification_code"),
  certificateUrl: text("certificate_url"),
  
  // التوقيع
  signedBy: text("signed_by"),
  signatureUrl: text("signature_url"),
  
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * خطط التطوير الفردية
 */
export const developmentPlans = pgTable("development_plans", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  
  // المعلومات
  title: text("title").notNull(),
  description: text("description"),
  
  // الفترة
  startDate: timestamp("start_date"),
  targetDate: timestamp("target_date"),
  
  // الأهداف
  goals: jsonb("goals").$type<{ goal: string; status: string; progress: number }[]>(),
  
  // المهارات المستهدفة
  targetSkills: jsonb("target_skills").$type<string[]>(),
  
  // الحالة
  status: text("status").default("active"), // draft, active, completed, cancelled
  progress: integer("progress").default(0),
  
  // المشرف
  supervisorId: text("supervisor_id").references(() => users.id),
  
  // الملاحظات
  notes: text("notes"),
  
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * تقييم المهارات
 */
export const skillAssessments = pgTable("skill_assessments", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  
  // المهارة
  skillName: text("skill_name").notNull(),
  skillCategory: text("skill_category"),
  
  // التقييم
  currentLevel: integer("current_level"), // 1-5
  targetLevel: integer("target_level"),
  
  // التاريخ
  assessedAt: timestamp("assessed_at").defaultNow(),
  nextAssessmentAt: timestamp("next_assessment_at"),
  
  // المُقيّم
  assessedBy: text("assessed_by").references(() => users.id),
  assessmentType: text("assessment_type").default("self"), // self, manager, peer, 360
  
  notes: text("notes"),
});

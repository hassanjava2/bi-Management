/**
 * Schema - نظام إدارة الزيارات والوفود
 */
import { pgTable, text, timestamp, boolean, jsonb, integer } from "drizzle-orm/pg-core";
import { users } from "./users";
import { departments } from "./hr";
import { branches } from "./branches";
import { customers } from "./customers";

/**
 * الزيارات
 */
export const visits = pgTable("visits", {
  id: text("id").primaryKey(),
  visitNumber: text("visit_number").notNull().unique(),
  
  // المعلومات الأساسية
  title: text("title").notNull(),
  purpose: text("purpose").notNull(),
  
  // النوع
  visitType: text("visit_type").default("client"), // client, supplier, official, inspection, delegation, other
  
  // الزائر
  visitorType: text("visitor_type").default("external"), // internal, external
  visitorName: text("visitor_name").notNull(),
  visitorCompany: text("visitor_company"),
  visitorTitle: text("visitor_title"),
  visitorPhone: text("visitor_phone"),
  visitorEmail: text("visitor_email"),
  visitorIdNumber: text("visitor_id_number"),
  
  // عدد الزوار
  visitorsCount: integer("visitors_count").default(1),
  
  // المضيف
  hostId: text("host_id").references(() => users.id),
  departmentId: text("department_id").references(() => departments.id),
  branchId: text("branch_id").references(() => branches.id),
  
  // الوقت
  scheduledDate: timestamp("scheduled_date").notNull(),
  scheduledStartTime: text("scheduled_start_time"),
  scheduledEndTime: text("scheduled_end_time"),
  actualArrival: timestamp("actual_arrival"),
  actualDeparture: timestamp("actual_departure"),
  
  // المكان
  meetingRoom: text("meeting_room"),
  
  // الحالة
  status: text("status").default("scheduled"), // scheduled, checked_in, in_progress, completed, cancelled, no_show
  
  // الموافقة
  requiresApproval: boolean("requires_approval").default(false),
  approvedBy: text("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  
  // البطاقة
  badgeNumber: text("badge_number"),
  badgeIssued: boolean("badge_issued").default(false),
  
  // المرافق
  escortRequired: boolean("escort_required").default(false),
  escortId: text("escort_id").references(() => users.id),
  
  // المتطلبات
  equipmentNeeded: jsonb("equipment_needed").$type<string[]>(),
  refreshmentsNeeded: boolean("refreshments_needed").default(false),
  parkingNeeded: boolean("parking_needed").default(false),
  
  // الملاحظات
  notes: text("notes"),
  internalNotes: text("internal_notes"),
  
  // التقييم
  feedbackRating: integer("feedback_rating"),
  feedbackComment: text("feedback_comment"),
  
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * أعضاء الوفد
 */
export const visitMembers = pgTable("visit_members", {
  id: text("id").primaryKey(),
  visitId: text("visit_id").notNull().references(() => visits.id, { onDelete: "cascade" }),
  
  // المعلومات
  name: text("name").notNull(),
  title: text("title"),
  company: text("company"),
  phone: text("phone"),
  email: text("email"),
  idNumber: text("id_number"),
  
  // الحضور
  checkedIn: boolean("checked_in").default(false),
  checkedInAt: timestamp("checked_in_at"),
  checkedOut: boolean("checked_out").default(false),
  checkedOutAt: timestamp("checked_out_at"),
  
  // البطاقة
  badgeNumber: text("badge_number"),
  
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * سجل الدخول/الخروج
 */
export const visitLogs = pgTable("visit_logs", {
  id: text("id").primaryKey(),
  visitId: text("visit_id").notNull().references(() => visits.id, { onDelete: "cascade" }),
  memberId: text("member_id").references(() => visitMembers.id),
  
  // الحدث
  action: text("action").notNull(), // check_in, check_out, badge_issued, badge_returned, escort_assigned
  
  // التفاصيل
  details: text("details"),
  
  // المسجل
  recordedBy: text("recorded_by").references(() => users.id),
  
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * المواعيد المتكررة
 */
export const recurringVisits = pgTable("recurring_visits", {
  id: text("id").primaryKey(),
  
  // المعلومات الأساسية
  title: text("title").notNull(),
  purpose: text("purpose"),
  visitType: text("visit_type").default("client"),
  
  // الزائر
  visitorName: text("visitor_name").notNull(),
  visitorCompany: text("visitor_company"),
  
  // المضيف
  hostId: text("host_id").references(() => users.id),
  departmentId: text("department_id").references(() => departments.id),
  
  // التكرار
  frequency: text("frequency").default("weekly"), // daily, weekly, biweekly, monthly
  dayOfWeek: integer("day_of_week"), // 0-6
  dayOfMonth: integer("day_of_month"),
  startTime: text("start_time"),
  endTime: text("end_time"),
  
  // الفترة
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  
  isActive: boolean("is_active").default(true),
  
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * قائمة الزوار السوداء
 */
export const visitorBlacklist = pgTable("visitor_blacklist", {
  id: text("id").primaryKey(),
  
  // الزائر
  visitorName: text("visitor_name").notNull(),
  visitorIdNumber: text("visitor_id_number"),
  visitorCompany: text("visitor_company"),
  
  // السبب
  reason: text("reason").notNull(),
  
  // الفترة
  startDate: timestamp("start_date").defaultNow(),
  endDate: timestamp("end_date"),
  isPermanent: boolean("is_permanent").default(false),
  
  addedBy: text("added_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * إعدادات الاستقبال
 */
export const receptionSettings = pgTable("reception_settings", {
  id: text("id").primaryKey(),
  branchId: text("branch_id").references(() => branches.id),
  
  // ساعات العمل
  workingHoursStart: text("working_hours_start"),
  workingHoursEnd: text("working_hours_end"),
  
  // المتطلبات
  requireIdVerification: boolean("require_id_verification").default(true),
  requirePhoto: boolean("require_photo").default(false),
  requireNDA: boolean("require_nda").default(false),
  
  // الإشعارات
  notifyHostOnArrival: boolean("notify_host_on_arrival").default(true),
  notifySecurityOnArrival: boolean("notify_security_on_arrival").default(false),
  
  // البطاقات
  badgePrefix: text("badge_prefix").default("V"),
  
  updatedAt: timestamp("updated_at").defaultNow(),
});

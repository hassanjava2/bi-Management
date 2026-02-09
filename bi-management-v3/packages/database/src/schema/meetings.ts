/**
 * Schema - نظام إدارة الاجتماعات والقرارات
 */
import { pgTable, text, timestamp, boolean, jsonb, integer } from "drizzle-orm/pg-core";
import { users } from "./users";
import { departments } from "./departments";
import { branches } from "./branches";

/**
 * الاجتماعات
 */
export const meetings = pgTable("meetings", {
  id: text("id").primaryKey(),
  meetingNumber: text("meeting_number").notNull().unique(),
  
  // المعلومات الأساسية
  title: text("title").notNull(),
  description: text("description"),
  
  // النوع
  meetingType: text("meeting_type").default("regular"), // regular, board, emergency, workshop, training
  
  // التاريخ والوقت
  scheduledAt: timestamp("scheduled_at").notNull(),
  startedAt: timestamp("started_at"),
  endedAt: timestamp("ended_at"),
  duration: integer("duration"), // بالدقائق
  
  // المكان
  locationType: text("location_type").default("physical"), // physical, virtual, hybrid
  location: text("location"),
  meetingLink: text("meeting_link"),
  
  // المنظم
  organizerId: text("organizer_id").notNull().references(() => users.id),
  
  // النطاق
  departmentId: text("department_id").references(() => departments.id),
  branchId: text("branch_id").references(() => branches.id),
  
  // الحالة
  status: text("status").default("scheduled"), // draft, scheduled, in_progress, completed, cancelled, postponed
  
  // جدول الأعمال
  agenda: jsonb("agenda").$type<{
    order: number;
    topic: string;
    duration?: number;
    presenter?: string;
  }[]>(),
  
  // المحضر
  minutesText: text("minutes_text"),
  minutesApproved: boolean("minutes_approved").default(false),
  minutesApprovedBy: text("minutes_approved_by").references(() => users.id),
  minutesApprovedAt: timestamp("minutes_approved_at"),
  
  // المرفقات
  attachments: jsonb("attachments").$type<{ name: string; url: string }[]>(),
  
  // التكرار
  isRecurring: boolean("is_recurring").default(false),
  recurringPattern: text("recurring_pattern"), // daily, weekly, monthly
  
  // الملاحظات
  notes: text("notes"),
  
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * الحضور
 */
export const meetingAttendees = pgTable("meeting_attendees", {
  id: text("id").primaryKey(),
  meetingId: text("meeting_id").notNull().references(() => meetings.id, { onDelete: "cascade" }),
  
  // الحاضر
  userId: text("user_id").references(() => users.id),
  externalName: text("external_name"),
  externalEmail: text("external_email"),
  
  // الدور
  role: text("role").default("attendee"), // organizer, presenter, attendee, observer
  
  // الحالة
  inviteStatus: text("invite_status").default("pending"), // pending, accepted, declined, tentative
  attendanceStatus: text("attendance_status"), // present, absent, late, excused
  
  // وقت الحضور
  checkedInAt: timestamp("checked_in_at"),
  
  // ملاحظات
  notes: text("notes"),
  
  invitedAt: timestamp("invited_at").defaultNow(),
});

/**
 * القرارات
 */
export const meetingDecisions = pgTable("meeting_decisions", {
  id: text("id").primaryKey(),
  meetingId: text("meeting_id").notNull().references(() => meetings.id, { onDelete: "cascade" }),
  
  // القرار
  decisionNumber: text("decision_number").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  
  // التصنيف
  category: text("category").default("general"), // general, financial, operational, hr, strategic
  priority: text("priority").default("medium"), // low, medium, high, urgent
  
  // المسؤول
  assignedTo: text("assigned_to").references(() => users.id),
  
  // الموعد
  deadline: timestamp("deadline"),
  
  // الحالة
  status: text("status").default("pending"), // pending, in_progress, completed, cancelled, overdue
  
  // التنفيذ
  implementationNotes: text("implementation_notes"),
  completedAt: timestamp("completed_at"),
  
  // التصويت
  votesFor: integer("votes_for"),
  votesAgainst: integer("votes_against"),
  votesAbstain: integer("votes_abstain"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * متابعة القرارات
 */
export const decisionFollowUps = pgTable("decision_follow_ups", {
  id: text("id").primaryKey(),
  decisionId: text("decision_id").notNull().references(() => meetingDecisions.id, { onDelete: "cascade" }),
  
  // التحديث
  updateText: text("update_text").notNull(),
  progress: integer("progress"), // 0-100
  
  // المرفقات
  attachments: jsonb("attachments").$type<{ name: string; url: string }[]>(),
  
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * بنود المهام من الاجتماعات
 */
export const meetingActionItems = pgTable("meeting_action_items", {
  id: text("id").primaryKey(),
  meetingId: text("meeting_id").notNull().references(() => meetings.id, { onDelete: "cascade" }),
  
  // المهمة
  title: text("title").notNull(),
  description: text("description"),
  
  // المسؤول
  assignedTo: text("assigned_to").references(() => users.id),
  
  // الموعد
  dueDate: timestamp("due_date"),
  
  // الأولوية
  priority: text("priority").default("medium"),
  
  // الحالة
  status: text("status").default("pending"), // pending, in_progress, completed, cancelled
  
  completedAt: timestamp("completed_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * قاعات الاجتماعات
 */
export const meetingRooms = pgTable("meeting_rooms", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  
  // المكان
  branchId: text("branch_id").references(() => branches.id),
  floor: text("floor"),
  building: text("building"),
  
  // السعة
  capacity: integer("capacity"),
  
  // المرافق
  facilities: jsonb("facilities").$type<string[]>(), // projector, whiteboard, video_conference, etc
  
  // الحالة
  isActive: boolean("is_active").default(true),
  
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * حجز القاعات
 */
export const roomBookings = pgTable("room_bookings", {
  id: text("id").primaryKey(),
  roomId: text("room_id").notNull().references(() => meetingRooms.id),
  meetingId: text("meeting_id").references(() => meetings.id),
  
  // الوقت
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  
  // الحاجز
  bookedBy: text("booked_by").notNull().references(() => users.id),
  
  // الحالة
  status: text("status").default("confirmed"), // confirmed, cancelled
  
  // الغرض
  purpose: text("purpose"),
  
  createdAt: timestamp("created_at").defaultNow(),
});

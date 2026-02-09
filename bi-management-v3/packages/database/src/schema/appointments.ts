/**
 * Schema - نظام جدولة المواعيد
 */
import { pgTable, text, timestamp, boolean, jsonb, integer } from "drizzle-orm/pg-core";
import { users } from "./users";
import { customers } from "./customers";
import { branches } from "./branches";

/**
 * المواعيد
 */
export const appointments = pgTable("appointments", {
  id: text("id").primaryKey(),
  
  // المعلومات الأساسية
  title: text("title").notNull(),
  description: text("description"),
  
  // النوع
  appointmentType: text("appointment_type").default("meeting"), // meeting, call, demo, support, consultation, followup
  
  // التوقيت
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  allDay: boolean("all_day").default(false),
  
  // الحالة
  status: text("status").default("scheduled"), // scheduled, confirmed, in_progress, completed, cancelled, no_show
  
  // العميل
  customerId: text("customer_id").references(() => customers.id),
  customerName: text("customer_name"),
  customerPhone: text("customer_phone"),
  
  // الفرع / الموقع
  branchId: text("branch_id").references(() => branches.id),
  location: text("location"), // online, office, customer_site
  meetingUrl: text("meeting_url"), // للمقابلات عبر الإنترنت
  
  // المشاركون
  assignedTo: text("assigned_to").references(() => users.id),
  attendees: jsonb("attendees").$type<{ userId: string; name: string; status: string }[]>(),
  
  // التذكير
  reminderMinutes: integer("reminder_minutes").default(30),
  reminderSent: boolean("reminder_sent").default(false),
  
  // اللون
  color: text("color"),
  
  // الارتباط
  relatedType: text("related_type"), // invoice, quotation, lead, contract
  relatedId: text("related_id"),
  
  // التكرار
  isRecurring: boolean("is_recurring").default(false),
  recurringPattern: jsonb("recurring_pattern").$type<{
    frequency: string; // daily, weekly, monthly
    interval: number;
    endDate?: string;
    daysOfWeek?: number[];
  }>(),
  parentAppointmentId: text("parent_appointment_id"),
  
  // الملاحظات
  notes: text("notes"),
  internalNotes: text("internal_notes"),
  cancellationReason: text("cancellation_reason"),
  
  // المرفقات
  attachments: jsonb("attachments").$type<{ name: string; url: string }[]>(),
  
  // الموظف المنشئ
  createdBy: text("created_by").references(() => users.id),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * أوقات العمل المتاحة
 */
export const availabilitySlots = pgTable("availability_slots", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  branchId: text("branch_id").references(() => branches.id),
  
  // اليوم والوقت
  dayOfWeek: integer("day_of_week").notNull(), // 0 = Sunday, 6 = Saturday
  startTime: text("start_time").notNull(), // "09:00"
  endTime: text("end_time").notNull(), // "17:00"
  
  isActive: boolean("is_active").default(true),
  
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * الإجازات والعطلات
 */
export const blockedTimes = pgTable("blocked_times", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id),
  branchId: text("branch_id").references(() => branches.id),
  
  title: text("title").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  
  blockType: text("block_type").default("holiday"), // holiday, vacation, maintenance, other
  
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * أنواع المواعيد
 */
export const appointmentTypes = pgTable("appointment_types", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  nameAr: text("name_ar"),
  
  duration: integer("duration").default(30), // بالدقائق
  color: text("color"),
  
  requiresApproval: boolean("requires_approval").default(false),
  allowOnlineBooking: boolean("allow_online_booking").default(true),
  
  isActive: boolean("is_active").default(true),
  
  createdAt: timestamp("created_at").defaultNow(),
});

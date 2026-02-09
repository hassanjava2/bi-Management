/**
 * Schema - نظام إدارة الأحداث والفعاليات
 */
import { pgTable, text, timestamp, boolean, jsonb, integer, decimal } from "drizzle-orm/pg-core";
import { users } from "./users";
import { departments } from "./departments";
import { branches } from "./branches";
import { customers } from "./customers";

/**
 * الأحداث والفعاليات
 */
export const events = pgTable("events", {
  id: text("id").primaryKey(),
  eventNumber: text("event_number").notNull().unique(),
  
  // المعلومات الأساسية
  title: text("title").notNull(),
  description: text("description"),
  
  // النوع
  eventType: text("event_type").default("conference"), // conference, seminar, workshop, exhibition, celebration, training, meeting, webinar
  
  // التاريخ والوقت
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  allDay: boolean("all_day").default(false),
  timezone: text("timezone").default("Asia/Baghdad"),
  
  // المكان
  locationType: text("location_type").default("physical"), // physical, virtual, hybrid
  venue: text("venue"),
  address: text("address"),
  city: text("city"),
  virtualLink: text("virtual_link"),
  
  // السعة
  maxAttendees: integer("max_attendees"),
  currentAttendees: integer("current_attendees").default(0),
  
  // التسجيل
  registrationRequired: boolean("registration_required").default(true),
  registrationDeadline: timestamp("registration_deadline"),
  registrationFee: decimal("registration_fee"),
  currency: text("currency").default("IQD"),
  
  // الحالة
  status: text("status").default("draft"), // draft, published, registration_open, registration_closed, ongoing, completed, cancelled, postponed
  
  // المنظم
  organizerId: text("organizer_id").references(() => users.id),
  departmentId: text("department_id").references(() => departments.id),
  branchId: text("branch_id").references(() => branches.id),
  
  // الجمهور
  audience: text("audience").default("internal"), // internal, external, all
  isPublic: boolean("is_public").default(false),
  
  // الصور والمرفقات
  bannerImage: text("banner_image"),
  gallery: jsonb("gallery").$type<string[]>(),
  attachments: jsonb("attachments").$type<{ name: string; url: string }[]>(),
  
  // جدول الأعمال
  agenda: jsonb("agenda").$type<{
    time: string;
    title: string;
    speaker?: string;
    description?: string;
  }[]>(),
  
  // المتحدثون
  speakers: jsonb("speakers").$type<{
    name: string;
    title?: string;
    bio?: string;
    photo?: string;
  }[]>(),
  
  // الرعاة
  sponsors: jsonb("sponsors").$type<{
    name: string;
    level: string;
    logo?: string;
  }[]>(),
  
  // الميزانية
  estimatedBudget: decimal("estimated_budget"),
  actualCost: decimal("actual_cost"),
  
  // التقييم
  feedbackEnabled: boolean("feedback_enabled").default(true),
  
  tags: jsonb("tags").$type<string[]>(),
  notes: text("notes"),
  
  publishedAt: timestamp("published_at"),
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * تسجيلات الحضور
 */
export const eventRegistrations = pgTable("event_registrations", {
  id: text("id").primaryKey(),
  registrationNumber: text("registration_number").notNull().unique(),
  eventId: text("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  
  // المسجل
  registrationType: text("registration_type").default("employee"), // employee, customer, external
  userId: text("user_id").references(() => users.id),
  customerId: text("customer_id").references(() => customers.id),
  externalName: text("external_name"),
  externalEmail: text("external_email"),
  externalPhone: text("external_phone"),
  externalCompany: text("external_company"),
  
  // الحالة
  status: text("status").default("pending"), // pending, confirmed, waitlist, cancelled, attended, no_show
  
  // الدفع
  paymentStatus: text("payment_status").default("not_required"), // not_required, pending, paid, refunded
  paymentAmount: decimal("payment_amount"),
  paidAt: timestamp("paid_at"),
  paymentReference: text("payment_reference"),
  
  // الحضور
  checkedInAt: timestamp("checked_in_at"),
  checkedInBy: text("checked_in_by").references(() => users.id),
  
  // ملاحظات
  specialRequirements: text("special_requirements"),
  notes: text("notes"),
  
  // تذكرة
  ticketCode: text("ticket_code"),
  qrCode: text("qr_code"),
  
  registeredAt: timestamp("registered_at").defaultNow(),
  confirmedAt: timestamp("confirmed_at"),
});

/**
 * جلسات الفعالية
 */
export const eventSessions = pgTable("event_sessions", {
  id: text("id").primaryKey(),
  eventId: text("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  
  // المعلومات
  title: text("title").notNull(),
  description: text("description"),
  
  // الوقت
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  
  // المكان
  room: text("room"),
  
  // المتحدث
  speakerName: text("speaker_name"),
  speakerTitle: text("speaker_title"),
  
  // السعة
  maxAttendees: integer("max_attendees"),
  
  // النوع
  sessionType: text("session_type").default("presentation"), // presentation, workshop, panel, networking, break
  
  sortOrder: integer("sort_order").default(0),
  
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * تقييمات الفعالية
 */
export const eventFeedback = pgTable("event_feedback", {
  id: text("id").primaryKey(),
  eventId: text("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  registrationId: text("registration_id").references(() => eventRegistrations.id),
  
  // التقييمات
  overallRating: integer("overall_rating"), // 1-5
  contentRating: integer("content_rating"),
  organizationRating: integer("organization_rating"),
  venueRating: integer("venue_rating"),
  speakersRating: integer("speakers_rating"),
  
  // التعليقات
  likes: text("likes"),
  improvements: text("improvements"),
  comments: text("comments"),
  
  // التوصيات
  wouldRecommend: boolean("would_recommend"),
  interestedInFuture: boolean("interested_in_future"),
  
  isAnonymous: boolean("is_anonymous").default(false),
  
  submittedAt: timestamp("submitted_at").defaultNow(),
});

/**
 * مهام الفعالية
 */
export const eventTasks = pgTable("event_tasks", {
  id: text("id").primaryKey(),
  eventId: text("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  
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
 * مصاريف الفعالية
 */
export const eventExpenses = pgTable("event_expenses", {
  id: text("id").primaryKey(),
  eventId: text("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  
  // التفاصيل
  category: text("category").default("other"), // venue, catering, marketing, speakers, equipment, travel, other
  description: text("description").notNull(),
  
  // المبلغ
  amount: decimal("amount").notNull(),
  currency: text("currency").default("IQD"),
  
  // المورد
  vendor: text("vendor"),
  invoiceNumber: text("invoice_number"),
  
  // الحالة
  status: text("status").default("pending"), // pending, approved, paid
  
  // الموافقة
  approvedBy: text("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  
  paidAt: timestamp("paid_at"),
  
  receipt: text("receipt"),
  
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

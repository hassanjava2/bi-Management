/**
 * Schema - نظام سجل المكالمات
 */
import { pgTable, text, timestamp, boolean, jsonb, integer } from "drizzle-orm/pg-core";
import { users } from "./users";
import { customers } from "./customers";
import { leads } from "./leads";

/**
 * سجل المكالمات
 */
export const calls = pgTable("calls", {
  id: text("id").primaryKey(),
  
  // النوع والاتجاه
  callType: text("call_type").default("outbound"), // inbound, outbound
  callPurpose: text("call_purpose").default("general"), // general, sales, support, followup, collection, survey
  
  // المتصل
  callerName: text("caller_name"),
  callerPhone: text("caller_phone").notNull(),
  
  // المستقبل
  receiverName: text("receiver_name"),
  receiverPhone: text("receiver_phone"),
  
  // الربط
  customerId: text("customer_id").references(() => customers.id),
  leadId: text("lead_id").references(() => leads.id),
  
  // الموظف
  userId: text("user_id").references(() => users.id),
  
  // التوقيت
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  duration: integer("duration"), // بالثواني
  
  // الحالة
  status: text("status").default("completed"), // ringing, ongoing, completed, missed, busy, failed, voicemail
  
  // التسجيل
  recordingUrl: text("recording_url"),
  recordingDuration: integer("recording_duration"),
  
  // الملاحظات
  notes: text("notes"),
  summary: text("summary"),
  
  // التصنيف
  sentiment: text("sentiment"), // positive, neutral, negative
  outcome: text("outcome"), // successful, callback_needed, not_interested, wrong_number
  
  // المتابعة
  followUpRequired: boolean("follow_up_required").default(false),
  followUpDate: timestamp("follow_up_date"),
  followUpNotes: text("follow_up_notes"),
  
  // البيانات الإضافية
  metadata: jsonb("metadata").$type<Record<string, any>>(),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * قوالب المكالمات (Scripts)
 */
export const callScripts = pgTable("call_scripts", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  
  // النوع
  scriptType: text("script_type").default("sales"), // sales, support, collection, survey
  
  // المحتوى
  content: text("content").notNull(),
  sections: jsonb("sections").$type<{ title: string; content: string; order: number }[]>(),
  
  // الأسئلة الشائعة
  faqs: jsonb("faqs").$type<{ question: string; answer: string }[]>(),
  
  isActive: boolean("is_active").default(true),
  
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * حملات الاتصال
 */
export const callCampaigns = pgTable("call_campaigns", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  
  // النوع
  campaignType: text("campaign_type").default("outbound"), // outbound, survey, collection
  
  // القائمة
  targetList: jsonb("target_list").$type<{ phone: string; name?: string; customerId?: string }[]>(),
  totalContacts: integer("total_contacts").default(0),
  
  // التقدم
  completedCalls: integer("completed_calls").default(0),
  successfulCalls: integer("successful_calls").default(0),
  
  // الحالة
  status: text("status").default("draft"), // draft, active, paused, completed, cancelled
  
  // التوقيت
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  
  // السكريبت
  scriptId: text("script_id").references(() => callScripts.id),
  
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * إحصائيات المكالمات اليومية
 */
export const callStats = pgTable("call_stats", {
  id: text("id").primaryKey(),
  
  date: timestamp("date").notNull(),
  userId: text("user_id").references(() => users.id),
  
  // الإحصائيات
  totalCalls: integer("total_calls").default(0),
  inboundCalls: integer("inbound_calls").default(0),
  outboundCalls: integer("outbound_calls").default(0),
  missedCalls: integer("missed_calls").default(0),
  
  totalDuration: integer("total_duration").default(0), // بالثواني
  averageDuration: integer("average_duration").default(0),
  
  successfulCalls: integer("successful_calls").default(0),
  
  createdAt: timestamp("created_at").defaultNow(),
});

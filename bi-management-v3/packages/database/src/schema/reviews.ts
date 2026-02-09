/**
 * Schema - نظام التقييمات والمراجعات
 */
import { pgTable, text, timestamp, boolean, jsonb, integer } from "drizzle-orm/pg-core";
import { users } from "./users";
import { customers } from "./customers";
import { products } from "./products";

/**
 * التقييمات
 */
export const reviews = pgTable("reviews", {
  id: text("id").primaryKey(),
  
  // نوع التقييم
  entityType: text("entity_type").notNull(), // product, service, employee, branch
  entityId: text("entity_id").notNull(),
  entityName: text("entity_name"), // لعرض سريع
  
  // المقيّم
  customerId: text("customer_id").references(() => customers.id),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email"),
  isVerifiedPurchase: boolean("is_verified_purchase").default(false),
  
  // التقييم
  rating: integer("rating").notNull(), // 1-5
  title: text("title"),
  content: text("content"),
  
  // إيجابيات وسلبيات
  pros: jsonb("pros").$type<string[]>(),
  cons: jsonb("cons").$type<string[]>(),
  
  // الصور
  images: jsonb("images").$type<{ url: string; caption?: string }[]>(),
  
  // الحالة
  status: text("status").default("pending"), // pending, approved, rejected, flagged
  rejectionReason: text("rejection_reason"),
  
  // التفاعل
  helpfulCount: integer("helpful_count").default(0),
  notHelpfulCount: integer("not_helpful_count").default(0),
  
  // المشرف
  moderatedBy: text("moderated_by").references(() => users.id),
  moderatedAt: timestamp("moderated_at"),
  
  // الرد
  replyContent: text("reply_content"),
  repliedBy: text("replied_by").references(() => users.id),
  repliedAt: timestamp("replied_at"),
  
  // المصدر
  source: text("source").default("website"), // website, app, email, import
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * إحصائيات التقييم لكل كيان
 */
export const reviewStats = pgTable("review_stats", {
  id: text("id").primaryKey(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  
  // الإحصائيات
  totalReviews: integer("total_reviews").default(0),
  averageRating: text("average_rating").default("0"),
  
  // توزيع التقييمات
  rating5Count: integer("rating_5_count").default(0),
  rating4Count: integer("rating_4_count").default(0),
  rating3Count: integer("rating_3_count").default(0),
  rating2Count: integer("rating_2_count").default(0),
  rating1Count: integer("rating_1_count").default(0),
  
  // آخر تقييم
  lastReviewAt: timestamp("last_review_at"),
  
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * تفاعلات التقييم (مفيد/غير مفيد)
 */
export const reviewVotes = pgTable("review_votes", {
  id: text("id").primaryKey(),
  reviewId: text("review_id").notNull().references(() => reviews.id, { onDelete: "cascade" }),
  
  voterId: text("voter_id"), // user or customer ID
  voterType: text("voter_type"), // user, customer, anonymous
  voteType: text("vote_type").notNull(), // helpful, not_helpful
  
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * تقارير التقييمات المسيئة
 */
export const reviewReports = pgTable("review_reports", {
  id: text("id").primaryKey(),
  reviewId: text("review_id").notNull().references(() => reviews.id),
  
  reporterId: text("reporter_id"),
  reporterType: text("reporter_type"),
  reason: text("reason").notNull(), // spam, inappropriate, fake, offensive, other
  details: text("details"),
  
  status: text("status").default("pending"), // pending, reviewed, dismissed
  reviewedBy: text("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * طلبات التقييم
 */
export const reviewRequests = pgTable("review_requests", {
  id: text("id").primaryKey(),
  
  // العميل
  customerId: text("customer_id").references(() => customers.id),
  customerEmail: text("customer_email").notNull(),
  customerName: text("customer_name"),
  
  // الكيان
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  entityName: text("entity_name"),
  
  // الطلب
  orderId: text("order_id"),
  
  // الحالة
  sentAt: timestamp("sent_at"),
  openedAt: timestamp("opened_at"),
  completedAt: timestamp("completed_at"),
  reviewId: text("review_id").references(() => reviews.id),
  
  // التذكيرات
  reminderCount: integer("reminder_count").default(0),
  lastReminderAt: timestamp("last_reminder_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
});

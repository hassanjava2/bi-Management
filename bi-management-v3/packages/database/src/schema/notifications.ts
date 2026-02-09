import { pgTable, text, integer, timestamp, boolean, jsonb, varchar } from "drizzle-orm/pg-core";
import { users } from "./users";

/**
 * الإشعارات
 */
export const notifications = pgTable("notifications", {
  id: text("id").primaryKey(),
  recipientId: text("recipient_id").references(() => users.id),
  recipientType: text("recipient_type").default("user"),
  type: text("type").notNull(),
  // purchase_created, purchase_ready, return_pending, maintenance_completed, low_stock, etc.
  category: varchar("category", { length: 50 }).default("general"),
  // general, purchase, sales, inventory, hr, maintenance, system
  priority: text("priority").default("normal"), // low, normal, high, urgent
  title: text("title").notNull(),
  message: text("message"),
  entityType: text("entity_type"),
  entityId: text("entity_id"),
  actionUrl: text("action_url"),
  isRead: integer("is_read").default(0),
  readAt: timestamp("read_at"),
  channels: text("channels").default('["in_app"]'),
  sentChannels: text("sent_channels").default("{}"),
  metadata: jsonb("metadata"), // بيانات إضافية
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * إعدادات الإشعارات للمستخدم (تفضيلات حسب المستخدم)
 */
export const userNotificationPreferences = pgTable("user_notification_preferences", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  notificationType: text("notification_type").notNull(),
  inApp: integer("in_app").default(1),
  push: integer("push").default(1),
  email: integer("email").default(0),
  sms: integer("sms").default(0),
  whatsapp: integer("whatsapp").default(0),
  quietHoursStart: text("quiet_hours_start"),
  quietHoursEnd: text("quiet_hours_end"),
});

/**
 * قوالب الإشعارات
 */
export const notificationTemplates = pgTable("notification_templates", {
  id: varchar("id", { length: 36 }).primaryKey(),
  
  // نوع الإشعار
  type: varchar("type", { length: 100 }).notNull().unique(),
  
  // الفئة
  category: varchar("category", { length: 50 }).default("general"),
  
  // العنوان (يدعم المتغيرات)
  titleTemplate: text("title_template").notNull(),
  
  // الرسالة (يدعم المتغيرات)
  messageTemplate: text("message_template").notNull(),
  
  // رابط الإجراء (يدعم المتغيرات)
  actionUrlTemplate: text("action_url_template"),
  
  // الأولوية الافتراضية
  defaultPriority: varchar("default_priority", { length: 20 }).default("normal"),
  
  // القنوات الافتراضية
  defaultChannels: jsonb("default_channels").$type<string[]>().default(["in_app"]),
  
  // الأيقونة
  icon: varchar("icon", { length: 50 }),
  
  // اللون
  color: varchar("color", { length: 20 }),
  
  // هل نشط
  isActive: boolean("is_active").default(true),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * سجل إرسال الإشعارات الخارجية
 */
export const notificationDeliveryLog = pgTable("notification_delivery_log", {
  id: varchar("id", { length: 36 }).primaryKey(),
  
  // الإشعار
  notificationId: text("notification_id").references(() => notifications.id),
  
  // القناة
  channel: varchar("channel", { length: 50 }).notNull(), // email, sms, whatsapp, push
  
  // المستلم
  recipient: varchar("recipient", { length: 255 }), // email/phone
  
  // الحالة
  status: varchar("status", { length: 50 }).default("pending"),
  // pending, sent, delivered, failed, bounced
  
  // رد الخدمة
  providerResponse: jsonb("provider_response"),
  
  // محاولات الإرسال
  attempts: integer("attempts").default(0),
  lastAttemptAt: timestamp("last_attempt_at"),
  
  // رسالة الخطأ
  errorMessage: text("error_message"),
  
  sentAt: timestamp("sent_at"),
  deliveredAt: timestamp("delivered_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * اشتراكات الإشعارات (للمجموعات والأقسام)
 */
export const notificationSubscriptions = pgTable("notification_subscriptions", {
  id: varchar("id", { length: 36 }).primaryKey(),
  
  // المشترك
  subscriberType: varchar("subscriber_type", { length: 50 }).notNull(), // user, role, department
  subscriberId: varchar("subscriber_id", { length: 36 }).notNull(),
  
  // نوع الإشعار
  notificationType: varchar("notification_type", { length: 100 }).notNull(),
  
  // القنوات
  channels: jsonb("channels").$type<string[]>().default(["in_app"]),
  
  // فلترة إضافية
  filters: jsonb("filters"), // { branchId, warehouseId, etc. }
  
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * جدولة الإشعارات
 */
export const scheduledNotifications = pgTable("scheduled_notifications", {
  id: varchar("id", { length: 36 }).primaryKey(),
  
  // نوع الإشعار
  type: varchar("type", { length: 100 }).notNull(),
  
  // المستلمين
  recipientIds: jsonb("recipient_ids").$type<string[]>(),
  recipientQuery: text("recipient_query"), // SQL query للمستلمين الديناميكيين
  
  // البيانات
  data: jsonb("data"),
  
  // وقت الإرسال
  scheduledFor: timestamp("scheduled_for").notNull(),
  
  // التكرار
  recurrence: varchar("recurrence", { length: 50 }), // once, daily, weekly, monthly
  
  // الحالة
  status: varchar("status", { length: 50 }).default("pending"),
  // pending, sent, cancelled
  
  sentAt: timestamp("sent_at"),
  createdBy: varchar("created_by", { length: 36 }).references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

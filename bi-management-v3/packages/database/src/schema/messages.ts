/**
 * Schema - نظام المراسلات الداخلية
 */
import { pgTable, text, timestamp, boolean, jsonb, integer } from "drizzle-orm/pg-core";
import { users } from "./users";
import { departments } from "./departments";

/**
 * الرسائل
 */
export const messages = pgTable("messages", {
  id: text("id").primaryKey(),
  
  // نوع الرسالة
  messageType: text("message_type").default("direct"), // direct, group, broadcast, announcement
  
  // المحتوى
  subject: text("subject"),
  content: text("content").notNull(),
  contentType: text("content_type").default("text"), // text, html, markdown
  
  // المرسل
  senderId: text("sender_id").references(() => users.id),
  
  // الأولوية
  priority: text("priority").default("normal"), // low, normal, high, urgent
  
  // المرفقات
  attachments: jsonb("attachments").$type<{ name: string; url: string; type: string; size: number }[]>(),
  
  // الرد
  replyToId: text("reply_to_id"),
  threadId: text("thread_id"),
  
  // الحالة
  isDeleted: boolean("is_deleted").default(false),
  deletedAt: timestamp("deleted_at"),
  
  // للإعلانات
  isAnnouncement: boolean("is_announcement").default(false),
  isPinned: boolean("is_pinned").default(false),
  expiresAt: timestamp("expires_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * مستلمو الرسائل
 */
export const messageRecipients = pgTable("message_recipients", {
  id: text("id").primaryKey(),
  messageId: text("message_id").notNull().references(() => messages.id, { onDelete: "cascade" }),
  
  // المستلم
  recipientId: text("recipient_id").references(() => users.id),
  recipientType: text("recipient_type").default("user"), // user, department, all
  departmentId: text("department_id").references(() => departments.id),
  
  // الحالة
  isRead: boolean("is_read").default(false),
  readAt: timestamp("read_at"),
  
  // المجلد
  folder: text("folder").default("inbox"), // inbox, sent, archive, trash
  
  // النجمة
  isStarred: boolean("is_starred").default(false),
  
  // الحذف
  isDeleted: boolean("is_deleted").default(false),
  deletedAt: timestamp("deleted_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * المحادثات الجماعية
 */
export const conversations = pgTable("conversations", {
  id: text("id").primaryKey(),
  name: text("name"),
  description: text("description"),
  
  // النوع
  conversationType: text("conversation_type").default("private"), // private, group, channel
  
  // الإعدادات
  isActive: boolean("is_active").default(true),
  avatar: text("avatar"),
  
  // آخر رسالة
  lastMessageId: text("last_message_id"),
  lastMessageAt: timestamp("last_message_at"),
  
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * أعضاء المحادثة
 */
export const conversationMembers = pgTable("conversation_members", {
  id: text("id").primaryKey(),
  conversationId: text("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id),
  
  // الدور
  role: text("role").default("member"), // admin, moderator, member
  
  // الإعدادات
  isMuted: boolean("is_muted").default(false),
  mutedUntil: timestamp("muted_until"),
  
  // الإشعارات
  notificationLevel: text("notification_level").default("all"), // all, mentions, none
  
  // آخر قراءة
  lastReadAt: timestamp("last_read_at"),
  unreadCount: integer("unread_count").default(0),
  
  joinedAt: timestamp("joined_at").defaultNow(),
  leftAt: timestamp("left_at"),
});

/**
 * رسائل المحادثة
 */
export const conversationMessages = pgTable("conversation_messages", {
  id: text("id").primaryKey(),
  conversationId: text("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  senderId: text("sender_id").references(() => users.id),
  
  // المحتوى
  content: text("content").notNull(),
  contentType: text("content_type").default("text"),
  
  // المرفقات
  attachments: jsonb("attachments").$type<{ name: string; url: string; type: string }[]>(),
  
  // الرد
  replyToId: text("reply_to_id"),
  
  // التفاعلات
  reactions: jsonb("reactions").$type<{ emoji: string; userIds: string[] }[]>(),
  
  // الحالة
  isEdited: boolean("is_edited").default(false),
  editedAt: timestamp("edited_at"),
  isDeleted: boolean("is_deleted").default(false),
  deletedAt: timestamp("deleted_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * قوالب الرسائل
 */
export const messageTemplates = pgTable("message_templates", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  
  // المحتوى
  subject: text("subject"),
  content: text("content").notNull(),
  
  // المتغيرات
  variables: jsonb("variables").$type<string[]>(),
  
  // التصنيف
  category: text("category"),
  
  isActive: boolean("is_active").default(true),
  
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

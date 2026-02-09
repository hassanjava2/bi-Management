/**
 * Schema - نظام إدارة المعرفة
 */
import { pgTable, text, timestamp, boolean, jsonb, integer } from "drizzle-orm/pg-core";
import { users } from "./users";
import { departments } from "./departments";

/**
 * قاعدة المعرفة
 */
export const knowledgeArticles = pgTable("knowledge_articles", {
  id: text("id").primaryKey(),
  articleNumber: text("article_number").notNull().unique(),
  
  // المحتوى
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  summary: text("summary"),
  content: text("content").notNull(),
  
  // التصنيف
  categoryId: text("category_id").references(() => knowledgeCategories.id),
  tags: jsonb("tags").$type<string[]>(),
  
  // النوع
  articleType: text("article_type").default("article"), // article, faq, guide, policy, procedure
  
  // الجمهور
  audience: text("audience").default("internal"), // internal, external, all
  departmentId: text("department_id").references(() => departments.id),
  
  // الحالة
  status: text("status").default("draft"), // draft, review, published, archived
  
  // الإصدار
  version: integer("version").default(1),
  
  // SEO
  metaTitle: text("meta_title"),
  metaDescription: text("meta_description"),
  
  // المرفقات
  attachments: jsonb("attachments").$type<{ name: string; url: string }[]>(),
  
  // الإحصائيات
  viewCount: integer("view_count").default(0),
  helpfulCount: integer("helpful_count").default(0),
  notHelpfulCount: integer("not_helpful_count").default(0),
  
  // المؤلف
  authorId: text("author_id").notNull().references(() => users.id),
  reviewerId: text("reviewer_id").references(() => users.id),
  
  // التواريخ
  publishedAt: timestamp("published_at"),
  lastReviewedAt: timestamp("last_reviewed_at"),
  expiresAt: timestamp("expires_at"),
  
  isFeatured: boolean("is_featured").default(false),
  isPinned: boolean("is_pinned").default(false),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * فئات المعرفة
 */
export const knowledgeCategories = pgTable("knowledge_categories", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  nameEn: text("name_en"),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  
  parentId: text("parent_id"),
  
  icon: text("icon"),
  color: text("color"),
  
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * تعليقات المقالات
 */
export const articleComments = pgTable("article_comments", {
  id: text("id").primaryKey(),
  articleId: text("article_id").notNull().references(() => knowledgeArticles.id, { onDelete: "cascade" }),
  
  // المعلق
  userId: text("user_id").references(() => users.id),
  guestName: text("guest_name"),
  
  // التعليق
  content: text("content").notNull(),
  
  // الرد
  parentId: text("parent_id"),
  
  // الحالة
  status: text("status").default("pending"), // pending, approved, rejected
  
  isInternal: boolean("is_internal").default(false),
  
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * تاريخ إصدارات المقالات
 */
export const articleVersions = pgTable("article_versions", {
  id: text("id").primaryKey(),
  articleId: text("article_id").notNull().references(() => knowledgeArticles.id, { onDelete: "cascade" }),
  
  version: integer("version").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  
  // التغييرات
  changeNotes: text("change_notes"),
  
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * الأسئلة الشائعة
 */
export const faqs = pgTable("faqs", {
  id: text("id").primaryKey(),
  
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  
  categoryId: text("category_id").references(() => knowledgeCategories.id),
  
  // الجمهور
  audience: text("audience").default("all"),
  
  // الترتيب
  sortOrder: integer("sort_order").default(0),
  
  // الإحصائيات
  viewCount: integer("view_count").default(0),
  helpfulCount: integer("helpful_count").default(0),
  
  isPublished: boolean("is_published").default(true),
  
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * البحث والسجل
 */
export const knowledgeSearchLogs = pgTable("knowledge_search_logs", {
  id: text("id").primaryKey(),
  
  query: text("query").notNull(),
  resultsCount: integer("results_count").default(0),
  
  userId: text("user_id").references(() => users.id),
  
  // النتيجة
  clickedArticleId: text("clicked_article_id").references(() => knowledgeArticles.id),
  
  searchedAt: timestamp("searched_at").defaultNow(),
});

/**
 * المقالات المرتبطة
 */
export const relatedArticles = pgTable("related_articles", {
  id: text("id").primaryKey(),
  articleId: text("article_id").notNull().references(() => knowledgeArticles.id, { onDelete: "cascade" }),
  relatedArticleId: text("related_article_id").notNull().references(() => knowledgeArticles.id),
  
  // نوع العلاقة
  relationType: text("relation_type").default("related"), // related, prerequisite, see_also
  
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * مفضلات المستخدم
 */
export const userBookmarks = pgTable("user_bookmarks", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  articleId: text("article_id").notNull().references(() => knowledgeArticles.id, { onDelete: "cascade" }),
  
  notes: text("notes"),
  
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * تقييمات المقالات
 */
export const articleRatings = pgTable("article_ratings", {
  id: text("id").primaryKey(),
  articleId: text("article_id").notNull().references(() => knowledgeArticles.id, { onDelete: "cascade" }),
  userId: text("user_id").references(() => users.id),
  
  isHelpful: boolean("is_helpful").notNull(),
  feedback: text("feedback"),
  
  createdAt: timestamp("created_at").defaultNow(),
});

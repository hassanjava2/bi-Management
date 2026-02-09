/**
 * Schema - نظام تحليل المنافسين
 */
import { pgTable, text, timestamp, boolean, jsonb, integer } from "drizzle-orm/pg-core";
import { users } from "./users";

/**
 * المنافسين
 */
export const competitors = pgTable("competitors", {
  id: text("id").primaryKey(),
  
  // المعلومات الأساسية
  name: text("name").notNull(),
  nameEn: text("name_en"),
  logo: text("logo"),
  website: text("website"),
  
  // الوصف
  description: text("description"),
  
  // الفئة
  category: text("category").default("direct"), // direct, indirect, potential
  industry: text("industry"),
  
  // معلومات الاتصال
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  
  // الموقع
  country: text("country"),
  city: text("city"),
  regions: jsonb("regions").$type<string[]>(), // المناطق التي يعمل بها
  
  // الحجم والقوة
  companySize: text("company_size"), // small, medium, large, enterprise
  marketShare: text("market_share"), // نسبة مئوية تقديرية
  annualRevenue: text("annual_revenue"),
  employeeCount: integer("employee_count"),
  
  // نقاط القوة والضعف
  strengths: jsonb("strengths").$type<string[]>(),
  weaknesses: jsonb("weaknesses").$type<string[]>(),
  opportunities: jsonb("opportunities").$type<string[]>(),
  threats: jsonb("threats").$type<string[]>(),
  
  // التصنيف
  threatLevel: text("threat_level").default("medium"), // low, medium, high, critical
  rating: integer("rating").default(3), // 1-5
  
  // الحالة
  isActive: boolean("is_active").default(true),
  monitoringEnabled: boolean("monitoring_enabled").default(true),
  
  // الملاحظات
  notes: text("notes"),
  
  // روابط التواصل الاجتماعي
  socialLinks: jsonb("social_links").$type<{ platform: string; url: string }[]>(),
  
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * منتجات المنافسين
 */
export const competitorProducts = pgTable("competitor_products", {
  id: text("id").primaryKey(),
  competitorId: text("competitor_id").notNull().references(() => competitors.id, { onDelete: "cascade" }),
  
  name: text("name").notNull(),
  description: text("description"),
  category: text("category"),
  
  // التسعير
  price: text("price"),
  priceRange: text("price_range"), // low, medium, high, premium
  
  // المقارنة
  ourProductId: text("our_product_id"), // المنتج المقابل لدينا
  comparisonNotes: text("comparison_notes"),
  
  // المميزات
  features: jsonb("features").$type<string[]>(),
  
  // التقييم
  qualityRating: integer("quality_rating"), // 1-5
  
  imageUrl: text("image_url"),
  productUrl: text("product_url"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * أسعار المنافسين (تتبع تاريخي)
 */
export const competitorPrices = pgTable("competitor_prices", {
  id: text("id").primaryKey(),
  competitorId: text("competitor_id").notNull().references(() => competitors.id),
  productId: text("product_id").references(() => competitorProducts.id),
  
  productName: text("product_name").notNull(),
  price: text("price").notNull(),
  currency: text("currency").default("IQD"),
  
  // مصدر السعر
  source: text("source"), // website, store_visit, customer_report
  sourceUrl: text("source_url"),
  
  recordedAt: timestamp("recorded_at").defaultNow(),
  recordedBy: text("recorded_by").references(() => users.id),
});

/**
 * أنشطة المنافسين
 */
export const competitorActivities = pgTable("competitor_activities", {
  id: text("id").primaryKey(),
  competitorId: text("competitor_id").notNull().references(() => competitors.id, { onDelete: "cascade" }),
  
  // النوع
  activityType: text("activity_type").notNull(), // new_product, price_change, campaign, expansion, partnership, news
  
  // التفاصيل
  title: text("title").notNull(),
  description: text("description"),
  
  // الأهمية
  importance: text("importance").default("medium"), // low, medium, high
  
  // المصدر
  source: text("source"),
  sourceUrl: text("source_url"),
  
  // التاريخ
  activityDate: timestamp("activity_date"),
  
  // المرفقات
  attachments: jsonb("attachments").$type<{ name: string; url: string }[]>(),
  
  recordedBy: text("recorded_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * مقارنات المنتجات
 */
export const productComparisons = pgTable("product_comparisons", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  
  // المنتج الخاص بنا
  ourProductId: text("our_product_id"),
  ourProductName: text("our_product_name").notNull(),
  
  // المنتجات المقارنة
  comparedProducts: jsonb("compared_products").$type<{
    competitorId: string;
    competitorName: string;
    productId?: string;
    productName: string;
    price?: string;
  }[]>(),
  
  // معايير المقارنة
  criteria: jsonb("criteria").$type<{
    name: string;
    ourScore: number;
    competitorScores: { competitorId: string; score: number }[];
  }[]>(),
  
  // الخلاصة
  summary: text("summary"),
  recommendation: text("recommendation"),
  
  isPublic: boolean("is_public").default(false),
  
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * Schema - نظام الخصومات والعروض الترويجية
 */
import { pgTable, text, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { users } from "./users";
import { products } from "./products";
import { categories } from "./categories";
import { customers } from "./customers";
import { branches } from "./branches";

/**
 * العروض الترويجية
 */
export const promotions = pgTable("promotions", {
  id: text("id").primaryKey(),
  code: text("code").unique(), // كود العرض (اختياري للعروض التلقائية)
  name: text("name").notNull(),
  description: text("description"),
  
  // نوع العرض
  type: text("type").notNull(), // percentage, fixed_amount, buy_x_get_y, bundle, free_shipping
  
  // قيمة الخصم
  discountValue: text("discount_value"), // النسبة أو المبلغ
  maxDiscountAmount: text("max_discount_amount"), // حد أقصى للخصم
  
  // شروط Buy X Get Y
  buyQuantity: integer("buy_quantity"), // اشتري X
  getQuantity: integer("get_quantity"), // واحصل على Y
  getFreeProduct: text("get_free_product"), // منتج مجاني محدد
  
  // الحد الأدنى
  minimumOrderAmount: text("minimum_order_amount"), // الحد الأدنى للطلب
  minimumQuantity: integer("minimum_quantity"), // الحد الأدنى للكمية
  
  // التطبيق
  appliesTo: text("applies_to").default("all"), // all, specific_products, specific_categories, specific_customers
  applicableProducts: jsonb("applicable_products").$type<string[]>(),
  applicableCategories: jsonb("applicable_categories").$type<string[]>(),
  applicableCustomers: jsonb("applicable_customers").$type<string[]>(),
  excludedProducts: jsonb("excluded_products").$type<string[]>(),
  
  // الفروع
  applicableBranches: jsonb("applicable_branches").$type<string[]>(), // null = كل الفروع
  
  // الصلاحية
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  
  // الحدود
  usageLimit: integer("usage_limit"), // null = غير محدود
  usageLimitPerCustomer: integer("usage_limit_per_customer"),
  currentUsageCount: integer("current_usage_count").default(0),
  
  // الحالة
  status: text("status").default("draft"), // draft, active, paused, expired, cancelled
  isAutomatic: boolean("is_automatic").default(false), // يطبق تلقائياً
  
  // الأولوية (للعروض المتعددة)
  priority: integer("priority").default(0),
  stackable: boolean("stackable").default(false), // قابل للدمج مع عروض أخرى
  
  // التصميم
  bannerImage: text("banner_image"),
  badgeText: text("badge_text"), // نص الشارة (مثل: خصم 20%)
  badgeColor: text("badge_color"),
  
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * أكواد الخصم (الكوبونات)
 */
export const discountCodes = pgTable("discount_codes", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(),
  promotionId: text("promotion_id").references(() => promotions.id),
  
  // نوع الكود
  codeType: text("code_type").default("single"), // single, bulk
  
  // قيمة الخصم (إذا كان مستقل عن العرض)
  discountType: text("discount_type"), // percentage, fixed_amount
  discountValue: text("discount_value"),
  maxDiscountAmount: text("max_discount_amount"),
  minimumOrderAmount: text("minimum_order_amount"),
  
  // الصلاحية
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  
  // الاستخدام
  usageLimit: integer("usage_limit"),
  usageLimitPerCustomer: integer("usage_limit_per_customer").default(1),
  currentUsageCount: integer("current_usage_count").default(0),
  
  // الحالة
  isActive: boolean("is_active").default(true),
  
  // مخصص لعميل
  customerId: text("customer_id").references(() => customers.id),
  
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * سجل استخدام العروض
 */
export const promotionUsages = pgTable("promotion_usages", {
  id: text("id").primaryKey(),
  
  promotionId: text("promotion_id").references(() => promotions.id),
  discountCodeId: text("discount_code_id").references(() => discountCodes.id),
  
  // الطلب
  invoiceId: text("invoice_id"),
  invoiceNumber: text("invoice_number"),
  
  // العميل
  customerId: text("customer_id").references(() => customers.id),
  
  // تفاصيل الخصم
  discountAmount: text("discount_amount").notNull(),
  orderAmount: text("order_amount"),
  
  branchId: text("branch_id").references(() => branches.id),
  appliedBy: text("applied_by").references(() => users.id),
  
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * باقات المنتجات (Bundles)
 */
export const productBundles = pgTable("product_bundles", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  
  // السعر
  originalPrice: text("original_price"), // مجموع أسعار المنتجات
  bundlePrice: text("bundle_price").notNull(), // سعر الباقة
  savingsAmount: text("savings_amount"), // المبلغ الموفر
  savingsPercentage: text("savings_percentage"),
  
  // الصلاحية
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  
  // الحالة
  isActive: boolean("is_active").default(true),
  
  // المخزون
  stockLimit: integer("stock_limit"), // null = غير محدود
  soldCount: integer("sold_count").default(0),
  
  // التصميم
  image: text("image"),
  
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * عناصر الباقة
 */
export const bundleItems = pgTable("bundle_items", {
  id: text("id").primaryKey(),
  bundleId: text("bundle_id").notNull().references(() => productBundles.id, { onDelete: "cascade" }),
  productId: text("product_id").notNull().references(() => products.id),
  quantity: integer("quantity").notNull().default(1),
  sortOrder: integer("sort_order").default(0),
});

/**
 * أسعار خاصة للعملاء
 */
export const customerPricing = pgTable("customer_pricing", {
  id: text("id").primaryKey(),
  
  // العميل أو مجموعة العملاء
  customerId: text("customer_id").references(() => customers.id),
  customerGroup: text("customer_group"), // vip, wholesale, retail
  
  // المنتج أو الفئة
  productId: text("product_id").references(() => products.id),
  categoryId: text("category_id").references(() => categories.id),
  
  // السعر الخاص
  priceType: text("price_type").notNull(), // fixed, percentage_off
  priceValue: text("price_value").notNull(),
  
  // الصلاحية
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  
  isActive: boolean("is_active").default(true),
  
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

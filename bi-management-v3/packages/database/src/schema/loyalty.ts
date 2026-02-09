/**
 * Schema - نظام برامج الولاء
 */
import { pgTable, text, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { users } from "./users";
import { customers } from "./customers";
import { products } from "./products";
import { categories } from "./categories";

/**
 * برامج الولاء
 */
export const loyaltyPrograms = pgTable("loyalty_programs", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  
  // حالة البرنامج
  isActive: boolean("is_active").default(true),
  isDefault: boolean("is_default").default(false),
  
  // قواعد كسب النقاط
  pointsPerAmount: integer("points_per_amount").default(1), // نقطة لكل X من العملة
  amountPerPoint: text("amount_per_point").default("1000"), // كل 1000 IQD = نقطة
  
  // مضاعفات النقاط
  multiplierCategories: jsonb("multiplier_categories").$type<{ categoryId: string; multiplier: number }[]>(),
  multiplierProducts: jsonb("multiplier_products").$type<{ productId: string; multiplier: number }[]>(),
  
  // قواعد الاسترداد
  pointValue: text("point_value").default("100"), // قيمة النقطة الواحدة عند الاسترداد (100 IQD)
  minRedeemPoints: integer("min_redeem_points").default(100), // الحد الأدنى للاسترداد
  maxRedeemPercentage: integer("max_redeem_percentage").default(50), // أقصى نسبة من الفاتورة
  
  // انتهاء الصلاحية
  pointsExpiryMonths: integer("points_expiry_months"), // null = لا تنتهي
  
  // الصلاحية
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * مستويات العضوية
 */
export const loyaltyTiers = pgTable("loyalty_tiers", {
  id: text("id").primaryKey(),
  programId: text("program_id").notNull().references(() => loyaltyPrograms.id),
  
  name: text("name").notNull(), // برونزي، فضي، ذهبي، بلاتيني
  description: text("description"),
  
  // شروط الوصول
  minPoints: integer("min_points").notNull(), // الحد الأدنى من النقاط
  minSpend: text("min_spend"), // الحد الأدنى من الإنفاق
  
  // المزايا
  pointsMultiplier: text("points_multiplier").default("1"), // مضاعف النقاط (1.5 = 50% إضافي)
  discountPercentage: text("discount_percentage"), // خصم دائم
  freeShipping: boolean("free_shipping").default(false),
  prioritySupport: boolean("priority_support").default(false),
  
  // مزايا إضافية
  benefits: jsonb("benefits").$type<string[]>(),
  
  // التصميم
  color: text("color"),
  icon: text("icon"),
  badgeImage: text("badge_image"),
  
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * أرصدة نقاط العملاء
 */
export const customerLoyaltyAccounts = pgTable("customer_loyalty_accounts", {
  id: text("id").primaryKey(),
  customerId: text("customer_id").notNull().references(() => customers.id),
  programId: text("program_id").notNull().references(() => loyaltyPrograms.id),
  
  // الرصيد
  currentPoints: integer("current_points").default(0),
  totalEarnedPoints: integer("total_earned_points").default(0),
  totalRedeemedPoints: integer("total_redeemed_points").default(0),
  totalExpiredPoints: integer("total_expired_points").default(0),
  
  // المستوى
  tierId: text("tier_id").references(() => loyaltyTiers.id),
  tierAchievedAt: timestamp("tier_achieved_at"),
  
  // إجمالي الإنفاق
  totalSpend: text("total_spend").default("0"),
  
  // آخر نشاط
  lastEarnedAt: timestamp("last_earned_at"),
  lastRedeemedAt: timestamp("last_redeemed_at"),
  
  // الحالة
  isActive: boolean("is_active").default(true),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * سجل حركة النقاط
 */
export const loyaltyTransactions = pgTable("loyalty_transactions", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull().references(() => customerLoyaltyAccounts.id),
  customerId: text("customer_id").notNull().references(() => customers.id),
  
  // نوع العملية
  transactionType: text("transaction_type").notNull(), // earn, redeem, expire, adjust, bonus
  
  // النقاط
  points: integer("points").notNull(), // موجب للكسب، سالب للاسترداد
  balanceAfter: integer("balance_after").notNull(),
  
  // المصدر
  sourceType: text("source_type"), // invoice, manual, promotion, referral, birthday, tier_bonus
  sourceId: text("source_id"), // رقم الفاتورة أو العرض
  
  // التفاصيل
  description: text("description"),
  amountSpent: text("amount_spent"), // المبلغ المصروف (للكسب)
  amountRedeemed: text("amount_redeemed"), // قيمة الاسترداد
  
  // انتهاء الصلاحية
  expiresAt: timestamp("expires_at"),
  
  // الموظف
  processedBy: text("processed_by").references(() => users.id),
  
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * المكافآت القابلة للاسترداد
 */
export const loyaltyRewards = pgTable("loyalty_rewards", {
  id: text("id").primaryKey(),
  programId: text("program_id").notNull().references(() => loyaltyPrograms.id),
  
  name: text("name").notNull(),
  description: text("description"),
  
  // نوع المكافأة
  rewardType: text("reward_type").notNull(), // discount, product, voucher, service
  
  // تكلفة النقاط
  pointsCost: integer("points_cost").notNull(),
  
  // قيمة المكافأة
  discountValue: text("discount_value"), // للخصم
  discountType: text("discount_type"), // percentage, fixed
  productId: text("product_id").references(() => products.id), // للمنتج المجاني
  voucherValue: text("voucher_value"), // لقسيمة الشراء
  
  // الحدود
  stockLimit: integer("stock_limit"), // الكمية المتاحة
  redeemedCount: integer("redeemed_count").default(0),
  perCustomerLimit: integer("per_customer_limit"), // حد لكل عميل
  
  // الشروط
  minTierId: text("min_tier_id").references(() => loyaltyTiers.id), // مستوى أدنى مطلوب
  minOrderAmount: text("min_order_amount"), // حد أدنى للطلب
  
  // الصلاحية
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  isActive: boolean("is_active").default(true),
  
  // التصميم
  image: text("image"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * سجل استرداد المكافآت
 */
export const rewardRedemptions = pgTable("reward_redemptions", {
  id: text("id").primaryKey(),
  rewardId: text("reward_id").notNull().references(() => loyaltyRewards.id),
  customerId: text("customer_id").notNull().references(() => customers.id),
  accountId: text("account_id").notNull().references(() => customerLoyaltyAccounts.id),
  
  // النقاط المستخدمة
  pointsUsed: integer("points_used").notNull(),
  
  // الحالة
  status: text("status").default("pending"), // pending, completed, cancelled, expired
  
  // الاستخدام
  usedAt: timestamp("used_at"),
  invoiceId: text("invoice_id"),
  
  // الكود (للقسائم)
  redemptionCode: text("redemption_code"),
  expiresAt: timestamp("expires_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * قواعد النقاط الإضافية
 */
export const loyaltyBonusRules = pgTable("loyalty_bonus_rules", {
  id: text("id").primaryKey(),
  programId: text("program_id").notNull().references(() => loyaltyPrograms.id),
  
  name: text("name").notNull(),
  description: text("description"),
  
  // نوع القاعدة
  ruleType: text("rule_type").notNull(), // birthday, signup, referral, first_purchase, milestone
  
  // المكافأة
  bonusPoints: integer("bonus_points").notNull(),
  bonusMultiplier: text("bonus_multiplier"), // بديل عن النقاط الثابتة
  
  // الشروط
  conditions: jsonb("conditions").$type<{
    minSpend?: string;
    specificProducts?: string[];
    specificCategories?: string[];
    dayOfWeek?: number[];
    timeRange?: { start: string; end: string };
  }>(),
  
  // الصلاحية
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  isActive: boolean("is_active").default(true),
  
  // التكرار
  isOneTime: boolean("is_one_time").default(true), // مرة واحدة فقط
  
  createdAt: timestamp("created_at").defaultNow(),
});

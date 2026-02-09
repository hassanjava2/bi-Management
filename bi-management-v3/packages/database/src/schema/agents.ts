/**
 * Schema - نظام الوكلاء والموزعين
 */
import { pgTable, text, timestamp, boolean, jsonb, integer } from "drizzle-orm/pg-core";
import { users } from "./users";
import { branches } from "./branches";

/**
 * الوكلاء / الموزعين
 */
export const agents = pgTable("agents", {
  id: text("id").primaryKey(),
  agentNumber: text("agent_number").notNull().unique(), // AGT-001
  
  // المعلومات الأساسية
  name: text("name").notNull(),
  nameEn: text("name_en"),
  
  // النوع
  agentType: text("agent_type").default("distributor"), // distributor, reseller, franchise, representative
  
  // معلومات الاتصال
  contactPerson: text("contact_person"),
  phone: text("phone"),
  mobile: text("mobile"),
  email: text("email"),
  website: text("website"),
  
  // العنوان
  country: text("country"),
  city: text("city"),
  address: text("address"),
  
  // المنطقة
  region: text("region"), // المنطقة المخصصة
  territories: jsonb("territories").$type<string[]>(), // المناطق المغطاة
  
  // الشروط التجارية
  commissionRate: text("commission_rate"), // نسبة العمولة
  discountRate: text("discount_rate"), // نسبة الخصم
  creditLimit: text("credit_limit"), // حد الائتمان
  paymentTerms: text("payment_terms"), // شروط الدفع
  
  // الفئات المسموح بها
  allowedCategories: jsonb("allowed_categories").$type<string[]>(),
  allowedBrands: jsonb("allowed_brands").$type<string[]>(),
  
  // الأهداف
  monthlyTarget: text("monthly_target"),
  quarterlyTarget: text("quarterly_target"),
  annualTarget: text("annual_target"),
  
  // الحالة
  status: text("status").default("active"), // active, suspended, terminated
  contractStartDate: timestamp("contract_start_date"),
  contractEndDate: timestamp("contract_end_date"),
  
  // التصنيف
  tier: text("tier").default("bronze"), // bronze, silver, gold, platinum
  rating: integer("rating").default(3), // 1-5
  
  // المستندات
  documents: jsonb("documents").$type<{ name: string; url: string; type: string }[]>(),
  
  // الملاحظات
  notes: text("notes"),
  
  // الربط
  linkedBranchId: text("linked_branch_id").references(() => branches.id),
  accountManagerId: text("account_manager_id").references(() => users.id),
  
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * عقود الوكلاء
 */
export const agentContracts = pgTable("agent_contracts", {
  id: text("id").primaryKey(),
  agentId: text("agent_id").notNull().references(() => agents.id),
  contractNumber: text("contract_number").notNull(),
  
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  
  // الشروط
  terms: jsonb("terms").$type<{ key: string; value: string }[]>(),
  commissionStructure: jsonb("commission_structure").$type<{ category: string; rate: string }[]>(),
  
  status: text("status").default("active"), // draft, active, expired, terminated
  
  documentUrl: text("document_url"),
  
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * مبيعات الوكلاء
 */
export const agentSales = pgTable("agent_sales", {
  id: text("id").primaryKey(),
  agentId: text("agent_id").notNull().references(() => agents.id),
  
  // الفترة
  period: text("period").notNull(), // 2026-01
  
  // المبالغ
  totalSales: text("total_sales").default("0"),
  totalCommission: text("total_commission").default("0"),
  totalOrders: integer("total_orders").default(0),
  
  // التفاصيل
  salesBreakdown: jsonb("sales_breakdown").$type<{ category: string; amount: string }[]>(),
  
  // الحالة
  commissionPaid: boolean("commission_paid").default(false),
  paidAt: timestamp("paid_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * طلبات الوكلاء
 */
export const agentOrders = pgTable("agent_orders", {
  id: text("id").primaryKey(),
  orderNumber: text("order_number").notNull().unique(),
  agentId: text("agent_id").notNull().references(() => agents.id),
  
  // التفاصيل
  items: jsonb("items").$type<{
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: string;
    discount: string;
    total: string;
  }[]>(),
  
  // المبالغ
  subtotal: text("subtotal").notNull(),
  discountAmount: text("discount_amount").default("0"),
  totalAmount: text("total_amount").notNull(),
  commissionAmount: text("commission_amount").default("0"),
  
  // الحالة
  status: text("status").default("pending"), // pending, confirmed, shipped, delivered, cancelled
  
  // الشحن
  shippingAddress: text("shipping_address"),
  trackingNumber: text("tracking_number"),
  
  notes: text("notes"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * نشاط الوكلاء
 */
export const agentActivities = pgTable("agent_activities", {
  id: text("id").primaryKey(),
  agentId: text("agent_id").notNull().references(() => agents.id),
  
  activityType: text("activity_type").notNull(), // order, payment, visit, meeting, complaint, tier_change
  description: text("description"),
  
  metadata: jsonb("metadata").$type<Record<string, any>>(),
  performedBy: text("performed_by").references(() => users.id),
  
  createdAt: timestamp("created_at").defaultNow(),
});

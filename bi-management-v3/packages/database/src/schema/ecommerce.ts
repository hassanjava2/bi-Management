import { pgTable, text, integer, real, timestamp, jsonb } from "drizzle-orm/pg-core";
import { users } from "./users";
import { products } from "./products";
import { customers } from "./customers";

// Online Store Settings - إعدادات المتجر
export const storeSettings = pgTable("store_settings", {
  id: text("id").primaryKey(),
  storeName: text("store_name").notNull(),
  storeNameAr: text("store_name_ar"),
  logo: text("logo"),
  currency: text("currency").default("IQD"),
  taxRate: real("tax_rate").default(0),
  shippingEnabled: integer("shipping_enabled").default(1),
  defaultShippingCost: real("default_shipping_cost").default(0),
  minOrderAmount: real("min_order_amount"),
  maxOrderAmount: real("max_order_amount"),
  isActive: integer("is_active").default(1),
  maintenanceMode: integer("maintenance_mode").default(0),
  // Contact
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  // Social
  facebook: text("facebook"),
  instagram: text("instagram"),
  whatsapp: text("whatsapp"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Shopping Carts - سلات التسوق
export const shoppingCarts = pgTable("shopping_carts", {
  id: text("id").primaryKey(),
  customerId: text("customer_id").references(() => customers.id),
  sessionId: text("session_id"), // For guest users
  status: text("status").default("active"), // active, abandoned, converted
  itemsCount: integer("items_count").default(0),
  subtotal: real("subtotal").default(0),
  lastActivityAt: timestamp("last_activity_at").defaultNow(),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Cart Items - عناصر السلة
export const cartItems = pgTable("cart_items", {
  id: text("id").primaryKey(),
  cartId: text("cart_id").references(() => shoppingCarts.id),
  productId: text("product_id").references(() => products.id),
  quantity: integer("quantity").default(1),
  unitPrice: real("unit_price").notNull(),
  total: real("total").notNull(),
  addedAt: timestamp("added_at").defaultNow(),
});

// Online Orders - الطلبات الإلكترونية
export const onlineOrders = pgTable("online_orders", {
  id: text("id").primaryKey(),
  orderNumber: text("order_number").unique(),
  customerId: text("customer_id").references(() => customers.id),
  // Status: pending, confirmed, processing, shipped, delivered, cancelled, refunded
  status: text("status").default("pending"),
  // Amounts
  subtotal: real("subtotal").default(0),
  discountAmount: real("discount_amount").default(0),
  discountCode: text("discount_code"),
  taxAmount: real("tax_amount").default(0),
  shippingCost: real("shipping_cost").default(0),
  total: real("total").default(0),
  // Shipping
  shippingMethod: text("shipping_method"),
  shippingAddress: jsonb("shipping_address"),
  billingAddress: jsonb("billing_address"),
  // Payment
  paymentMethod: text("payment_method"), // cod, card, bank_transfer
  paymentStatus: text("payment_status").default("pending"), // pending, paid, failed, refunded
  paidAt: timestamp("paid_at"),
  paymentReference: text("payment_reference"),
  // Delivery
  estimatedDelivery: timestamp("estimated_delivery"),
  deliveredAt: timestamp("delivered_at"),
  trackingNumber: text("tracking_number"),
  // Notes
  customerNotes: text("customer_notes"),
  internalNotes: text("internal_notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Order Items - عناصر الطلب
export const onlineOrderItems = pgTable("online_order_items", {
  id: text("id").primaryKey(),
  orderId: text("order_id").references(() => onlineOrders.id),
  productId: text("product_id").references(() => products.id),
  productName: text("product_name").notNull(),
  productCode: text("product_code"),
  quantity: integer("quantity").default(1),
  unitPrice: real("unit_price").notNull(),
  discountAmount: real("discount_amount").default(0),
  total: real("total").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Discount Codes - أكواد الخصم
export const discountCodes = pgTable("discount_codes", {
  id: text("id").primaryKey(),
  code: text("code").unique().notNull(),
  name: text("name"),
  // Type: percentage, fixed
  discountType: text("discount_type").default("percentage"),
  discountValue: real("discount_value").notNull(),
  // Limits
  minOrderAmount: real("min_order_amount"),
  maxDiscount: real("max_discount"),
  usageLimit: integer("usage_limit"),
  usedCount: integer("used_count").default(0),
  // Validity
  validFrom: timestamp("valid_from"),
  validUntil: timestamp("valid_until"),
  isActive: integer("is_active").default(1),
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Product Reviews - تقييمات المنتجات
export const productReviews = pgTable("product_reviews", {
  id: text("id").primaryKey(),
  productId: text("product_id").references(() => products.id),
  customerId: text("customer_id").references(() => customers.id),
  orderId: text("order_id").references(() => onlineOrders.id),
  rating: integer("rating").notNull(), // 1-5
  title: text("title"),
  comment: text("comment"),
  // Status: pending, approved, rejected
  status: text("status").default("pending"),
  isVerifiedPurchase: integer("is_verified_purchase").default(0),
  helpfulCount: integer("helpful_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Wishlists - قوائم الأمنيات
export const wishlists = pgTable("wishlists", {
  id: text("id").primaryKey(),
  customerId: text("customer_id").references(() => customers.id),
  productId: text("product_id").references(() => products.id),
  addedAt: timestamp("added_at").defaultNow(),
});

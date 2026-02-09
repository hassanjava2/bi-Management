import { Hono } from "hono";
import { db, onlineOrders, onlineOrderItems, shoppingCarts, cartItems, discountCodes, productReviews, products, customers } from "@bi-management/database";
import { eq, desc, sql, and, gte, lte } from "drizzle-orm";
import { authMiddleware } from "../lib/auth.js";

const app = new Hono();

// ==================== ORDERS ====================

app.get("/orders", async (c) => {
  try {
    const { status, limit = "50" } = c.req.query();
    let query = db.select({ order: onlineOrders, customer: customers }).from(onlineOrders).leftJoin(customers, eq(onlineOrders.customerId, customers.id));
    if (status) query = query.where(eq(onlineOrders.status, status)) as typeof query;
    const items = await query.orderBy(desc(onlineOrders.createdAt)).limit(parseInt(limit));
    return c.json({ items: items.map((row) => ({ ...row.order, customer: row.customer ? { id: row.customer.id, name: row.customer.name, email: row.customer.email } : null })) });
  } catch (error) {
    console.error(error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.get("/orders/stats", async (c) => {
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const [stats] = await db.select({
      total: sql<number>`count(*)`,
      pending: sql<number>`count(*) filter (where ${onlineOrders.status} = 'pending')`,
      processing: sql<number>`count(*) filter (where ${onlineOrders.status} = 'processing')`,
      delivered: sql<number>`count(*) filter (where ${onlineOrders.status} = 'delivered')`,
      totalRevenue: sql<number>`coalesce(sum(${onlineOrders.total}) filter (where ${onlineOrders.paymentStatus} = 'paid'), 0)`,
      todayOrders: sql<number>`count(*) filter (where ${onlineOrders.createdAt} >= ${today})`,
    }).from(onlineOrders);
    return c.json(stats);
  } catch (error) {
    console.error(error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.get("/orders/:id", async (c) => {
  try {
    const { id } = c.req.param();
    const [order] = await db.select({ order: onlineOrders, customer: customers }).from(onlineOrders).leftJoin(customers, eq(onlineOrders.customerId, customers.id)).where(eq(onlineOrders.id, id));
    if (!order) return c.json({ error: "Order not found" }, 404);
    const items = await db.select().from(onlineOrderItems).where(eq(onlineOrderItems.orderId, id));
    return c.json({ ...order.order, customer: order.customer, items });
  } catch (error) {
    console.error(error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.post("/orders", async (c) => {
  try {
    const body = await c.req.json();
    const id = crypto.randomUUID();
    const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}`;
    let subtotal = 0;
    for (const item of body.items || []) { subtotal += item.quantity * item.unitPrice; }
    const discountAmount = body.discountAmount || 0;
    const taxAmount = body.taxAmount || 0;
    const shippingCost = body.shippingCost || 0;
    const total = subtotal - discountAmount + taxAmount + shippingCost;

    await db.insert(onlineOrders).values({ id, orderNumber, customerId: body.customerId, status: "pending", subtotal, discountAmount, discountCode: body.discountCode, taxAmount, shippingCost, total, shippingMethod: body.shippingMethod, shippingAddress: body.shippingAddress, billingAddress: body.billingAddress, paymentMethod: body.paymentMethod, paymentStatus: "pending", customerNotes: body.customerNotes });

    for (const item of body.items || []) {
      const itemTotal = item.quantity * item.unitPrice - (item.discountAmount || 0);
      await db.insert(onlineOrderItems).values({ id: crypto.randomUUID(), orderId: id, productId: item.productId, productName: item.productName, productCode: item.productCode, quantity: item.quantity, unitPrice: item.unitPrice, discountAmount: item.discountAmount || 0, total: itemTotal });
    }
    return c.json({ id, orderNumber, total }, 201);
  } catch (error) {
    console.error(error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

app.put("/orders/:id/status", async (c) => {
  try {
    const { id } = c.req.param();
    const body = await c.req.json();
    await db.update(onlineOrders).set({ status: body.status, updatedAt: new Date(), ...(body.status === "delivered" ? { deliveredAt: new Date() } : {}) }).where(eq(onlineOrders.id, id));
    return c.json({ success: true });
  } catch (error) {
    console.error(error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

// ==================== CARTS ====================

app.get("/carts/:id", async (c) => {
  try {
    const { id } = c.req.param();
    const [cart] = await db.select().from(shoppingCarts).where(eq(shoppingCarts.id, id));
    if (!cart) return c.json({ error: "Cart not found" }, 404);
    const items = await db.select({ item: cartItems, product: products }).from(cartItems).leftJoin(products, eq(cartItems.productId, products.id)).where(eq(cartItems.cartId, id));
    return c.json({ ...cart, items: items.map((i) => ({ ...i.item, product: i.product })) });
  } catch (error) {
    console.error(error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.post("/carts", async (c) => {
  try {
    const body = await c.req.json();
    const id = crypto.randomUUID();
    await db.insert(shoppingCarts).values({ id, customerId: body.customerId, sessionId: body.sessionId, status: "active" });
    return c.json({ id }, 201);
  } catch (error) {
    console.error(error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

app.post("/carts/:id/items", async (c) => {
  try {
    const { id } = c.req.param();
    const body = await c.req.json();
    const itemId = crypto.randomUUID();
    const total = body.quantity * body.unitPrice;
    await db.insert(cartItems).values({ id: itemId, cartId: id, productId: body.productId, quantity: body.quantity, unitPrice: body.unitPrice, total });
    await db.update(shoppingCarts).set({ itemsCount: sql`${shoppingCarts.itemsCount} + 1`, subtotal: sql`${shoppingCarts.subtotal} + ${total}`, lastActivityAt: new Date() }).where(eq(shoppingCarts.id, id));
    return c.json({ id: itemId }, 201);
  } catch (error) {
    console.error(error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

// ==================== DISCOUNT CODES ====================

app.get("/discounts", async (c) => {
  try {
    const items = await db.select().from(discountCodes).orderBy(desc(discountCodes.createdAt));
    return c.json({ items });
  } catch (error) {
    console.error(error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.post("/discounts", async (c) => {
  try {
    const body = await c.req.json();
    const id = crypto.randomUUID();
    await db.insert(discountCodes).values({ id, code: body.code.toUpperCase(), name: body.name, discountType: body.discountType || "percentage", discountValue: body.discountValue, minOrderAmount: body.minOrderAmount, maxDiscount: body.maxDiscount, usageLimit: body.usageLimit, validFrom: body.validFrom ? new Date(body.validFrom) : null, validUntil: body.validUntil ? new Date(body.validUntil) : null, isActive: 1, createdBy: body.createdBy });
    return c.json({ id }, 201);
  } catch (error) {
    console.error(error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

app.post("/discounts/validate", async (c) => {
  try {
    const body = await c.req.json();
    const [discount] = await db.select().from(discountCodes).where(eq(discountCodes.code, body.code.toUpperCase()));
    if (!discount) return c.json({ valid: false, error: "Invalid code" });
    if (!discount.isActive) return c.json({ valid: false, error: "Code inactive" });
    if (discount.usageLimit && (discount.usedCount || 0) >= discount.usageLimit) return c.json({ valid: false, error: "Usage limit reached" });
    if (discount.validUntil && new Date() > discount.validUntil) return c.json({ valid: false, error: "Code expired" });
    if (discount.minOrderAmount && body.orderAmount < discount.minOrderAmount) return c.json({ valid: false, error: `Minimum order: ${discount.minOrderAmount}` });
    let discountAmount = discount.discountType === "percentage" ? (body.orderAmount * (discount.discountValue || 0)) / 100 : discount.discountValue || 0;
    if (discount.maxDiscount && discountAmount > discount.maxDiscount) discountAmount = discount.maxDiscount;
    return c.json({ valid: true, discountAmount, discount });
  } catch (error) {
    console.error(error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

// ==================== REVIEWS ====================

app.get("/reviews", async (c) => {
  try {
    const { productId, status, limit = "50" } = c.req.query();
    let query = db.select({ review: productReviews, customer: customers, product: products }).from(productReviews).leftJoin(customers, eq(productReviews.customerId, customers.id)).leftJoin(products, eq(productReviews.productId, products.id));
    const conditions = [];
    if (productId) conditions.push(eq(productReviews.productId, productId));
    if (status) conditions.push(eq(productReviews.status, status));
    if (conditions.length > 0) query = query.where(and(...conditions)) as typeof query;
    const items = await query.orderBy(desc(productReviews.createdAt)).limit(parseInt(limit));
    return c.json({ items: items.map((r) => ({ ...r.review, customer: r.customer ? { id: r.customer.id, name: r.customer.name } : null, product: r.product ? { id: r.product.id, name: r.product.name } : null })) });
  } catch (error) {
    console.error(error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.post("/reviews", async (c) => {
  try {
    const body = await c.req.json();
    const id = crypto.randomUUID();
    await db.insert(productReviews).values({ id, productId: body.productId, customerId: body.customerId, orderId: body.orderId, rating: body.rating, title: body.title, comment: body.comment, status: "pending", isVerifiedPurchase: body.orderId ? 1 : 0 });
    return c.json({ id }, 201);
  } catch (error) {
    console.error(error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

app.put("/reviews/:id/approve", async (c) => {
  try {
    const { id } = c.req.param();
    await db.update(productReviews).set({ status: "approved" }).where(eq(productReviews.id, id));
    return c.json({ success: true });
  } catch (error) {
    console.error(error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

export default app;

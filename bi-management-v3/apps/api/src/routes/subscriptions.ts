/**
 * API Routes - نظام الاشتراكات
 */
import { Hono } from "hono";
import { db, subscriptions, subscriptionPlans, subscriptionInvoices, subscriptionActivities } from "@bi-management/database";
import { eq, and, or, desc, count, like, gte, lte } from "drizzle-orm";
import { nanoid } from "nanoid";
import { authMiddleware } from "../lib/auth.js";

const app = new Hono();

async function generateSubscriptionNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `SUB-${year}-`;
  const [last] = await db.select({ subscriptionNumber: subscriptions.subscriptionNumber })
    .from(subscriptions).where(like(subscriptions.subscriptionNumber, `${prefix}%`))
    .orderBy(desc(subscriptions.subscriptionNumber)).limit(1);
  let nextNum = 1;
  if (last?.subscriptionNumber) {
    const num = parseInt(last.subscriptionNumber.replace(prefix, ""), 10);
    if (!isNaN(num)) nextNum = num + 1;
  }
  return `${prefix}${String(nextNum).padStart(5, "0")}`;
}

async function generateInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, "0");
  const prefix = `SINV-${year}${month}-`;
  const [last] = await db.select({ invoiceNumber: subscriptionInvoices.invoiceNumber })
    .from(subscriptionInvoices).where(like(subscriptionInvoices.invoiceNumber, `${prefix}%`))
    .orderBy(desc(subscriptionInvoices.invoiceNumber)).limit(1);
  let nextNum = 1;
  if (last?.invoiceNumber) {
    const num = parseInt(last.invoiceNumber.replace(prefix, ""), 10);
    if (!isNaN(num)) nextNum = num + 1;
  }
  return `${prefix}${String(nextNum).padStart(4, "0")}`;
}

// ============== خطط الاشتراك ==============

app.get("/plans", async (c) => {
  try {
    const { active } = c.req.query();
    const conditions = [];
    if (active === "true") conditions.push(eq(subscriptionPlans.isActive, true));

    const result = await db.select().from(subscriptionPlans)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(subscriptionPlans.sortOrder);

    return c.json({ plans: result });
  } catch (error) {
    return c.json({ error: "فشل" }, 500);
  }
});

app.post("/plans", async (c) => {
  try {
    const body = await c.req.json();
    const id = `plan_${nanoid(12)}`;

    await db.insert(subscriptionPlans).values({
      id,
      name: body.name,
      nameAr: body.nameAr || null,
      description: body.description || null,
      price: body.price,
      currency: body.currency || "IQD",
      billingCycle: body.billingCycle || "monthly",
      billingInterval: body.billingInterval || 1,
      features: body.features || null,
      limits: body.limits || null,
      trialDays: body.trialDays || 0,
      setupFee: body.setupFee || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return c.json({ id }, 201);
  } catch (error) {
    return c.json({ error: "فشل" }, 500);
  }
});

// ============== الاشتراكات ==============

app.get("/", async (c) => {
  try {
    const { status, customerId, search, page = "1", limit = "20" } = c.req.query();
    const conditions = [];
    if (status) conditions.push(eq(subscriptions.status, status));
    if (customerId) conditions.push(eq(subscriptions.customerId, customerId));
    if (search) conditions.push(or(like(subscriptions.subscriptionNumber, `%${search}%`), like(subscriptions.customerName, `%${search}%`)));

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    const result = await db.select().from(subscriptions)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(subscriptions.createdAt))
      .limit(limitNum).offset((pageNum - 1) * limitNum);

    const [total] = await db.select({ count: count() }).from(subscriptions)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    return c.json({ subscriptions: result, pagination: { page: pageNum, limit: limitNum, total: total?.count || 0 } });
  } catch (error) {
    return c.json({ error: "فشل" }, 500);
  }
});

app.get("/stats", async (c) => {
  try {
    const statusStats = await db.select({ status: subscriptions.status, count: count() })
      .from(subscriptions).groupBy(subscriptions.status);

    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const [newThisMonth] = await db.select({ count: count() }).from(subscriptions)
      .where(gte(subscriptions.createdAt, thisMonth));

    const [expiringThisWeek] = await db.select({ count: count() }).from(subscriptions)
      .where(and(
        or(eq(subscriptions.status, "active"), eq(subscriptions.status, "trial")),
        lte(subscriptions.currentPeriodEnd, new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000))
      ));

    return c.json({
      byStatus: statusStats.reduce((acc, s) => ({ ...acc, [s.status || "unknown"]: s.count }), {}),
      newThisMonth: newThisMonth?.count || 0,
      expiringThisWeek: expiringThisWeek?.count || 0,
    });
  } catch (error) {
    return c.json({ error: "فشل" }, 500);
  }
});

app.get("/:id", async (c) => {
  try {
    const { id } = c.req.param();
    const [subscription] = await db.select().from(subscriptions).where(eq(subscriptions.id, id));
    if (!subscription) return c.json({ error: "الاشتراك غير موجود" }, 404);

    const [invoices, activities] = await Promise.all([
      db.select().from(subscriptionInvoices).where(eq(subscriptionInvoices.subscriptionId, id)).orderBy(desc(subscriptionInvoices.createdAt)),
      db.select().from(subscriptionActivities).where(eq(subscriptionActivities.subscriptionId, id)).orderBy(desc(subscriptionActivities.createdAt)),
    ]);

    return c.json({ ...subscription, invoices, activities });
  } catch (error) {
    return c.json({ error: "فشل" }, 500);
  }
});

app.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const id = `sub_${nanoid(12)}`;
    const subscriptionNumber = await generateSubscriptionNumber();

    const startDate = new Date(body.startDate || Date.now());
    const plan = body.planId ? (await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, body.planId)))[0] : null;

    let currentPeriodEnd = new Date(startDate);
    const cycle = body.billingCycle || plan?.billingCycle || "monthly";
    if (cycle === "monthly") currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);
    else if (cycle === "yearly") currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + 1);
    else if (cycle === "quarterly") currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 3);
    else if (cycle === "weekly") currentPeriodEnd.setDate(currentPeriodEnd.getDate() + 7);

    const trialDays = body.trialDays ?? plan?.trialDays ?? 0;
    const trialEndsAt = trialDays > 0 ? new Date(startDate.getTime() + trialDays * 24 * 60 * 60 * 1000) : null;

    await db.insert(subscriptions).values({
      id, subscriptionNumber,
      customerId: body.customerId || null,
      customerName: body.customerName,
      customerEmail: body.customerEmail || null,
      customerPhone: body.customerPhone || null,
      planId: body.planId || null,
      planName: body.planName || plan?.name || "خطة مخصصة",
      price: body.price || plan?.price || "0",
      currency: body.currency || plan?.currency || "IQD",
      status: trialDays > 0 ? "trial" : "active",
      startDate,
      trialEndsAt,
      currentPeriodStart: startDate,
      currentPeriodEnd,
      nextBillingDate: trialEndsAt || currentPeriodEnd,
      billingCycle: cycle,
      autoRenew: body.autoRenew ?? true,
      notes: body.notes || null,
      createdBy: body.createdBy || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await db.insert(subscriptionActivities).values({
      id: `sa_${nanoid(12)}`, subscriptionId: id,
      activityType: "created", description: `تم إنشاء الاشتراك ${subscriptionNumber}`,
      performedBy: body.createdBy || null, createdAt: new Date(),
    });

    return c.json({ id, subscriptionNumber }, 201);
  } catch (error) {
    console.error("Create subscription error:", error);
    return c.json({ error: "فشل في إنشاء الاشتراك" }, 500);
  }
});

app.post("/:id/status", async (c) => {
  try {
    const { id } = c.req.param();
    const { status, reason, performedBy } = await c.req.json();

    const updates: any = { status, updatedAt: new Date() };
    if (status === "cancelled") { updates.cancelledAt = new Date(); updates.cancellationReason = reason; }
    if (status === "paused") updates.pausedAt = new Date();

    await db.update(subscriptions).set(updates).where(eq(subscriptions.id, id));

    await db.insert(subscriptionActivities).values({
      id: `sa_${nanoid(12)}`, subscriptionId: id,
      activityType: status === "cancelled" ? "cancelled" : status === "paused" ? "paused" : "status_changed",
      description: reason || `تم تغيير الحالة إلى ${status}`,
      performedBy, createdAt: new Date(),
    });

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: "فشل" }, 500);
  }
});

app.post("/:id/renew", async (c) => {
  try {
    const { id } = c.req.param();
    const { performedBy } = await c.req.json();

    const [subscription] = await db.select().from(subscriptions).where(eq(subscriptions.id, id));
    if (!subscription) return c.json({ error: "الاشتراك غير موجود" }, 404);

    const newStart = subscription.currentPeriodEnd || new Date();
    let newEnd = new Date(newStart);
    if (subscription.billingCycle === "monthly") newEnd.setMonth(newEnd.getMonth() + 1);
    else if (subscription.billingCycle === "yearly") newEnd.setFullYear(newEnd.getFullYear() + 1);
    else if (subscription.billingCycle === "quarterly") newEnd.setMonth(newEnd.getMonth() + 3);

    await db.update(subscriptions).set({
      status: "active",
      currentPeriodStart: newStart,
      currentPeriodEnd: newEnd,
      nextBillingDate: newEnd,
      lastBillingDate: new Date(),
      updatedAt: new Date(),
    }).where(eq(subscriptions.id, id));

    // إنشاء فاتورة
    const invoiceNumber = await generateInvoiceNumber();
    await db.insert(subscriptionInvoices).values({
      id: `sinv_${nanoid(12)}`, invoiceNumber, subscriptionId: id,
      periodStart: newStart, periodEnd: newEnd,
      subtotal: subscription.price, total: subscription.price,
      status: "pending", dueDate: new Date(),
      createdAt: new Date(),
    });

    await db.insert(subscriptionActivities).values({
      id: `sa_${nanoid(12)}`, subscriptionId: id,
      activityType: "renewed", description: "تم تجديد الاشتراك",
      performedBy, createdAt: new Date(),
    });

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: "فشل" }, 500);
  }
});

export default app;

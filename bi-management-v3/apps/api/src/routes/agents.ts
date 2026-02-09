/**
 * API Routes - نظام الوكلاء والموزعين
 */
import { Hono } from "hono";
import { db, agents, agentContracts, agentSales, agentOrders, agentActivities } from "@bi-management/database";
import { eq, and, or, desc, count, like, sum } from "drizzle-orm";
import { nanoid } from "nanoid";
import { authMiddleware } from "../lib/auth.js";

const app = new Hono();


// توليد رقم وكيل
async function generateAgentNumber(): Promise<string> {
  const [last] = await db.select({ agentNumber: agents.agentNumber })
    .from(agents).orderBy(desc(agents.agentNumber)).limit(1);
  let nextNum = 1;
  if (last?.agentNumber) {
    const num = parseInt(last.agentNumber.replace("AGT-", ""), 10);
    if (!isNaN(num)) nextNum = num + 1;
  }
  return `AGT-${String(nextNum).padStart(4, "0")}`;
}

// جلب الوكلاء
app.get("/", async (c) => {
  try {
    const { status, type, tier, search, page = "1", limit = "20" } = c.req.query();
    const conditions = [];
    if (status) conditions.push(eq(agents.status, status));
    if (type) conditions.push(eq(agents.agentType, type));
    if (tier) conditions.push(eq(agents.tier, tier));
    if (search) conditions.push(or(like(agents.name, `%${search}%`), like(agents.agentNumber, `%${search}%`)));

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    const result = await db.select().from(agents)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(agents.createdAt))
      .limit(limitNum).offset((pageNum - 1) * limitNum);

    const [total] = await db.select({ count: count() }).from(agents)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    return c.json({ agents: result, pagination: { page: pageNum, limit: limitNum, total: total?.count || 0 } });
  } catch (error) {
    return c.json({ error: "فشل في جلب الوكلاء" }, 500);
  }
});

// إحصائيات
app.get("/stats", async (c) => {
  try {
    const statusStats = await db.select({ status: agents.status, count: count() })
      .from(agents).groupBy(agents.status);

    const tierStats = await db.select({ tier: agents.tier, count: count() })
      .from(agents).groupBy(agents.tier);

    const typeStats = await db.select({ type: agents.agentType, count: count() })
      .from(agents).groupBy(agents.agentType);

    return c.json({
      byStatus: statusStats.reduce((acc, s) => ({ ...acc, [s.status || "unknown"]: s.count }), {}),
      byTier: tierStats.reduce((acc, s) => ({ ...acc, [s.tier || "bronze"]: s.count }), {}),
      byType: typeStats.reduce((acc, s) => ({ ...acc, [s.type || "distributor"]: s.count }), {}),
    });
  } catch (error) {
    return c.json({ error: "فشل" }, 500);
  }
});

// تفاصيل وكيل
app.get("/:id", async (c) => {
  try {
    const { id } = c.req.param();
    const [agent] = await db.select().from(agents).where(eq(agents.id, id));
    if (!agent) return c.json({ error: "الوكيل غير موجود" }, 404);

    const [contracts, sales, orders, activities] = await Promise.all([
      db.select().from(agentContracts).where(eq(agentContracts.agentId, id)).orderBy(desc(agentContracts.startDate)),
      db.select().from(agentSales).where(eq(agentSales.agentId, id)).orderBy(desc(agentSales.period)).limit(12),
      db.select().from(agentOrders).where(eq(agentOrders.agentId, id)).orderBy(desc(agentOrders.createdAt)).limit(10),
      db.select().from(agentActivities).where(eq(agentActivities.agentId, id)).orderBy(desc(agentActivities.createdAt)).limit(20),
    ]);

    return c.json({ ...agent, contracts, sales, orders, activities });
  } catch (error) {
    return c.json({ error: "فشل" }, 500);
  }
});

// إنشاء وكيل
app.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const id = `agt_${nanoid(12)}`;
    const agentNumber = await generateAgentNumber();

    await db.insert(agents).values({
      id, agentNumber,
      name: body.name,
      nameEn: body.nameEn || null,
      agentType: body.agentType || "distributor",
      contactPerson: body.contactPerson || null,
      phone: body.phone || null,
      mobile: body.mobile || null,
      email: body.email || null,
      country: body.country || "العراق",
      city: body.city || null,
      address: body.address || null,
      region: body.region || null,
      territories: body.territories || null,
      commissionRate: body.commissionRate || null,
      discountRate: body.discountRate || null,
      creditLimit: body.creditLimit || null,
      paymentTerms: body.paymentTerms || null,
      allowedCategories: body.allowedCategories || null,
      monthlyTarget: body.monthlyTarget || null,
      status: "active",
      tier: body.tier || "bronze",
      contractStartDate: body.contractStartDate ? new Date(body.contractStartDate) : null,
      contractEndDate: body.contractEndDate ? new Date(body.contractEndDate) : null,
      notes: body.notes || null,
      accountManagerId: body.accountManagerId || null,
      createdBy: body.createdBy || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await db.insert(agentActivities).values({
      id: `aa_${nanoid(12)}`, agentId: id,
      activityType: "created", description: `تم إنشاء ملف الوكيل ${agentNumber}`,
      performedBy: body.createdBy || null, createdAt: new Date(),
    });

    return c.json({ id, agentNumber }, 201);
  } catch (error) {
    console.error("Create agent error:", error);
    return c.json({ error: "فشل في إنشاء الوكيل" }, 500);
  }
});

// تحديث وكيل
app.put("/:id", async (c) => {
  try {
    const { id } = c.req.param();
    const body = await c.req.json();

    await db.update(agents).set({
      name: body.name,
      nameEn: body.nameEn,
      contactPerson: body.contactPerson,
      phone: body.phone,
      mobile: body.mobile,
      email: body.email,
      city: body.city,
      address: body.address,
      region: body.region,
      territories: body.territories,
      commissionRate: body.commissionRate,
      discountRate: body.discountRate,
      creditLimit: body.creditLimit,
      monthlyTarget: body.monthlyTarget,
      tier: body.tier,
      notes: body.notes,
      updatedAt: new Date(),
    }).where(eq(agents.id, id));

    return c.json({ success: true });
  } catch (error) {
    console.error("Update agent error:", error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

// تغيير حالة
app.post("/:id/status", async (c) => {
  try {
    const { id } = c.req.param();
    const { status, reason, performedBy } = await c.req.json();

    await db.update(agents).set({ status, updatedAt: new Date() }).where(eq(agents.id, id));

    await db.insert(agentActivities).values({
      id: `aa_${nanoid(12)}`, agentId: id,
      activityType: "status_change", description: reason || `تم تغيير الحالة إلى ${status}`,
      performedBy, createdAt: new Date(),
    });

    return c.json({ success: true });
  } catch (error) {
    console.error("Change agent status error:", error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

// ============== طلبات الوكلاء ==============

app.post("/:id/orders", async (c) => {
  try {
    const { id: agentId } = c.req.param();
    const body = await c.req.json();
    const orderId = `ao_${nanoid(12)}`;
    const orderNumber = `AO-${Date.now()}`;

    await db.insert(agentOrders).values({
      id: orderId, orderNumber, agentId,
      items: body.items,
      subtotal: body.subtotal,
      discountAmount: body.discountAmount || "0",
      totalAmount: body.totalAmount,
      commissionAmount: body.commissionAmount || "0",
      status: "pending",
      shippingAddress: body.shippingAddress || null,
      notes: body.notes || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await db.insert(agentActivities).values({
      id: `aa_${nanoid(12)}`, agentId,
      activityType: "order", description: `طلب جديد ${orderNumber}`,
      metadata: { orderId, amount: body.totalAmount },
      createdAt: new Date(),
    });

    return c.json({ id: orderId, orderNumber }, 201);
  } catch (error) {
    console.error("Create agent order error:", error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

// تغيير فئة الوكيل
app.post("/:id/tier", async (c) => {
  try {
    const { id } = c.req.param();
    const { tier, performedBy } = await c.req.json();

    const [old] = await db.select({ tier: agents.tier }).from(agents).where(eq(agents.id, id));

    await db.update(agents).set({ tier, updatedAt: new Date() }).where(eq(agents.id, id));

    await db.insert(agentActivities).values({
      id: `aa_${nanoid(12)}`, agentId: id,
      activityType: "tier_change", description: `تغيير الفئة من ${old?.tier} إلى ${tier}`,
      performedBy, createdAt: new Date(),
    });

    return c.json({ success: true });
  } catch (error) {
    console.error("Change agent tier error:", error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

export default app;

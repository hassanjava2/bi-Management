/**
 * API Routes - نظام الشركاء
 */
import { Hono } from "hono";
import { db, partners, partnerContacts, partnerAgreements, partnerActivities, partnerCommissions } from "@bi-management/database";
import { eq, and, or, desc, count, like, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { authMiddleware } from "../lib/auth.js";

const app = new Hono();

// الشركاء
app.get("/", async (c) => {
  try {
    const { type, status, level, search, page = "1", limit = "20" } = c.req.query();
    const conditions = [];

    if (type) conditions.push(eq(partners.type, type));
    if (status) conditions.push(eq(partners.status, status));
    if (level) conditions.push(eq(partners.partnershipLevel, level));
    if (search) conditions.push(or(
      like(partners.name, `%${search}%`),
      like(partners.email, `%${search}%`)
    ));

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    const result = await db.select().from(partners)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(partners.createdAt))
      .limit(limitNum).offset((pageNum - 1) * limitNum);

    const [total] = await db.select({ count: count() }).from(partners)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    return c.json({ partners: result, pagination: { page: pageNum, limit: limitNum, total: total?.count || 0 } });
  } catch (error) {
    console.error("Get partners error:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.get("/stats", async (c) => {
  try {
    const [total] = await db.select({ count: count() }).from(partners);
    const [active] = await db.select({ count: count() }).from(partners).where(eq(partners.status, "active"));
    const [prospect] = await db.select({ count: count() }).from(partners).where(eq(partners.status, "prospect"));

    const levelStats = await db.select({ level: partners.partnershipLevel, count: count() })
      .from(partners).where(eq(partners.status, "active")).groupBy(partners.partnershipLevel);

    const typeStats = await db.select({ type: partners.type, count: count() })
      .from(partners).groupBy(partners.type);

    // إجمالي العمولات المعلقة
    const pendingCommissions = await db.select({
      total: sql<number>`COALESCE(SUM(CAST(commission_amount AS NUMERIC)), 0)`,
    }).from(partnerCommissions).where(eq(partnerCommissions.status, "pending"));

    return c.json({
      total: total?.count || 0,
      active: active?.count || 0,
      prospect: prospect?.count || 0,
      byLevel: levelStats.reduce((acc, s) => ({ ...acc, [s.level || "standard"]: s.count }), {}),
      byType: typeStats.reduce((acc, s) => ({ ...acc, [s.type || "business"]: s.count }), {}),
      pendingCommissions: pendingCommissions[0]?.total || 0,
    });
  } catch (error) {
    console.error("Get stats error:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.get("/:id", async (c) => {
  try {
    const { id } = c.req.param();
    const [partner] = await db.select().from(partners).where(eq(partners.id, id));
    if (!partner) return c.json({ error: "الشريك غير موجود" }, 404);

    const contacts = await db.select().from(partnerContacts)
      .where(eq(partnerContacts.partnerId, id));

    const agreements = await db.select().from(partnerAgreements)
      .where(eq(partnerAgreements.partnerId, id))
      .orderBy(desc(partnerAgreements.createdAt));

    const activities = await db.select().from(partnerActivities)
      .where(eq(partnerActivities.partnerId, id))
      .orderBy(desc(partnerActivities.scheduledAt))
      .limit(10);

    return c.json({ ...partner, contacts, agreements, recentActivities: activities });
  } catch (error) {
    console.error("Get partner by id error:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const id = `prt_${nanoid(12)}`;

    await db.insert(partners).values({
      id,
      name: body.name,
      nameEn: body.nameEn || null,
      type: body.type || "business",
      contactPerson: body.contactPerson || null,
      email: body.email || null,
      phone: body.phone || null,
      website: body.website || null,
      country: body.country || null,
      city: body.city || null,
      address: body.address || null,
      industry: body.industry || null,
      companySize: body.companySize || null,
      registrationNumber: body.registrationNumber || null,
      taxNumber: body.taxNumber || null,
      status: body.status || "prospect",
      partnershipLevel: body.partnershipLevel || "standard",
      notes: body.notes || null,
      tags: body.tags || null,
      logo: body.logo || null,
      assignedTo: body.assignedTo || null,
      createdBy: body.createdBy || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return c.json({ id }, 201);
  } catch (error) {
    console.error("Create partner error:", error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

app.patch("/:id", async (c) => {
  try {
    const { id } = c.req.param();
    const body = await c.req.json();

    await db.update(partners).set({
      ...body,
      updatedAt: new Date(),
    }).where(eq(partners.id, id));

    return c.json({ success: true });
  } catch (error) {
    console.error("Update partner error:", error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

// جهات الاتصال
app.post("/:id/contacts", async (c) => {
  try {
    const { id: partnerId } = c.req.param();
    const body = await c.req.json();
    const id = `pc_${nanoid(12)}`;

    await db.insert(partnerContacts).values({
      id, partnerId,
      name: body.name,
      position: body.position || null,
      department: body.department || null,
      email: body.email || null,
      phone: body.phone || null,
      mobile: body.mobile || null,
      isPrimary: body.isPrimary || false,
      preferredContactMethod: body.preferredContactMethod || "email",
      notes: body.notes || null,
      createdAt: new Date(),
    });

    return c.json({ id }, 201);
  } catch (error) {
    console.error("Create contact error:", error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

// الاتفاقيات
app.get("/:id/agreements", async (c) => {
  try {
    const { id } = c.req.param();
    const agreements = await db.select().from(partnerAgreements)
      .where(eq(partnerAgreements.partnerId, id))
      .orderBy(desc(partnerAgreements.createdAt));
    return c.json(agreements);
  } catch (error) {
    console.error("Get agreements error:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.post("/:id/agreements", async (c) => {
  try {
    const { id: partnerId } = c.req.param();
    const body = await c.req.json();
    const id = `agr_${nanoid(12)}`;

    await db.insert(partnerAgreements).values({
      id, partnerId,
      title: body.title,
      description: body.description || null,
      agreementType: body.agreementType || "partnership",
      startDate: body.startDate ? new Date(body.startDate) : null,
      endDate: body.endDate ? new Date(body.endDate) : null,
      value: body.value || null,
      currency: body.currency || "IQD",
      status: "draft",
      documentUrl: body.documentUrl || null,
      terms: body.terms || null,
      createdBy: body.createdBy || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return c.json({ id }, 201);
  } catch (error) {
    console.error("Create agreement error:", error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

// الأنشطة
app.get("/:id/activities", async (c) => {
  try {
    const { id } = c.req.param();
    const { page = "1", limit = "20" } = c.req.query();
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    const activities = await db.select().from(partnerActivities)
      .where(eq(partnerActivities.partnerId, id))
      .orderBy(desc(partnerActivities.scheduledAt))
      .limit(limitNum).offset((pageNum - 1) * limitNum);

    return c.json(activities);
  } catch (error) {
    console.error("Get activities error:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.post("/:id/activities", async (c) => {
  try {
    const { id: partnerId } = c.req.param();
    const body = await c.req.json();
    const id = `act_${nanoid(12)}`;

    await db.insert(partnerActivities).values({
      id, partnerId,
      activityType: body.activityType,
      title: body.title,
      description: body.description || null,
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
      status: body.status || "scheduled",
      participants: body.participants || null,
      createdBy: body.createdBy || null,
      createdAt: new Date(),
    });

    return c.json({ id }, 201);
  } catch (error) {
    console.error("Create activity error:", error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

app.patch("/activities/:id/complete", async (c) => {
  try {
    const { id } = c.req.param();
    const { outcome, nextSteps } = await c.req.json();

    await db.update(partnerActivities).set({
      status: "completed",
      completedAt: new Date(),
      outcome: outcome || null,
      nextSteps: nextSteps || null,
    }).where(eq(partnerActivities.id, id));

    return c.json({ success: true });
  } catch (error) {
    console.error("Complete activity error:", error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

// العمولات
app.get("/:id/commissions", async (c) => {
  try {
    const { id } = c.req.param();
    const commissions = await db.select().from(partnerCommissions)
      .where(eq(partnerCommissions.partnerId, id))
      .orderBy(desc(partnerCommissions.createdAt));
    return c.json(commissions);
  } catch (error) {
    console.error("Get commissions error:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.post("/commissions", async (c) => {
  try {
    const body = await c.req.json();
    const id = `com_${nanoid(12)}`;

    await db.insert(partnerCommissions).values({
      id,
      partnerId: body.partnerId,
      transactionType: body.transactionType || null,
      transactionId: body.transactionId || null,
      transactionValue: body.transactionValue || null,
      commissionRate: body.commissionRate || null,
      commissionAmount: body.commissionAmount,
      currency: body.currency || "IQD",
      status: "pending",
      periodStart: body.periodStart ? new Date(body.periodStart) : null,
      periodEnd: body.periodEnd ? new Date(body.periodEnd) : null,
      notes: body.notes || null,
      createdAt: new Date(),
    });

    return c.json({ id }, 201);
  } catch (error) {
    console.error("Create commission error:", error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

app.patch("/commissions/:id/approve", async (c) => {
  try {
    const { id } = c.req.param();
    const { approvedBy } = await c.req.json();

    await db.update(partnerCommissions).set({
      status: "approved",
      approvedBy: approvedBy || null,
    }).where(eq(partnerCommissions.id, id));

    return c.json({ success: true });
  } catch (error) {
    console.error("Approve commission error:", error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

export default app;

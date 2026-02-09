/**
 * API Routes - نظام سجل المكالمات
 */
import { Hono } from "hono";
import { db, calls, callScripts, callCampaigns, callStats } from "@bi-management/database";
import { eq, and, or, desc, count, sum, avg, like, gte, lte } from "drizzle-orm";
import { nanoid } from "nanoid";
import { authMiddleware } from "../lib/auth.js";

const app = new Hono();


// ============== المكالمات ==============

app.get("/", async (c) => {
  try {
    const { type, status, userId, customerId, startDate, endDate, search, page = "1", limit = "20" } = c.req.query();
    const conditions = [];
    if (type) conditions.push(eq(calls.callType, type));
    if (status) conditions.push(eq(calls.status, status));
    if (userId) conditions.push(eq(calls.userId, userId));
    if (customerId) conditions.push(eq(calls.customerId, customerId));
    if (startDate) conditions.push(gte(calls.startTime, new Date(startDate)));
    if (endDate) conditions.push(lte(calls.startTime, new Date(endDate)));
    if (search) conditions.push(or(like(calls.callerPhone, `%${search}%`), like(calls.callerName, `%${search}%`)));

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    const result = await db.select().from(calls)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(calls.startTime))
      .limit(limitNum).offset((pageNum - 1) * limitNum);

    const [total] = await db.select({ count: count() }).from(calls)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    return c.json({ calls: result, pagination: { page: pageNum, limit: limitNum, total: total?.count || 0 } });
  } catch (error) {
    return c.json({ error: "فشل" }, 500);
  }
});

app.get("/stats/overview", async (c) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const thisWeek = new Date(today);
    thisWeek.setDate(thisWeek.getDate() - 7);

    const [todayStats] = await db.select({
      total: count(),
      totalDuration: sum(calls.duration),
    }).from(calls).where(gte(calls.startTime, today));

    const statusStats = await db.select({ status: calls.status, count: count() })
      .from(calls).where(gte(calls.startTime, thisWeek)).groupBy(calls.status);

    const typeStats = await db.select({ type: calls.callType, count: count() })
      .from(calls).where(gte(calls.startTime, thisWeek)).groupBy(calls.callType);

    const purposeStats = await db.select({ purpose: calls.callPurpose, count: count() })
      .from(calls).where(gte(calls.startTime, thisWeek)).groupBy(calls.callPurpose);

    return c.json({
      today: {
        total: todayStats?.total || 0,
        totalDuration: todayStats?.totalDuration || 0,
      },
      byStatus: statusStats.reduce((acc, s) => ({ ...acc, [s.status || "unknown"]: s.count }), {}),
      byType: typeStats.reduce((acc, s) => ({ ...acc, [s.type || "outbound"]: s.count }), {}),
      byPurpose: purposeStats.reduce((acc, s) => ({ ...acc, [s.purpose || "general"]: s.count }), {}),
    });
  } catch (error) {
    console.error("Error fetching call stats:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.get("/:id", async (c) => {
  try {
    const { id } = c.req.param();
    const [call] = await db.select().from(calls).where(eq(calls.id, id));
    if (!call) return c.json({ error: "المكالمة غير موجودة" }, 404);
    return c.json(call);
  } catch (error) {
    return c.json({ error: "فشل" }, 500);
  }
});

app.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const id = `call_${nanoid(12)}`;

    const duration = body.endTime && body.startTime 
      ? Math.round((new Date(body.endTime).getTime() - new Date(body.startTime).getTime()) / 1000)
      : body.duration || null;

    await db.insert(calls).values({
      id,
      callType: body.callType || "outbound",
      callPurpose: body.callPurpose || "general",
      callerName: body.callerName || null,
      callerPhone: body.callerPhone,
      receiverName: body.receiverName || null,
      receiverPhone: body.receiverPhone || null,
      customerId: body.customerId || null,
      leadId: body.leadId || null,
      userId: body.userId || null,
      startTime: new Date(body.startTime || Date.now()),
      endTime: body.endTime ? new Date(body.endTime) : null,
      duration,
      status: body.status || "completed",
      recordingUrl: body.recordingUrl || null,
      notes: body.notes || null,
      summary: body.summary || null,
      sentiment: body.sentiment || null,
      outcome: body.outcome || null,
      followUpRequired: body.followUpRequired || false,
      followUpDate: body.followUpDate ? new Date(body.followUpDate) : null,
      followUpNotes: body.followUpNotes || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return c.json({ id }, 201);
  } catch (error) {
    console.error("Create call error:", error);
    return c.json({ error: "فشل" }, 500);
  }
});

app.put("/:id", async (c) => {
  try {
    const { id } = c.req.param();
    const body = await c.req.json();

    await db.update(calls).set({
      notes: body.notes,
      summary: body.summary,
      sentiment: body.sentiment,
      outcome: body.outcome,
      followUpRequired: body.followUpRequired,
      followUpDate: body.followUpDate ? new Date(body.followUpDate) : null,
      followUpNotes: body.followUpNotes,
      updatedAt: new Date(),
    }).where(eq(calls.id, id));

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: "فشل" }, 500);
  }
});

// ============== السكريبتات ==============

app.get("/scripts", async (c) => {
  try {
    const result = await db.select().from(callScripts).where(eq(callScripts.isActive, true));
    return c.json({ scripts: result });
  } catch (error) {
    console.error("Error fetching scripts:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.post("/scripts", async (c) => {
  try {
    const body = await c.req.json();
    const id = `cs_${nanoid(12)}`;
    await db.insert(callScripts).values({
      id, name: body.name, scriptType: body.scriptType || "sales",
      content: body.content, sections: body.sections || null, faqs: body.faqs || null,
      createdBy: body.createdBy || null, createdAt: new Date(), updatedAt: new Date(),
    });
    return c.json({ id }, 201);
  } catch (error) {
    console.error("Error creating script:", error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

// ============== الحملات ==============

app.get("/campaigns", async (c) => {
  try {
    const { status } = c.req.query();
    const conditions = status ? [eq(callCampaigns.status, status)] : [];
    const result = await db.select().from(callCampaigns)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(callCampaigns.createdAt));
    return c.json({ campaigns: result });
  } catch (error) {
    console.error("Error fetching campaigns:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.post("/campaigns", async (c) => {
  try {
    const body = await c.req.json();
    const id = `cc_${nanoid(12)}`;
    await db.insert(callCampaigns).values({
      id, name: body.name, description: body.description || null,
      campaignType: body.campaignType || "outbound",
      targetList: body.targetList || null,
      totalContacts: body.targetList?.length || 0,
      status: "draft",
      startDate: body.startDate ? new Date(body.startDate) : null,
      endDate: body.endDate ? new Date(body.endDate) : null,
      scriptId: body.scriptId || null,
      createdBy: body.createdBy || null, createdAt: new Date(), updatedAt: new Date(),
    });
    return c.json({ id }, 201);
  } catch (error) {
    console.error("Error creating campaign:", error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

app.post("/campaigns/:id/status", async (c) => {
  try {
    const { id } = c.req.param();
    const { status } = await c.req.json();
    await db.update(callCampaigns).set({ status, updatedAt: new Date() }).where(eq(callCampaigns.id, id));
    return c.json({ success: true });
  } catch (error) {
    console.error("Error updating campaign status:", error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

export default app;

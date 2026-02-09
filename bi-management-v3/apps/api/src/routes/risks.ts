/**
 * API Routes - نظام إدارة المخاطر
 */
import { Hono } from "hono";
import { db, risks, riskTreatments, riskAssessments, riskIncidents } from "@bi-management/database";
import { eq, and, or, desc, count, like, gte } from "drizzle-orm";
import { nanoid } from "nanoid";
import { authMiddleware } from "../lib/auth.js";

const app = new Hono();

const generateRiskNumber = () => `RISK-${Date.now().toString(36).toUpperCase()}`;

const calculateRiskLevel = (score: number): string => {
  if (score <= 4) return "low";
  if (score <= 9) return "medium";
  if (score <= 15) return "high";
  return "critical";
};

// المخاطر
app.get("/", async (c) => {
  try {
    const { category, status, level, search, page = "1", limit = "20" } = c.req.query();
    const conditions = [];

    if (category) conditions.push(eq(risks.category, category));
    if (status) conditions.push(eq(risks.status, status));
    if (level) conditions.push(eq(risks.riskLevel, level));
    if (search) conditions.push(or(
      like(risks.title, `%${search}%`),
      like(risks.riskNumber, `%${search}%`)
    ));

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    const result = await db.select().from(risks)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(risks.riskScore), desc(risks.createdAt))
      .limit(limitNum).offset((pageNum - 1) * limitNum);

    const [total] = await db.select({ count: count() }).from(risks)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    return c.json({ risks: result, pagination: { page: pageNum, limit: limitNum, total: total?.count || 0 } });
  } catch (error) {
    console.error("GET /risks error:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.get("/stats", async (c) => {
  try {
    const [total] = await db.select({ count: count() }).from(risks);
    const [critical] = await db.select({ count: count() }).from(risks).where(eq(risks.riskLevel, "critical"));
    const [high] = await db.select({ count: count() }).from(risks).where(eq(risks.riskLevel, "high"));
    const [medium] = await db.select({ count: count() }).from(risks).where(eq(risks.riskLevel, "medium"));
    const [low] = await db.select({ count: count() }).from(risks).where(eq(risks.riskLevel, "low"));
    const [openIncidents] = await db.select({ count: count() }).from(riskIncidents)
      .where(or(eq(riskIncidents.status, "reported"), eq(riskIncidents.status, "investigating")));

    const categoryStats = await db.select({ category: risks.category, count: count() })
      .from(risks).groupBy(risks.category);

    const statusStats = await db.select({ status: risks.status, count: count() })
      .from(risks).groupBy(risks.status);

    return c.json({
      total: total?.count || 0,
      byLevel: {
        critical: critical?.count || 0,
        high: high?.count || 0,
        medium: medium?.count || 0,
        low: low?.count || 0,
      },
      openIncidents: openIncidents?.count || 0,
      byCategory: categoryStats.reduce((acc, s) => ({ ...acc, [s.category || "operational"]: s.count }), {}),
      byStatus: statusStats.reduce((acc, s) => ({ ...acc, [s.status || "identified"]: s.count }), {}),
    });
  } catch (error) {
    console.error("GET /risks/stats error:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.get("/:id", async (c) => {
  try {
    const { id } = c.req.param();
    const [risk] = await db.select().from(risks).where(eq(risks.id, id));
    if (!risk) return c.json({ error: "المخاطرة غير موجودة" }, 404);

    const treatments = await db.select().from(riskTreatments)
      .where(eq(riskTreatments.riskId, id))
      .orderBy(desc(riskTreatments.createdAt));

    const assessments = await db.select().from(riskAssessments)
      .where(eq(riskAssessments.riskId, id))
      .orderBy(desc(riskAssessments.assessedAt));

    const incidents = await db.select().from(riskIncidents)
      .where(eq(riskIncidents.riskId, id))
      .orderBy(desc(riskIncidents.occurredAt));

    return c.json({ ...risk, treatments, assessments, incidents });
  } catch (error) {
    console.error("GET /risks/:id error:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const id = `risk_${nanoid(12)}`;
    const riskNumber = generateRiskNumber();

    const probability = body.probability || 3;
    const impact = body.impact || 3;
    const riskScore = probability * impact;
    const riskLevel = calculateRiskLevel(riskScore);

    await db.insert(risks).values({
      id, riskNumber,
      title: body.title,
      description: body.description || null,
      category: body.category || "operational",
      subcategory: body.subcategory || null,
      probability,
      impact,
      riskScore,
      riskLevel,
      status: "identified",
      branchId: body.branchId || null,
      departmentId: body.departmentId || null,
      ownerId: body.ownerId || null,
      reviewDate: body.reviewDate ? new Date(body.reviewDate) : null,
      notes: body.notes || null,
      tags: body.tags || null,
      createdBy: body.createdBy || null,
      identifiedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // إنشاء تقييم أولي
    await db.insert(riskAssessments).values({
      id: `ra_${nanoid(12)}`,
      riskId: id,
      probability,
      impact,
      score: riskScore,
      level: riskLevel,
      justification: body.justification || null,
      assessedBy: body.createdBy || null,
      assessedAt: new Date(),
    });

    return c.json({ id, riskNumber, riskScore, riskLevel }, 201);
  } catch (error) {
    console.error("POST /risks error:", error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

app.patch("/:id", async (c) => {
  try {
    const { id } = c.req.param();
    const body = await c.req.json();

    let updates: any = { ...body, updatedAt: new Date() };

    // إعادة حساب الدرجة إذا تغيرت
    if (body.probability || body.impact) {
      const [risk] = await db.select().from(risks).where(eq(risks.id, id));
      const probability = body.probability || risk?.probability || 3;
      const impact = body.impact || risk?.impact || 3;
      updates.riskScore = probability * impact;
      updates.riskLevel = calculateRiskLevel(updates.riskScore);
    }

    if (body.status === "closed") {
      updates.closedAt = new Date();
    }

    await db.update(risks).set(updates).where(eq(risks.id, id));

    return c.json({ success: true });
  } catch (error) {
    console.error("PATCH /risks/:id error:", error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

// خطط المعالجة
app.get("/:id/treatments", async (c) => {
  try {
    const { id } = c.req.param();
    const treatments = await db.select().from(riskTreatments)
      .where(eq(riskTreatments.riskId, id))
      .orderBy(riskTreatments.priority);
    return c.json(treatments);
  } catch (error) {
    console.error("GET /risks/:id/treatments error:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.post("/:id/treatments", async (c) => {
  try {
    const { id: riskId } = c.req.param();
    const body = await c.req.json();
    const id = `rt_${nanoid(12)}`;

    await db.insert(riskTreatments).values({
      id, riskId,
      title: body.title,
      description: body.description || null,
      treatmentType: body.treatmentType || "mitigate",
      estimatedCost: body.estimatedCost || null,
      status: "planned",
      priority: body.priority || "medium",
      startDate: body.startDate ? new Date(body.startDate) : null,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      assignedTo: body.assignedTo || null,
      createdBy: body.createdBy || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // تحديث حالة المخاطرة
    await db.update(risks).set({ status: "treatment", updatedAt: new Date() }).where(eq(risks.id, riskId));

    return c.json({ id }, 201);
  } catch (error) {
    console.error("POST /risks/:id/treatments error:", error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

app.patch("/treatments/:id/complete", async (c) => {
  try {
    const { id } = c.req.param();
    const { effectiveness, effectivenessNotes, actualCost } = await c.req.json();

    await db.update(riskTreatments).set({
      status: "completed",
      completedAt: new Date(),
      effectiveness: effectiveness || null,
      effectivenessNotes: effectivenessNotes || null,
      actualCost: actualCost || null,
      updatedAt: new Date(),
    }).where(eq(riskTreatments.id, id));

    return c.json({ success: true });
  } catch (error) {
    console.error("PATCH /risks/treatments/:id/complete error:", error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

// الحوادث
app.get("/incidents", async (c) => {
  try {
    const { status, severity } = c.req.query();
    const conditions = [];
    if (status) conditions.push(eq(riskIncidents.status, status));
    if (severity) conditions.push(eq(riskIncidents.severity, severity));

    const result = await db.select().from(riskIncidents)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(riskIncidents.occurredAt));

    return c.json(result);
  } catch (error) {
    console.error("GET /risks/incidents error:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.post("/incidents", async (c) => {
  try {
    const body = await c.req.json();
    const id = `inc_${nanoid(12)}`;

    await db.insert(riskIncidents).values({
      id,
      riskId: body.riskId || null,
      title: body.title,
      description: body.description || null,
      severity: body.severity || "medium",
      financialImpact: body.financialImpact || null,
      operationalImpact: body.operationalImpact || null,
      occurredAt: new Date(body.occurredAt || Date.now()),
      status: "reported",
      reportedBy: body.reportedBy || null,
      assignedTo: body.assignedTo || null,
      reportedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return c.json({ id }, 201);
  } catch (error) {
    console.error("POST /risks/incidents error:", error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

app.patch("/incidents/:id", async (c) => {
  try {
    const { id } = c.req.param();
    const body = await c.req.json();

    const updates: any = { ...body, updatedAt: new Date() };
    if (body.status === "resolved") updates.resolvedAt = new Date();

    await db.update(riskIncidents).set(updates).where(eq(riskIncidents.id, id));

    return c.json({ success: true });
  } catch (error) {
    console.error("PATCH /risks/incidents/:id error:", error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

export default app;

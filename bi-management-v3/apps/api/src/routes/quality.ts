/**
 * API Routes - نظام إدارة الجودة
 */
import { Hono } from "hono";
import { db, qualityStandards, qualityInspections, nonConformances, correctiveActions, qualityAudits } from "@bi-management/database";
import { eq, and, or, desc, count, like } from "drizzle-orm";
import { nanoid } from "nanoid";
import { authMiddleware } from "../lib/auth.js";

const app = new Hono();

const generateNumber = (prefix: string) => `${prefix}-${Date.now().toString(36).toUpperCase()}`;

// المعايير
app.get("/standards", async (c) => {
  try {
    const { category, type, active } = c.req.query();
    const conditions = [];
    if (category) conditions.push(eq(qualityStandards.category, category));
    if (type) conditions.push(eq(qualityStandards.type, type));
    if (active === "true") conditions.push(eq(qualityStandards.isActive, true));

    const result = await db.select().from(qualityStandards)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(qualityStandards.name);

    return c.json(result);
  } catch (error) {
    console.error("Error fetching standards:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.post("/standards", async (c) => {
  try {
    const body = await c.req.json();
    const id = `std_${nanoid(12)}`;

    await db.insert(qualityStandards).values({
      id,
      name: body.name,
      code: body.code || null,
      description: body.description || null,
      category: body.category || "product",
      type: body.type || "internal",
      requirements: body.requirements || null,
      minValue: body.minValue || null,
      maxValue: body.maxValue || null,
      targetValue: body.targetValue || null,
      unit: body.unit || null,
      effectiveDate: body.effectiveDate ? new Date(body.effectiveDate) : null,
      departmentId: body.departmentId || null,
      createdBy: body.createdBy || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return c.json({ id }, 201);
  } catch (error) {
    console.error("Error creating standard:", error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

// الفحوصات
app.get("/inspections", async (c) => {
  try {
    const { type, status, result, page = "1", limit = "20" } = c.req.query();
    const conditions = [];
    if (type) conditions.push(eq(qualityInspections.inspectionType, type));
    if (status) conditions.push(eq(qualityInspections.status, status));
    if (result) conditions.push(eq(qualityInspections.result, result));

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    const inspections = await db.select().from(qualityInspections)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(qualityInspections.scheduledAt))
      .limit(limitNum).offset((pageNum - 1) * limitNum);

    const [total] = await db.select({ count: count() }).from(qualityInspections)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    return c.json({ inspections, pagination: { page: pageNum, limit: limitNum, total: total?.count || 0 } });
  } catch (error) {
    console.error("Error fetching inspections:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.get("/stats", async (c) => {
  try {
    const [totalInspections] = await db.select({ count: count() }).from(qualityInspections);
    const [passedInspections] = await db.select({ count: count() }).from(qualityInspections).where(eq(qualityInspections.result, "pass"));
    const [failedInspections] = await db.select({ count: count() }).from(qualityInspections).where(eq(qualityInspections.result, "fail"));
    const [openNC] = await db.select({ count: count() }).from(nonConformances).where(eq(nonConformances.status, "open"));
    const [pendingActions] = await db.select({ count: count() }).from(correctiveActions)
      .where(or(eq(correctiveActions.status, "planned"), eq(correctiveActions.status, "in_progress")));

    const passRate = totalInspections?.count ? Math.round((passedInspections?.count || 0) / totalInspections.count * 100) : 0;

    return c.json({
      totalInspections: totalInspections?.count || 0,
      passedInspections: passedInspections?.count || 0,
      failedInspections: failedInspections?.count || 0,
      passRate,
      openNC: openNC?.count || 0,
      pendingActions: pendingActions?.count || 0,
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.post("/inspections", async (c) => {
  try {
    const body = await c.req.json();
    const id = `insp_${nanoid(12)}`;
    const inspectionNumber = generateNumber("INS");

    await db.insert(qualityInspections).values({
      id, inspectionNumber,
      inspectionType: body.inspectionType || "routine",
      targetType: body.targetType || "product",
      targetId: body.targetId || null,
      productId: body.productId || null,
      standardId: body.standardId || null,
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : new Date(),
      status: "scheduled",
      inspectorId: body.inspectorId || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return c.json({ id, inspectionNumber }, 201);
  } catch (error) {
    console.error("Error creating inspection:", error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

app.patch("/inspections/:id/complete", async (c) => {
  try {
    const { id } = c.req.param();
    const body = await c.req.json();

    await db.update(qualityInspections).set({
      status: "completed",
      result: body.result,
      score: body.score || null,
      measurements: body.measurements || null,
      findings: body.findings || null,
      recommendations: body.recommendations || null,
      inspectedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(qualityInspections.id, id));

    // إنشاء عدم مطابقة إذا فشل الفحص
    if (body.result === "fail" && body.createNC) {
      const ncId = `nc_${nanoid(12)}`;
      await db.insert(nonConformances).values({
        id: ncId,
        ncNumber: generateNumber("NC"),
        title: body.ncTitle || "عدم مطابقة من الفحص",
        description: body.findings || null,
        sourceType: "inspection",
        sourceId: id,
        inspectionId: id,
        severity: body.severity || "minor",
        productId: body.productId || null,
        status: "open",
        reportedBy: body.inspectorId || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    return c.json({ success: true });
  } catch (error) {
    console.error("Error completing inspection:", error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

// عدم المطابقة
app.get("/non-conformances", async (c) => {
  try {
    const { status, severity, page = "1", limit = "20" } = c.req.query();
    const conditions = [];
    if (status) conditions.push(eq(nonConformances.status, status));
    if (severity) conditions.push(eq(nonConformances.severity, severity));

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    const result = await db.select().from(nonConformances)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(nonConformances.detectedAt))
      .limit(limitNum).offset((pageNum - 1) * limitNum);

    return c.json(result);
  } catch (error) {
    console.error("Error fetching non-conformances:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.post("/non-conformances", async (c) => {
  try {
    const body = await c.req.json();
    const id = `nc_${nanoid(12)}`;
    const ncNumber = generateNumber("NC");

    await db.insert(nonConformances).values({
      id, ncNumber,
      title: body.title,
      description: body.description || null,
      sourceType: body.sourceType || "internal",
      category: body.category || null,
      severity: body.severity || "minor",
      productId: body.productId || null,
      affectedQuantity: body.affectedQuantity || null,
      status: "open",
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      reportedBy: body.reportedBy || null,
      assignedTo: body.assignedTo || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return c.json({ id, ncNumber }, 201);
  } catch (error) {
    console.error("Error creating non-conformance:", error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

app.patch("/non-conformances/:id", async (c) => {
  try {
    const { id } = c.req.param();
    const body = await c.req.json();

    const updates: any = { ...body, updatedAt: new Date() };
    if (body.status === "closed") updates.closedAt = new Date();

    await db.update(nonConformances).set(updates).where(eq(nonConformances.id, id));

    return c.json({ success: true });
  } catch (error) {
    console.error("Error updating non-conformance:", error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

// الإجراءات التصحيحية
app.get("/corrective-actions", async (c) => {
  try {
    const { status, type } = c.req.query();
    const conditions = [];
    if (status) conditions.push(eq(correctiveActions.status, status));
    if (type) conditions.push(eq(correctiveActions.actionType, type));

    const result = await db.select().from(correctiveActions)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(correctiveActions.targetDate);

    return c.json(result);
  } catch (error) {
    console.error("Error fetching corrective actions:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.post("/corrective-actions", async (c) => {
  try {
    const body = await c.req.json();
    const id = `ca_${nanoid(12)}`;
    const caNumber = generateNumber("CA");

    await db.insert(correctiveActions).values({
      id, caNumber,
      nonConformanceId: body.nonConformanceId || null,
      title: body.title,
      description: body.description || null,
      actionType: body.actionType || "corrective",
      steps: body.steps || null,
      status: "planned",
      priority: body.priority || "medium",
      startDate: body.startDate ? new Date(body.startDate) : null,
      targetDate: body.targetDate ? new Date(body.targetDate) : null,
      assignedTo: body.assignedTo || null,
      createdBy: body.createdBy || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return c.json({ id, caNumber }, 201);
  } catch (error) {
    console.error("Error creating corrective action:", error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

app.patch("/corrective-actions/:id/complete", async (c) => {
  try {
    const { id } = c.req.param();
    const body = await c.req.json();

    await db.update(correctiveActions).set({
      status: "completed",
      completedAt: new Date(),
      verificationMethod: body.verificationMethod || null,
      updatedAt: new Date(),
    }).where(eq(correctiveActions.id, id));

    return c.json({ success: true });
  } catch (error) {
    console.error("Error completing corrective action:", error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

app.patch("/corrective-actions/:id/verify", async (c) => {
  try {
    const { id } = c.req.param();
    const { verificationResult, effectiveness, verifiedBy } = await c.req.json();

    await db.update(correctiveActions).set({
      status: "verified",
      verifiedAt: new Date(),
      verificationResult: verificationResult || null,
      effectiveness: effectiveness || null,
      verifiedBy: verifiedBy || null,
      updatedAt: new Date(),
    }).where(eq(correctiveActions.id, id));

    return c.json({ success: true });
  } catch (error) {
    console.error("Error verifying corrective action:", error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

// التدقيقات
app.get("/audits", async (c) => {
  try {
    const { type, status } = c.req.query();
    const conditions = [];
    if (type) conditions.push(eq(qualityAudits.auditType, type));
    if (status) conditions.push(eq(qualityAudits.status, status));

    const result = await db.select().from(qualityAudits)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(qualityAudits.plannedDate));

    return c.json(result);
  } catch (error) {
    console.error("Error fetching audits:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.post("/audits", async (c) => {
  try {
    const body = await c.req.json();
    const id = `aud_${nanoid(12)}`;
    const auditNumber = generateNumber("AUD");

    await db.insert(qualityAudits).values({
      id, auditNumber,
      title: body.title,
      description: body.description || null,
      auditType: body.auditType || "internal",
      scope: body.scope || null,
      departmentId: body.departmentId || null,
      branchId: body.branchId || null,
      plannedDate: body.plannedDate ? new Date(body.plannedDate) : null,
      leadAuditorId: body.leadAuditorId || null,
      auditTeam: body.auditTeam || null,
      status: "planned",
      createdBy: body.createdBy || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return c.json({ id, auditNumber }, 201);
  } catch (error) {
    console.error("Error creating audit:", error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

export default app;

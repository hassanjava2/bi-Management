/**
 * API Routes - نظام الأهداف ومؤشرات الأداء
 */
import { Hono } from "hono";
import { db, kpis, goals, kpiValues, goalUpdates } from "@bi-management/database";
import { eq, and, or, desc, count, like, gte, lte } from "drizzle-orm";
import { nanoid } from "nanoid";
import { authMiddleware } from "../lib/auth.js";

const app = new Hono();

// ============== مؤشرات الأداء ==============

app.get("/", async (c) => {
  try {
    const { category, active } = c.req.query();
    const conditions = [];
    if (category) conditions.push(eq(kpis.category, category));
    if (active !== "false") conditions.push(eq(kpis.isActive, true));

    const result = await db.select().from(kpis)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(kpis.category, kpis.name);

    return c.json({ kpis: result });
  } catch (error) {
    return c.json({ error: "فشل" }, 500);
  }
});

app.get("/stats", async (c) => {
  try {
    const [totalKpis] = await db.select({ count: count() }).from(kpis).where(eq(kpis.isActive, true));
    const [totalGoals] = await db.select({ count: count() }).from(goals);

    const goalStatusStats = await db.select({ status: goals.status, count: count() })
      .from(goals).groupBy(goals.status);

    const categoryStats = await db.select({ category: kpis.category, count: count() })
      .from(kpis).where(eq(kpis.isActive, true)).groupBy(kpis.category);

    return c.json({
      totalKpis: totalKpis?.count || 0,
      totalGoals: totalGoals?.count || 0,
      goalsByStatus: goalStatusStats.reduce((acc, s) => ({ ...acc, [s.status || "on_track"]: s.count }), {}),
      kpisByCategory: categoryStats.reduce((acc, s) => ({ ...acc, [s.category || "sales"]: s.count }), {}),
    });
  } catch (error) {
    return c.json({ error: "فشل" }, 500);
  }
});

app.get("/:id", async (c) => {
  try {
    const { id } = c.req.param();
    const [kpi] = await db.select().from(kpis).where(eq(kpis.id, id));
    if (!kpi) return c.json({ error: "المؤشر غير موجود" }, 404);

    const values = await db.select().from(kpiValues)
      .where(eq(kpiValues.kpiId, id))
      .orderBy(desc(kpiValues.periodDate))
      .limit(30);

    return c.json({ ...kpi, values });
  } catch (error) {
    return c.json({ error: "فشل" }, 500);
  }
});

app.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const id = `kpi_${nanoid(12)}`;

    await db.insert(kpis).values({
      id,
      name: body.name,
      nameEn: body.nameEn || null,
      description: body.description || null,
      category: body.category || "sales",
      kpiType: body.kpiType || "value",
      unit: body.unit || null,
      calculationMethod: body.calculationMethod || null,
      formula: body.formula || null,
      dataSource: body.dataSource || null,
      direction: body.direction || "higher_is_better",
      updateFrequency: body.updateFrequency || "daily",
      createdBy: body.createdBy || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return c.json({ id }, 201);
  } catch (error) {
    return c.json({ error: "فشل" }, 500);
  }
});

app.post("/:id/values", async (c) => {
  try {
    const { id: kpiId } = c.req.param();
    const body = await c.req.json();
    const id = `kv_${nanoid(12)}`;

    await db.insert(kpiValues).values({
      id, kpiId,
      branchId: body.branchId || null,
      departmentId: body.departmentId || null,
      userId: body.userId || null,
      value: body.value,
      previousValue: body.previousValue || null,
      changePercentage: body.changePercentage || null,
      periodType: body.periodType || "daily",
      periodDate: new Date(body.periodDate || Date.now()),
      breakdown: body.breakdown || null,
      calculatedAt: new Date(),
    });

    await db.update(kpis).set({ lastCalculatedAt: new Date(), updatedAt: new Date() }).where(eq(kpis.id, kpiId));

    return c.json({ id }, 201);
  } catch (error) {
    return c.json({ error: "فشل" }, 500);
  }
});

// ============== الأهداف ==============

app.get("/goals", async (c) => {
  try {
    const { status, scope, userId, period, page = "1", limit = "20" } = c.req.query();
    const conditions = [];
    if (status) conditions.push(eq(goals.status, status));
    if (scope) conditions.push(eq(goals.scope, scope));
    if (userId) conditions.push(eq(goals.userId, userId));

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    const result = await db.select().from(goals)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(goals.startDate))
      .limit(limitNum).offset((pageNum - 1) * limitNum);

    return c.json({ goals: result });
  } catch (error) {
    return c.json({ error: "فشل" }, 500);
  }
});

app.get("/goals/:id", async (c) => {
  try {
    const { id } = c.req.param();
    const [goal] = await db.select().from(goals).where(eq(goals.id, id));
    if (!goal) return c.json({ error: "الهدف غير موجود" }, 404);

    const updates = await db.select().from(goalUpdates)
      .where(eq(goalUpdates.goalId, id))
      .orderBy(desc(goalUpdates.createdAt));

    return c.json({ ...goal, updates });
  } catch (error) {
    return c.json({ error: "فشل" }, 500);
  }
});

app.post("/goals", async (c) => {
  try {
    const body = await c.req.json();
    const id = `goal_${nanoid(12)}`;

    await db.insert(goals).values({
      id,
      name: body.name,
      description: body.description || null,
      kpiId: body.kpiId || null,
      scope: body.scope || "company",
      branchId: body.branchId || null,
      departmentId: body.departmentId || null,
      userId: body.userId || null,
      period: body.period || "monthly",
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
      targetValue: body.targetValue,
      currentValue: body.currentValue || "0",
      startingValue: body.startingValue || "0",
      minThreshold: body.minThreshold || null,
      stretchTarget: body.stretchTarget || null,
      status: "not_started",
      priority: body.priority || "medium",
      notes: body.notes || null,
      createdBy: body.createdBy || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return c.json({ id }, 201);
  } catch (error) {
    return c.json({ error: "فشل" }, 500);
  }
});

app.post("/goals/:id/update", async (c) => {
  try {
    const { id } = c.req.param();
    const body = await c.req.json();

    const [goal] = await db.select().from(goals).where(eq(goals.id, id));
    if (!goal) return c.json({ error: "الهدف غير موجود" }, 404);

    const target = parseFloat(goal.targetValue);
    const current = parseFloat(body.currentValue);
    const starting = parseFloat(goal.startingValue || "0");
    const progress = target > starting ? Math.round(((current - starting) / (target - starting)) * 100) : 0;

    let status = "on_track";
    if (progress >= 100) status = current > target ? "exceeded" : "achieved";
    else if (progress < 50) status = "behind";
    else if (progress < 75) status = "at_risk";

    await db.update(goals).set({
      currentValue: body.currentValue,
      progressPercentage: Math.min(progress, 100),
      status,
      updatedAt: new Date(),
    }).where(eq(goals.id, id));

    await db.insert(goalUpdates).values({
      id: `gu_${nanoid(12)}`,
      goalId: id,
      previousValue: goal.currentValue,
      newValue: body.currentValue,
      progressPercentage: progress,
      previousStatus: goal.status,
      newStatus: status,
      notes: body.notes || null,
      updatedBy: body.updatedBy || null,
      createdAt: new Date(),
    });

    return c.json({ success: true, progress, status });
  } catch (error) {
    return c.json({ error: "فشل" }, 500);
  }
});

export default app;

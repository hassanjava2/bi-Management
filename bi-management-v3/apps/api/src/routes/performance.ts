/**
 * API Routes - نظام تقييم الأداء
 */
import { Hono } from "hono";
import { db, evaluationCycles, evaluationCriteria, performanceReviews, criteriaScores, performanceGoals, performanceNotes } from "@bi-management/database";
import { eq, and, or, desc, count, gte, lte } from "drizzle-orm";
import { nanoid } from "nanoid";
import { authMiddleware } from "../lib/auth.js";

const app = new Hono();

// دورات التقييم
app.get("/cycles", async (c) => {
  try {
    const { status, year } = c.req.query();
    const conditions = [];
    if (status) conditions.push(eq(evaluationCycles.status, status));
    if (year) conditions.push(eq(evaluationCycles.year, parseInt(year)));

    const result = await db.select().from(evaluationCycles)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(evaluationCycles.startDate));

    return c.json(result);
  } catch (error) {
    console.error("Error fetching cycles:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.get("/stats", async (c) => {
  try {
    const [totalCycles] = await db.select({ count: count() }).from(evaluationCycles);
    const [activeCycles] = await db.select({ count: count() }).from(evaluationCycles).where(eq(evaluationCycles.status, "active"));
    const [totalReviews] = await db.select({ count: count() }).from(performanceReviews);
    const [pendingReviews] = await db.select({ count: count() }).from(performanceReviews).where(eq(performanceReviews.status, "pending"));
    const [completedReviews] = await db.select({ count: count() }).from(performanceReviews).where(eq(performanceReviews.status, "approved"));
    const [totalGoals] = await db.select({ count: count() }).from(performanceGoals);
    const [completedGoals] = await db.select({ count: count() }).from(performanceGoals).where(eq(performanceGoals.status, "completed"));

    return c.json({
      totalCycles: totalCycles?.count || 0,
      activeCycles: activeCycles?.count || 0,
      totalReviews: totalReviews?.count || 0,
      pendingReviews: pendingReviews?.count || 0,
      completedReviews: completedReviews?.count || 0,
      totalGoals: totalGoals?.count || 0,
      completedGoals: completedGoals?.count || 0,
      goalsCompletionRate: totalGoals?.count ? Math.round((completedGoals?.count || 0) / totalGoals.count * 100) : 0,
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.get("/cycles/:id", async (c) => {
  try {
    const { id } = c.req.param();
    const [cycle] = await db.select().from(evaluationCycles).where(eq(evaluationCycles.id, id));
    if (!cycle) return c.json({ error: "الدورة غير موجودة" }, 404);

    const reviews = await db.select().from(performanceReviews)
      .where(eq(performanceReviews.cycleId, id));

    const statusCounts = {
      pending: reviews.filter(r => r.status === "pending").length,
      in_progress: reviews.filter(r => r.status === "in_progress").length,
      submitted: reviews.filter(r => r.status === "submitted").length,
      approved: reviews.filter(r => r.status === "approved").length,
    };

    return c.json({ ...cycle, reviews, statusCounts });
  } catch (error) {
    console.error("Error fetching cycle:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.post("/cycles", async (c) => {
  try {
    const body = await c.req.json();
    const id = `cyc_${nanoid(12)}`;

    await db.insert(evaluationCycles).values({
      id,
      name: body.name,
      description: body.description || null,
      cycleType: body.cycleType || "annual",
      year: body.year || new Date().getFullYear(),
      quarter: body.quarter || null,
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
      reviewDeadline: body.reviewDeadline ? new Date(body.reviewDeadline) : null,
      status: "draft",
      selfReviewEnabled: body.selfReviewEnabled ?? true,
      managerReviewEnabled: body.managerReviewEnabled ?? true,
      peerReviewEnabled: body.peerReviewEnabled ?? false,
      goalsWeight: body.goalsWeight || 50,
      competenciesWeight: body.competenciesWeight || 50,
      createdBy: body.createdBy || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return c.json({ id }, 201);
  } catch (error) {
    console.error("Error creating cycle:", error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

app.patch("/cycles/:id/activate", async (c) => {
  try {
    const { id } = c.req.param();
    await db.update(evaluationCycles).set({
      status: "active",
      updatedAt: new Date(),
    }).where(eq(evaluationCycles.id, id));
    return c.json({ success: true });
  } catch (error) {
    console.error("Error activating cycle:", error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

// معايير التقييم
app.get("/criteria", async (c) => {
  try {
    const { category, departmentId } = c.req.query();
    const conditions = [eq(evaluationCriteria.isActive, true)];
    if (category) conditions.push(eq(evaluationCriteria.category, category));
    if (departmentId) conditions.push(eq(evaluationCriteria.departmentId, departmentId));

    const result = await db.select().from(evaluationCriteria)
      .where(and(...conditions))
      .orderBy(evaluationCriteria.sortOrder);

    return c.json(result);
  } catch (error) {
    console.error("Error fetching criteria:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.post("/criteria", async (c) => {
  try {
    const body = await c.req.json();
    const id = `crt_${nanoid(12)}`;

    await db.insert(evaluationCriteria).values({
      id,
      name: body.name,
      nameEn: body.nameEn || null,
      description: body.description || null,
      category: body.category || "competency",
      weight: body.weight || 1,
      maxScore: body.maxScore || 5,
      departmentId: body.departmentId || null,
      sortOrder: body.sortOrder || 0,
      createdAt: new Date(),
    });

    return c.json({ id }, 201);
  } catch (error) {
    console.error("Error creating criteria:", error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

// التقييمات
app.get("/reviews", async (c) => {
  try {
    const { cycleId, employeeId, reviewerId, status, page = "1", limit = "20" } = c.req.query();
    const conditions = [];
    if (cycleId) conditions.push(eq(performanceReviews.cycleId, cycleId));
    if (employeeId) conditions.push(eq(performanceReviews.employeeId, employeeId));
    if (reviewerId) conditions.push(eq(performanceReviews.reviewerId, reviewerId));
    if (status) conditions.push(eq(performanceReviews.status, status));

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    const result = await db.select().from(performanceReviews)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(performanceReviews.createdAt))
      .limit(limitNum).offset((pageNum - 1) * limitNum);

    return c.json(result);
  } catch (error) {
    console.error("Error fetching reviews:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.get("/reviews/:id", async (c) => {
  try {
    const { id } = c.req.param();
    const [review] = await db.select().from(performanceReviews).where(eq(performanceReviews.id, id));
    if (!review) return c.json({ error: "التقييم غير موجود" }, 404);

    const scores = await db.select().from(criteriaScores).where(eq(criteriaScores.reviewId, id));

    return c.json({ ...review, criteriaScores: scores });
  } catch (error) {
    console.error("Error fetching review:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.post("/reviews", async (c) => {
  try {
    const body = await c.req.json();
    const id = `rev_${nanoid(12)}`;

    await db.insert(performanceReviews).values({
      id,
      cycleId: body.cycleId,
      employeeId: body.employeeId,
      reviewerId: body.reviewerId || null,
      reviewType: body.reviewType || "manager",
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return c.json({ id }, 201);
  } catch (error) {
    console.error("Error creating review:", error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

app.patch("/reviews/:id", async (c) => {
  try {
    const { id } = c.req.param();
    const body = await c.req.json();

    await db.update(performanceReviews).set({
      ...body,
      updatedAt: new Date(),
    }).where(eq(performanceReviews.id, id));

    return c.json({ success: true });
  } catch (error) {
    console.error("Error updating review:", error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

app.post("/reviews/:id/submit", async (c) => {
  try {
    const { id } = c.req.param();
    await db.update(performanceReviews).set({
      status: "submitted",
      submittedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(performanceReviews.id, id));
    return c.json({ success: true });
  } catch (error) {
    console.error("Error submitting review:", error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

app.post("/reviews/:id/approve", async (c) => {
  try {
    const { id } = c.req.param();
    await db.update(performanceReviews).set({
      status: "approved",
      approvedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(performanceReviews.id, id));
    return c.json({ success: true });
  } catch (error) {
    console.error("Error approving review:", error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

// الأهداف
app.get("/goals", async (c) => {
  try {
    const { employeeId, cycleId, status } = c.req.query();
    const conditions = [];
    if (employeeId) conditions.push(eq(performanceGoals.employeeId, employeeId));
    if (cycleId) conditions.push(eq(performanceGoals.cycleId, cycleId));
    if (status) conditions.push(eq(performanceGoals.status, status));

    const result = await db.select().from(performanceGoals)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(performanceGoals.dueDate);

    return c.json(result);
  } catch (error) {
    console.error("Error fetching goals:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.post("/goals", async (c) => {
  try {
    const body = await c.req.json();
    const id = `goal_${nanoid(12)}`;

    await db.insert(performanceGoals).values({
      id,
      cycleId: body.cycleId || null,
      employeeId: body.employeeId,
      title: body.title,
      description: body.description || null,
      measureType: body.measureType || "quantitative",
      targetValue: body.targetValue || null,
      unit: body.unit || null,
      weight: body.weight || 1,
      startDate: body.startDate ? new Date(body.startDate) : null,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      status: "not_started",
      createdBy: body.createdBy || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return c.json({ id }, 201);
  } catch (error) {
    console.error("Error creating goal:", error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

app.patch("/goals/:id/progress", async (c) => {
  try {
    const { id } = c.req.param();
    const { currentValue, progress, status } = await c.req.json();

    const [goal] = await db.select().from(performanceGoals).where(eq(performanceGoals.id, id));
    if (!goal) return c.json({ error: "الهدف غير موجود" }, 404);

    let achievementPercentage = progress;
    if (goal.targetValue && currentValue) {
      achievementPercentage = Math.round((currentValue / Number(goal.targetValue)) * 100);
    }

    await db.update(performanceGoals).set({
      currentValue: currentValue || null,
      progress: progress || achievementPercentage,
      achievementPercentage,
      status: status || (achievementPercentage >= 100 ? "completed" : "in_progress"),
      updatedAt: new Date(),
    }).where(eq(performanceGoals.id, id));

    return c.json({ success: true, achievementPercentage });
  } catch (error) {
    console.error("Error updating goal progress:", error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

// ملاحظات الأداء
app.get("/notes/:employeeId", async (c) => {
  try {
    const { employeeId } = c.req.param();
    const notes = await db.select().from(performanceNotes)
      .where(eq(performanceNotes.employeeId, employeeId))
      .orderBy(desc(performanceNotes.createdAt));
    return c.json(notes);
  } catch (error) {
    console.error("Error fetching notes:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.post("/notes", async (c) => {
  try {
    const body = await c.req.json();
    const id = `note_${nanoid(12)}`;

    await db.insert(performanceNotes).values({
      id,
      employeeId: body.employeeId,
      noteType: body.noteType || "general",
      content: body.content,
      isPrivate: body.isPrivate || false,
      visibleToEmployee: body.visibleToEmployee || false,
      relatedGoalId: body.relatedGoalId || null,
      createdBy: body.createdBy || null,
      createdAt: new Date(),
    });

    return c.json({ id }, 201);
  } catch (error) {
    console.error("Error creating note:", error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

export default app;

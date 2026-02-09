/**
 * API Routes - نظام الميزانية والتخطيط المالي
 */
import { Hono } from "hono";
import { db, budgets, budgetItems, budgetExpenses, budgetRequests, budgetAlerts } from "@bi-management/database";
import { eq, and, or, desc, count, sum, like, gte, lte } from "drizzle-orm";
import { nanoid } from "nanoid";
import { authMiddleware } from "../lib/auth.js";

const app = new Hono();

// توليد رقم طلب
async function generateRequestNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `BR-${year}-`;
  const [last] = await db.select({ requestNumber: budgetRequests.requestNumber })
    .from(budgetRequests).where(like(budgetRequests.requestNumber, `${prefix}%`))
    .orderBy(desc(budgetRequests.requestNumber)).limit(1);
  let nextNum = 1;
  if (last?.requestNumber) {
    const num = parseInt(last.requestNumber.replace(prefix, ""), 10);
    if (!isNaN(num)) nextNum = num + 1;
  }
  return `${prefix}${String(nextNum).padStart(4, "0")}`;
}

// تحديث إجمالي الصرف
async function updateBudgetTotals(budgetId: string) {
  const [totals] = await db.select({
    totalSpent: sum(budgetExpenses.amount),
  }).from(budgetExpenses).where(eq(budgetExpenses.budgetId, budgetId));

  await db.update(budgets).set({
    totalSpent: totals?.totalSpent || "0",
    updatedAt: new Date(),
  }).where(eq(budgets.id, budgetId));
}

// ============== الميزانيات ==============

app.get("/", async (c) => {
  try {
    const { status, year, page = "1", limit = "20" } = c.req.query();
    const conditions = [];
    if (status) conditions.push(eq(budgets.status, status));
    if (year) conditions.push(eq(budgets.fiscalYear, parseInt(year)));

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    const result = await db.select().from(budgets)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(budgets.fiscalYear), desc(budgets.createdAt))
      .limit(limitNum).offset((pageNum - 1) * limitNum);

    return c.json({ budgets: result });
  } catch (error) {
    return c.json({ error: "فشل في جلب الميزانيات" }, 500);
  }
});

app.get("/stats", async (c) => {
  try {
    const year = new Date().getFullYear();
    const [activeBudget] = await db.select().from(budgets)
      .where(and(eq(budgets.fiscalYear, year), eq(budgets.status, "active")));

    const statusStats = await db.select({ status: budgets.status, count: count() })
      .from(budgets).groupBy(budgets.status);

    return c.json({
      activeBudget,
      byStatus: statusStats.reduce((acc, s) => ({ ...acc, [s.status || "unknown"]: s.count }), {}),
    });
  } catch (error) {
    return c.json({ error: "فشل" }, 500);
  }
});

app.get("/:id", async (c) => {
  try {
    const { id } = c.req.param();
    const [budget] = await db.select().from(budgets).where(eq(budgets.id, id));
    if (!budget) return c.json({ error: "الميزانية غير موجودة" }, 404);

    const [items, expenses, alerts] = await Promise.all([
      db.select().from(budgetItems).where(eq(budgetItems.budgetId, id)),
      db.select().from(budgetExpenses).where(eq(budgetExpenses.budgetId, id)).orderBy(desc(budgetExpenses.expenseDate)).limit(50),
      db.select().from(budgetAlerts).where(and(eq(budgetAlerts.budgetId, id), eq(budgetAlerts.isResolved, false))),
    ]);

    return c.json({ ...budget, items, expenses, alerts });
  } catch (error) {
    return c.json({ error: "فشل" }, 500);
  }
});

app.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const id = `bdg_${nanoid(12)}`;

    await db.insert(budgets).values({
      id,
      name: body.name,
      description: body.description || null,
      fiscalYear: body.fiscalYear,
      period: body.period || "yearly",
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
      scope: body.scope || "company",
      branchId: body.branchId || null,
      departmentId: body.departmentId || null,
      totalBudget: body.totalBudget,
      status: "draft",
      notes: body.notes || null,
      createdBy: body.createdBy || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    if (body.items?.length > 0) {
      const itemsData = body.items.map((item: any) => ({
        id: `bi_${nanoid(12)}`,
        budgetId: id,
        category: item.category,
        subcategory: item.subcategory || null,
        name: item.name,
        description: item.description || null,
        budgetedAmount: item.budgetedAmount,
        priority: item.priority || "medium",
        monthlyBreakdown: item.monthlyBreakdown || null,
        createdAt: new Date(),
      }));
      await db.insert(budgetItems).values(itemsData);
    }

    return c.json({ id }, 201);
  } catch (error) {
    console.error("Create budget error:", error);
    return c.json({ error: "فشل في إنشاء الميزانية" }, 500);
  }
});

app.post("/:id/status", async (c) => {
  try {
    const { id } = c.req.param();
    const { status, approvedBy } = await c.req.json();

    const updates: any = { status, updatedAt: new Date() };
    if (status === "approved") {
      updates.approvedBy = approvedBy;
      updates.approvedAt = new Date();
    }

    await db.update(budgets).set(updates).where(eq(budgets.id, id));
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: "فشل" }, 500);
  }
});

// ============== بنود الميزانية ==============

app.post("/:budgetId/items", async (c) => {
  try {
    const { budgetId } = c.req.param();
    const body = await c.req.json();
    const id = `bi_${nanoid(12)}`;

    await db.insert(budgetItems).values({
      id, budgetId,
      category: body.category,
      subcategory: body.subcategory || null,
      name: body.name,
      description: body.description || null,
      budgetedAmount: body.budgetedAmount,
      priority: body.priority || "medium",
      createdAt: new Date(),
    });

    return c.json({ id }, 201);
  } catch (error) {
    return c.json({ error: "فشل" }, 500);
  }
});

// ============== المصروفات ==============

app.post("/:budgetId/expenses", async (c) => {
  try {
    const { budgetId } = c.req.param();
    const body = await c.req.json();
    const id = `be_${nanoid(12)}`;

    await db.insert(budgetExpenses).values({
      id, budgetId,
      budgetItemId: body.budgetItemId || null,
      description: body.description,
      amount: body.amount,
      expenseDate: new Date(body.expenseDate),
      referenceType: body.referenceType || null,
      referenceId: body.referenceId || null,
      referenceNumber: body.referenceNumber || null,
      recordedBy: body.recordedBy || null,
      createdAt: new Date(),
    });

    await updateBudgetTotals(budgetId);

    // فحص تجاوز الحد
    const [budget] = await db.select().from(budgets).where(eq(budgets.id, budgetId));
    if (budget) {
      const spentPercent = (parseFloat(budget.totalSpent || "0") / parseFloat(budget.totalBudget)) * 100;
      if (spentPercent >= 80 && spentPercent < 95) {
        await db.insert(budgetAlerts).values({
          id: `ba_${nanoid(12)}`, budgetId,
          alertType: "threshold_reached",
          message: `تم صرف ${spentPercent.toFixed(1)}% من الميزانية`,
          severity: "warning",
          thresholdValue: "80",
          currentValue: String(spentPercent),
          createdAt: new Date(),
        });
      } else if (spentPercent >= 95) {
        await db.insert(budgetAlerts).values({
          id: `ba_${nanoid(12)}`, budgetId,
          alertType: "overspending",
          message: `تحذير: تم صرف ${spentPercent.toFixed(1)}% من الميزانية!`,
          severity: "critical",
          thresholdValue: "95",
          currentValue: String(spentPercent),
          createdAt: new Date(),
        });
      }
    }

    return c.json({ id }, 201);
  } catch (error) {
    return c.json({ error: "فشل" }, 500);
  }
});

// ============== طلبات الصرف ==============

app.get("/requests", async (c) => {
  try {
    const { status, budgetId, page = "1", limit = "20" } = c.req.query();
    const conditions = [];
    if (status) conditions.push(eq(budgetRequests.status, status));
    if (budgetId) conditions.push(eq(budgetRequests.budgetId, budgetId));

    const result = await db.select().from(budgetRequests)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(budgetRequests.createdAt))
      .limit(parseInt(limit)).offset((parseInt(page) - 1) * parseInt(limit));

    return c.json({ requests: result });
  } catch (error) {
    return c.json({ error: "فشل" }, 500);
  }
});

app.post("/requests", async (c) => {
  try {
    const body = await c.req.json();
    const id = `brq_${nanoid(12)}`;
    const requestNumber = await generateRequestNumber();

    await db.insert(budgetRequests).values({
      id, requestNumber,
      budgetId: body.budgetId,
      budgetItemId: body.budgetItemId || null,
      title: body.title,
      description: body.description || null,
      amount: body.amount,
      justification: body.justification || null,
      urgency: body.urgency || "normal",
      status: "pending",
      requestedBy: body.requestedBy || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return c.json({ id, requestNumber }, 201);
  } catch (error) {
    return c.json({ error: "فشل" }, 500);
  }
});

app.post("/requests/:id/approve", async (c) => {
  try {
    const { id } = c.req.param();
    const { status, approvedAmount, approverId, comment } = await c.req.json();

    const [request] = await db.select().from(budgetRequests).where(eq(budgetRequests.id, id));
    if (!request) return c.json({ error: "الطلب غير موجود" }, 404);

    const approvals = (request.approvals as any[] || []);
    approvals.push({
      level: approvals.length + 1,
      approverId,
      status,
      comment,
      date: new Date().toISOString(),
    });

    await db.update(budgetRequests).set({
      status,
      approvedAmount: status === "approved" ? (approvedAmount || request.amount) : null,
      approvals,
      updatedAt: new Date(),
    }).where(eq(budgetRequests.id, id));

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: "فشل" }, 500);
  }
});

export default app;

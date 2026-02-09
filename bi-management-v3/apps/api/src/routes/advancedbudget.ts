/**
 * API Routes - نظام إدارة الموازنات المتقدم
 */
import { Hono } from "hono";
import { db, budgetPlans, budgetLineItems, budgetCategories, budgetTransfers, budgetRequests, budgetActuals, budgetAlerts } from "@bi-management/database";
import { eq, and, or, desc, count, sum } from "drizzle-orm";
import { nanoid } from "nanoid";
import { authMiddleware } from "../lib/auth.js";

const app = new Hono();


const generateNumber = (prefix: string) => `${prefix}-${Date.now().toString(36).toUpperCase()}`;

// الموازنات
app.get("/plans", async (c) => {
  try {
    const { status, year, departmentId } = c.req.query();
    const conditions = [];
    if (status) conditions.push(eq(budgetPlans.status, status));
    if (year) conditions.push(eq(budgetPlans.fiscalYear, parseInt(year)));
    if (departmentId) conditions.push(eq(budgetPlans.departmentId, departmentId));

    const result = await db.select().from(budgetPlans)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(budgetPlans.createdAt));

    return c.json(result);
  } catch (error) {
    console.error("Error fetching budget plans:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.get("/stats", async (c) => {
  try {
    const [total] = await db.select({ count: count() }).from(budgetPlans);
    const [active] = await db.select({ count: count() }).from(budgetPlans)
      .where(eq(budgetPlans.status, "active"));
    const [draft] = await db.select({ count: count() }).from(budgetPlans)
      .where(eq(budgetPlans.status, "draft"));
    const [pendingApproval] = await db.select({ count: count() }).from(budgetPlans)
      .where(eq(budgetPlans.status, "pending_approval"));
    
    const [totalBudgeted] = await db.select({ sum: sum(budgetPlans.totalBudget) }).from(budgetPlans)
      .where(eq(budgetPlans.status, "active"));
    const [totalSpent] = await db.select({ sum: sum(budgetPlans.spentAmount) }).from(budgetPlans)
      .where(eq(budgetPlans.status, "active"));
    
    const [pendingRequests] = await db.select({ count: count() }).from(budgetRequests)
      .where(eq(budgetRequests.status, "pending"));
    
    const [activeAlerts] = await db.select({ count: count() }).from(budgetAlerts)
      .where(eq(budgetAlerts.status, "active"));

    return c.json({
      totalBudgets: total?.count || 0,
      activeBudgets: active?.count || 0,
      draftBudgets: draft?.count || 0,
      pendingApproval: pendingApproval?.count || 0,
      totalBudgeted: totalBudgeted?.sum || 0,
      totalSpent: totalSpent?.sum || 0,
      utilizationRate: totalBudgeted?.sum ? Math.round((Number(totalSpent?.sum || 0) / Number(totalBudgeted.sum)) * 100) : 0,
      pendingRequests: pendingRequests?.count || 0,
      activeAlerts: activeAlerts?.count || 0,
    });
  } catch (error) {
    console.error("Error fetching budget stats:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.get("/plans/:id", async (c) => {
  try {
    const { id } = c.req.param();
    const [budget] = await db.select().from(budgetPlans).where(eq(budgetPlans.id, id));
    if (!budget) return c.json({ error: "الموازنة غير موجودة" }, 404);

    const lineItems = await db.select().from(budgetLineItems)
      .where(eq(budgetLineItems.budgetId, id))
      .orderBy(budgetLineItems.sortOrder);
    
    const actuals = await db.select().from(budgetActuals)
      .where(eq(budgetActuals.budgetId, id))
      .orderBy(desc(budgetActuals.transactionDate));
    
    const alerts = await db.select().from(budgetAlerts)
      .where(and(eq(budgetAlerts.budgetId, id), eq(budgetAlerts.status, "active")));

    return c.json({ ...budget, lineItems, actuals, alerts });
  } catch (error) {
    return c.json({ error: "فشل" }, 500);
  }
});

app.post("/plans", async (c) => {
  try {
    const body = await c.req.json();
    const id = `bdg_${nanoid(12)}`;
    const budgetNumber = generateNumber("BDG");

    await db.insert(budgetPlans).values({
      id, budgetNumber,
      name: body.name,
      description: body.description || null,
      budgetType: body.budgetType || "annual",
      fiscalYear: body.fiscalYear,
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
      departmentId: body.departmentId || null,
      branchId: body.branchId || null,
      projectId: body.projectId || null,
      totalBudget: body.totalBudget,
      allocatedAmount: "0",
      spentAmount: "0",
      remainingAmount: body.totalBudget,
      currency: body.currency || "IQD",
      status: "draft",
      allowOverspend: body.allowOverspend || false,
      overspendLimit: body.overspendLimit || null,
      alertThreshold: body.alertThreshold || 80,
      notes: body.notes || null,
      createdBy: body.createdBy || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return c.json({ id, budgetNumber }, 201);
  } catch (error) {
    console.error("Error in advancedbudget:", error);
    return c.json({ error: "فشل" }, 500);
  }
});

app.patch("/plans/:id/submit", async (c) => {
  try {
    const { id } = c.req.param();

    await db.update(budgetPlans).set({
      status: "pending_approval",
      updatedAt: new Date(),
    }).where(eq(budgetPlans.id, id));

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: "فشل" }, 500);
  }
});

app.patch("/plans/:id/approve", async (c) => {
  try {
    const { id } = c.req.param();
    const { approvedBy } = await c.req.json();

    await db.update(budgetPlans).set({
      status: "active",
      approvedBy: approvedBy || null,
      approvedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(budgetPlans.id, id));

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: "فشل" }, 500);
  }
});

app.patch("/plans/:id/freeze", async (c) => {
  try {
    const { id } = c.req.param();

    await db.update(budgetPlans).set({
      status: "frozen",
      updatedAt: new Date(),
    }).where(eq(budgetPlans.id, id));

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: "فشل" }, 500);
  }
});

// بنود الموازنة
app.post("/plans/:budgetId/items", async (c) => {
  try {
    const { budgetId } = c.req.param();
    const body = await c.req.json();
    const id = `bli_${nanoid(12)}`;

    await db.insert(budgetLineItems).values({
      id, budgetId,
      categoryId: body.categoryId || null,
      accountId: body.accountId || null,
      name: body.name,
      description: body.description || null,
      budgetedAmount: body.budgetedAmount,
      allocatedAmount: "0",
      spentAmount: "0",
      monthlyAllocation: body.monthlyAllocation || null,
      priority: body.priority || "medium",
      notes: body.notes || null,
      sortOrder: body.sortOrder || 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // تحديث المبلغ المخصص في الموازنة
    const [budget] = await db.select().from(budgetPlans).where(eq(budgetPlans.id, budgetId));
    if (budget) {
      const newAllocated = Number(budget.allocatedAmount || 0) + Number(body.budgetedAmount);
      await db.update(budgetPlans).set({
        allocatedAmount: newAllocated.toString(),
        remainingAmount: (Number(budget.totalBudget) - newAllocated).toString(),
        updatedAt: new Date(),
      }).where(eq(budgetPlans.id, budgetId));
    }

    return c.json({ id }, 201);
  } catch (error) {
    return c.json({ error: "فشل" }, 500);
  }
});

// الصرف الفعلي
app.post("/actuals", async (c) => {
  try {
    const body = await c.req.json();
    const id = `act_${nanoid(12)}`;

    await db.insert(budgetActuals).values({
      id,
      budgetId: body.budgetId,
      lineItemId: body.lineItemId || null,
      description: body.description,
      amount: body.amount,
      transactionDate: new Date(body.transactionDate),
      referenceType: body.referenceType || null,
      referenceId: body.referenceId || null,
      vendor: body.vendor || null,
      recordedBy: body.recordedBy || null,
      createdAt: new Date(),
    });

    // تحديث المبالغ المصروفة
    const [budget] = await db.select().from(budgetPlans).where(eq(budgetPlans.id, body.budgetId));
    if (budget) {
      const newSpent = Number(budget.spentAmount || 0) + Number(body.amount);
      await db.update(budgetPlans).set({
        spentAmount: newSpent.toString(),
        remainingAmount: (Number(budget.totalBudget) - newSpent).toString(),
        updatedAt: new Date(),
      }).where(eq(budgetPlans.id, body.budgetId));

      // التحقق من العتبة وإنشاء تنبيه
      const utilizationRate = (newSpent / Number(budget.totalBudget)) * 100;
      if (utilizationRate >= (budget.alertThreshold || 80)) {
        await db.insert(budgetAlerts).values({
          id: `alert_${nanoid(12)}`,
          budgetId: body.budgetId,
          lineItemId: body.lineItemId || null,
          alertType: "threshold",
          message: `تجاوزت الموازنة ${Math.round(utilizationRate)}% من المخصص`,
          threshold: budget.alertThreshold || 80,
          currentValue: newSpent.toString(),
          status: "active",
          createdAt: new Date(),
        });
      }
    }

    // تحديث البند
    if (body.lineItemId) {
      const [lineItem] = await db.select().from(budgetLineItems).where(eq(budgetLineItems.id, body.lineItemId));
      if (lineItem) {
        await db.update(budgetLineItems).set({
          spentAmount: (Number(lineItem.spentAmount || 0) + Number(body.amount)).toString(),
          updatedAt: new Date(),
        }).where(eq(budgetLineItems.id, body.lineItemId));
      }
    }

    return c.json({ id }, 201);
  } catch (error) {
    return c.json({ error: "فشل" }, 500);
  }
});

// طلبات التحويل
app.get("/transfers", async (c) => {
  try {
    const { status } = c.req.query();
    const conditions = [];
    if (status) conditions.push(eq(budgetTransfers.status, status));

    const result = await db.select().from(budgetTransfers)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(budgetTransfers.createdAt));

    return c.json(result);
  } catch (error) {
    console.error("Error in advancedbudget:", error);
    return c.json({ error: "فشل" }, 500);
  }
});

app.post("/transfers", async (c) => {
  try {
    const body = await c.req.json();
    const id = `tr_${nanoid(12)}`;
    const transferNumber = generateNumber("TR");

    await db.insert(budgetTransfers).values({
      id, transferNumber,
      fromBudgetId: body.fromBudgetId,
      fromLineItemId: body.fromLineItemId || null,
      toBudgetId: body.toBudgetId,
      toLineItemId: body.toLineItemId || null,
      amount: body.amount,
      reason: body.reason,
      status: "pending",
      requestedBy: body.requestedBy || null,
      createdAt: new Date(),
    });

    return c.json({ id, transferNumber }, 201);
  } catch (error) {
    console.error("Error in advancedbudget:", error);
    return c.json({ error: "فشل" }, 500);
  }
});

app.patch("/transfers/:id/approve", async (c) => {
  try {
    const { id } = c.req.param();
    const { approvedBy } = await c.req.json();

    const [transfer] = await db.select().from(budgetTransfers).where(eq(budgetTransfers.id, id));
    if (!transfer) return c.json({ error: "غير موجود" }, 404);

    // تنفيذ التحويل
    // خصم من المصدر
    if (transfer.fromLineItemId) {
      const [fromItem] = await db.select().from(budgetLineItems).where(eq(budgetLineItems.id, transfer.fromLineItemId));
      if (fromItem) {
        await db.update(budgetLineItems).set({
          budgetedAmount: (Number(fromItem.budgetedAmount) - Number(transfer.amount)).toString(),
          updatedAt: new Date(),
        }).where(eq(budgetLineItems.id, transfer.fromLineItemId));
      }
    }

    // إضافة للوجهة
    if (transfer.toLineItemId) {
      const [toItem] = await db.select().from(budgetLineItems).where(eq(budgetLineItems.id, transfer.toLineItemId));
      if (toItem) {
        await db.update(budgetLineItems).set({
          budgetedAmount: (Number(toItem.budgetedAmount) + Number(transfer.amount)).toString(),
          updatedAt: new Date(),
        }).where(eq(budgetLineItems.id, transfer.toLineItemId));
      }
    }

    await db.update(budgetTransfers).set({
      status: "completed",
      approvedBy: approvedBy || null,
      approvedAt: new Date(),
    }).where(eq(budgetTransfers.id, id));

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: "فشل" }, 500);
  }
});

// طلبات الزيادة
app.get("/requests", async (c) => {
  try {
    const { status } = c.req.query();
    const conditions = [];
    if (status) conditions.push(eq(budgetRequests.status, status));

    const result = await db.select().from(budgetRequests)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(budgetRequests.createdAt));

    return c.json(result);
  } catch (error) {
    console.error("Error in advancedbudget:", error);
    return c.json({ error: "فشل" }, 500);
  }
});

app.post("/requests", async (c) => {
  try {
    const body = await c.req.json();
    const id = `breq_${nanoid(12)}`;
    const requestNumber = generateNumber("BREQ");

    await db.insert(budgetRequests).values({
      id, requestNumber,
      budgetId: body.budgetId,
      lineItemId: body.lineItemId || null,
      requestType: body.requestType || "increase",
      currentAmount: body.currentAmount || null,
      requestedAmount: body.requestedAmount,
      justification: body.justification,
      attachments: body.attachments || null,
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

app.patch("/requests/:id/approve", async (c) => {
  try {
    const { id } = c.req.param();
    const { approvedBy, approvedAmount } = await c.req.json();

    const [request] = await db.select().from(budgetRequests).where(eq(budgetRequests.id, id));
    if (!request) return c.json({ error: "غير موجود" }, 404);

    await db.update(budgetRequests).set({
      status: "approved",
      approvedBy: approvedBy || null,
      approvedAt: new Date(),
      approvedAmount: approvedAmount || request.requestedAmount,
      updatedAt: new Date(),
    }).where(eq(budgetRequests.id, id));

    // تحديث الموازنة
    const finalAmount = approvedAmount || request.requestedAmount;
    if (request.lineItemId) {
      const [item] = await db.select().from(budgetLineItems).where(eq(budgetLineItems.id, request.lineItemId));
      if (item) {
        await db.update(budgetLineItems).set({
          budgetedAmount: (Number(item.budgetedAmount) + Number(finalAmount)).toString(),
          updatedAt: new Date(),
        }).where(eq(budgetLineItems.id, request.lineItemId));
      }
    }

    return c.json({ success: true });
  } catch (error) {
    console.error("Error in advancedbudget:", error);
    return c.json({ error: "فشل" }, 500);
  }
});

// الفئات
app.get("/categories", async (c) => {
  try {
    const result = await db.select().from(budgetCategories)
      .where(eq(budgetCategories.isActive, true))
      .orderBy(budgetCategories.sortOrder);
    return c.json(result);
  } catch (error) {
    console.error("Error in advancedbudget:", error);
    return c.json({ error: "فشل" }, 500);
  }
});

app.post("/categories", async (c) => {
  try {
    const body = await c.req.json();
    const id = `bcat_${nanoid(12)}`;

    await db.insert(budgetCategories).values({
      id,
      name: body.name,
      nameEn: body.nameEn || null,
      categoryType: body.categoryType || "expense",
      parentId: body.parentId || null,
      accountId: body.accountId || null,
      icon: body.icon || null,
      color: body.color || null,
      isActive: true,
      sortOrder: body.sortOrder || 0,
      createdAt: new Date(),
    });

    return c.json({ id }, 201);
  } catch (error) {
    console.error("Error in advancedbudget:", error);
    return c.json({ error: "فشل" }, 500);
  }
});

// التنبيهات
app.patch("/alerts/:id/acknowledge", async (c) => {
  try {
    const { id } = c.req.param();
    const { acknowledgedBy } = await c.req.json();

    await db.update(budgetAlerts).set({
      status: "acknowledged",
      acknowledgedBy: acknowledgedBy || null,
      acknowledgedAt: new Date(),
    }).where(eq(budgetAlerts.id, id));

    return c.json({ success: true });
  } catch (error) {
    console.error("Error acknowledging budget alert:", error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

export default app;

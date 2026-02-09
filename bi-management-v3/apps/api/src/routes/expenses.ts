/**
 * API Routes - نظام إدارة المصروفات
 */
import { Hono } from "hono";
import { db, expenseRequests, expenseApprovals, expenseCategories, cashAdvances } from "@bi-management/database";
import { eq, and, or, desc, count, sum, gte, lte } from "drizzle-orm";
import { nanoid } from "nanoid";
import { authMiddleware } from "../lib/auth.js";

const app = new Hono();

const generateNumber = (prefix: string) => `${prefix}-${Date.now().toString(36).toUpperCase()}`;

// طلبات المصروفات
app.get("/requests", async (c) => {
  try {
    const { status, category, requesterId, page = "1", limit = "20" } = c.req.query();
    const conditions = [];

    if (status) conditions.push(eq(expenseRequests.status, status));
    if (category) conditions.push(eq(expenseRequests.category, category));
    if (requesterId) conditions.push(eq(expenseRequests.requesterId, requesterId));

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    const result = await db.select().from(expenseRequests)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(expenseRequests.createdAt))
      .limit(limitNum).offset((pageNum - 1) * limitNum);

    const [total] = await db.select({ count: count() }).from(expenseRequests)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    return c.json({ expenses: result, pagination: { page: pageNum, limit: limitNum, total: total?.count || 0 } });
  } catch (error) {
    console.error("Error fetching expenses:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.get("/stats", async (c) => {
  try {
    const [totalRequests] = await db.select({ count: count() }).from(expenseRequests);
    const [pendingRequests] = await db.select({ count: count() }).from(expenseRequests)
      .where(or(eq(expenseRequests.status, "submitted"), eq(expenseRequests.status, "pending_approval")));
    const [approvedRequests] = await db.select({ count: count() }).from(expenseRequests)
      .where(eq(expenseRequests.status, "approved"));
    const [paidRequests] = await db.select({ count: count() }).from(expenseRequests)
      .where(eq(expenseRequests.status, "paid"));

    // مجموع المصروفات
    const totalAmount = await db.select({ 
      total: sum(expenseRequests.amount) 
    }).from(expenseRequests).where(eq(expenseRequests.status, "paid"));

    // مجموع المعلقة
    const pendingAmount = await db.select({ 
      total: sum(expenseRequests.amount) 
    }).from(expenseRequests).where(
      or(eq(expenseRequests.status, "submitted"), eq(expenseRequests.status, "pending_approval"))
    );

    // السلف النشطة
    const [activeAdvances] = await db.select({ count: count() }).from(cashAdvances)
      .where(eq(cashAdvances.status, "disbursed"));

    return c.json({
      totalRequests: totalRequests?.count || 0,
      pendingRequests: pendingRequests?.count || 0,
      approvedRequests: approvedRequests?.count || 0,
      paidRequests: paidRequests?.count || 0,
      totalPaidAmount: totalAmount[0]?.total || 0,
      pendingAmount: pendingAmount[0]?.total || 0,
      activeAdvances: activeAdvances?.count || 0,
    });
  } catch (error) {
    console.error("Error fetching expense stats:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.get("/requests/:id", async (c) => {
  try {
    const { id } = c.req.param();
    const [expense] = await db.select().from(expenseRequests).where(eq(expenseRequests.id, id));
    if (!expense) return c.json({ error: "الطلب غير موجود" }, 404);

    const approvals = await db.select().from(expenseApprovals)
      .where(eq(expenseApprovals.expenseId, id))
      .orderBy(expenseApprovals.approvalLevel);

    return c.json({ ...expense, approvals });
  } catch (error) {
    console.error("Error fetching expense request:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.post("/requests", async (c) => {
  try {
    const body = await c.req.json();
    const id = `exp_${nanoid(12)}`;
    const requestNumber = generateNumber("EXP");

    await db.insert(expenseRequests).values({
      id, requestNumber,
      requesterId: body.requesterId,
      departmentId: body.departmentId || null,
      branchId: body.branchId || null,
      title: body.title,
      description: body.description || null,
      category: body.category || "operational",
      amount: body.amount,
      currency: body.currency || "IQD",
      expenseDate: body.expenseDate ? new Date(body.expenseDate) : null,
      vendorName: body.vendorName || null,
      vendorInvoice: body.vendorInvoice || null,
      receipts: body.receipts || null,
      status: "draft",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return c.json({ id, requestNumber }, 201);
  } catch (error) {
    console.error("Error creating expense request:", error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

app.post("/requests/:id/submit", async (c) => {
  try {
    const { id } = c.req.param();

    await db.update(expenseRequests).set({
      status: "submitted",
      submittedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(expenseRequests.id, id));

    return c.json({ success: true });
  } catch (error) {
    console.error("Error submitting expense request:", error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

app.post("/requests/:id/approve", async (c) => {
  try {
    const { id } = c.req.param();
    const { approverId, comments } = await c.req.json();

    const [expense] = await db.select().from(expenseRequests).where(eq(expenseRequests.id, id));
    if (!expense) return c.json({ error: "الطلب غير موجود" }, 404);

    // تسجيل الموافقة
    await db.insert(expenseApprovals).values({
      id: `ea_${nanoid(12)}`,
      expenseId: id,
      approverId,
      approvalLevel: (expense.approvalLevel || 0) + 1,
      decision: "approved",
      comments: comments || null,
      decidedAt: new Date(),
    });

    // تحديث الطلب
    await db.update(expenseRequests).set({
      status: "approved",
      approvalLevel: (expense.approvalLevel || 0) + 1,
      updatedAt: new Date(),
    }).where(eq(expenseRequests.id, id));

    return c.json({ success: true });
  } catch (error) {
    console.error("Error approving expense request:", error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

app.post("/requests/:id/reject", async (c) => {
  try {
    const { id } = c.req.param();
    const { approverId, reason, comments } = await c.req.json();

    const [expense] = await db.select().from(expenseRequests).where(eq(expenseRequests.id, id));
    if (!expense) return c.json({ error: "الطلب غير موجود" }, 404);

    // تسجيل الرفض
    await db.insert(expenseApprovals).values({
      id: `ea_${nanoid(12)}`,
      expenseId: id,
      approverId,
      approvalLevel: (expense.approvalLevel || 0) + 1,
      decision: "rejected",
      comments: comments || reason || null,
      decidedAt: new Date(),
    });

    // تحديث الطلب
    await db.update(expenseRequests).set({
      status: "rejected",
      rejectionReason: reason || null,
      updatedAt: new Date(),
    }).where(eq(expenseRequests.id, id));

    return c.json({ success: true });
  } catch (error) {
    console.error("Error rejecting expense request:", error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

app.post("/requests/:id/pay", async (c) => {
  try {
    const { id } = c.req.param();
    const { paymentMethod, paymentReference } = await c.req.json();

    await db.update(expenseRequests).set({
      status: "paid",
      paymentMethod: paymentMethod || null,
      paymentReference: paymentReference || null,
      paidAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(expenseRequests.id, id));

    return c.json({ success: true });
  } catch (error) {
    console.error("Error paying expense request:", error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

// الفئات
app.get("/categories", async (c) => {
  try {
    const result = await db.select().from(expenseCategories)
      .where(eq(expenseCategories.isActive, true))
      .orderBy(expenseCategories.sortOrder);
    return c.json(result);
  } catch (error) {
    console.error("Error fetching expense categories:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.post("/categories", async (c) => {
  try {
    const body = await c.req.json();
    const id = `ec_${nanoid(12)}`;

    await db.insert(expenseCategories).values({
      id,
      name: body.name,
      nameEn: body.nameEn || null,
      description: body.description || null,
      parentId: body.parentId || null,
      monthlyLimit: body.monthlyLimit || null,
      requiresApproval: body.requiresApproval ?? true,
      approvalThreshold: body.approvalThreshold || null,
      accountCode: body.accountCode || null,
      sortOrder: body.sortOrder || 0,
      createdAt: new Date(),
    });

    return c.json({ id }, 201);
  } catch (error) {
    console.error("Error creating expense category:", error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

// السلف
app.get("/advances", async (c) => {
  try {
    const { status, employeeId } = c.req.query();
    const conditions = [];
    if (status) conditions.push(eq(cashAdvances.status, status));
    if (employeeId) conditions.push(eq(cashAdvances.employeeId, employeeId));

    const result = await db.select().from(cashAdvances)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(cashAdvances.createdAt));

    return c.json(result);
  } catch (error) {
    console.error("Error fetching cash advances:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.post("/advances", async (c) => {
  try {
    const body = await c.req.json();
    const id = `adv_${nanoid(12)}`;
    const advanceNumber = generateNumber("ADV");

    await db.insert(cashAdvances).values({
      id, advanceNumber,
      employeeId: body.employeeId,
      purpose: body.purpose,
      description: body.description || null,
      amount: body.amount,
      currency: body.currency || "IQD",
      status: "pending",
      remainingAmount: body.amount,
      settlementDeadline: body.settlementDeadline ? new Date(body.settlementDeadline) : null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return c.json({ id, advanceNumber }, 201);
  } catch (error) {
    console.error("Error creating cash advance:", error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

app.post("/advances/:id/approve", async (c) => {
  try {
    const { id } = c.req.param();
    const { approvedBy } = await c.req.json();

    await db.update(cashAdvances).set({
      status: "approved",
      approvedBy: approvedBy || null,
      approvedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(cashAdvances.id, id));

    return c.json({ success: true });
  } catch (error) {
    console.error("Error approving cash advance:", error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

app.post("/advances/:id/disburse", async (c) => {
  try {
    const { id } = c.req.param();
    const { disbursedBy } = await c.req.json();

    await db.update(cashAdvances).set({
      status: "disbursed",
      disbursedBy: disbursedBy || null,
      disbursedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(cashAdvances.id, id));

    return c.json({ success: true });
  } catch (error) {
    console.error("Error disbursing cash advance:", error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

app.post("/advances/:id/settle", async (c) => {
  try {
    const { id } = c.req.param();
    const { settledAmount } = await c.req.json();

    const [advance] = await db.select().from(cashAdvances).where(eq(cashAdvances.id, id));
    if (!advance) return c.json({ error: "السلفة غير موجودة" }, 404);

    const totalSettled = Number(advance.settledAmount || 0) + Number(settledAmount);
    const remaining = Number(advance.amount) - totalSettled;

    await db.update(cashAdvances).set({
      settledAmount: totalSettled.toString(),
      remainingAmount: remaining.toString(),
      status: remaining <= 0 ? "settled" : "disbursed",
      settledAt: remaining <= 0 ? new Date() : null,
      updatedAt: new Date(),
    }).where(eq(cashAdvances.id, id));

    return c.json({ success: true, remaining });
  } catch (error) {
    console.error("Error settling cash advance:", error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

export default app;

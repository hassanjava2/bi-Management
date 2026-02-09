/**
 * API Routes - نظام إدارة الشكاوى والاقتراحات
 */
import { Hono } from "hono";
import { db, complaints, complaintReplies, suggestions, complaintHistory, complaintCategories, satisfactionSurveys } from "@bi-management/database";
import { eq, and, or, desc, count, avg } from "drizzle-orm";
import { nanoid } from "nanoid";
import { authMiddleware } from "../lib/auth.js";

const app = new Hono();


const generateNumber = (prefix: string) => `${prefix}-${Date.now().toString(36).toUpperCase()}`;

// الشكاوى
app.get("/", async (c) => {
  try {
    const { status, category, priority, assignedTo } = c.req.query();
    const conditions = [];
    if (status) conditions.push(eq(complaints.status, status));
    if (category) conditions.push(eq(complaints.category, category));
    if (priority) conditions.push(eq(complaints.priority, priority));
    if (assignedTo) conditions.push(eq(complaints.assignedTo, assignedTo));

    const result = await db.select().from(complaints)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(complaints.createdAt));

    return c.json(result);
  } catch (error) {
    console.error("GET /complaints error:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.get("/stats", async (c) => {
  try {
    const [total] = await db.select({ count: count() }).from(complaints);
    const [newComplaints] = await db.select({ count: count() }).from(complaints)
      .where(eq(complaints.status, "new"));
    const [investigating] = await db.select({ count: count() }).from(complaints)
      .where(eq(complaints.status, "investigating"));
    const [resolved] = await db.select({ count: count() }).from(complaints)
      .where(eq(complaints.status, "resolved"));
    const [escalated] = await db.select({ count: count() }).from(complaints)
      .where(eq(complaints.status, "escalated"));
    
    const [slaBreach] = await db.select({ count: count() }).from(complaints)
      .where(eq(complaints.isSlaBreach, true));
    
    const [avgSatisfaction] = await db.select({ avg: avg(satisfactionSurveys.overallRating) })
      .from(satisfactionSurveys);
    
    // الاقتراحات
    const [totalSuggestions] = await db.select({ count: count() }).from(suggestions);
    const [acceptedSuggestions] = await db.select({ count: count() }).from(suggestions)
      .where(eq(suggestions.status, "accepted"));

    return c.json({
      totalComplaints: total?.count || 0,
      newComplaints: newComplaints?.count || 0,
      investigating: investigating?.count || 0,
      resolved: resolved?.count || 0,
      escalated: escalated?.count || 0,
      slaBreaches: slaBreach?.count || 0,
      avgSatisfaction: avgSatisfaction?.avg ? Number(avgSatisfaction.avg).toFixed(1) : "N/A",
      totalSuggestions: totalSuggestions?.count || 0,
      acceptedSuggestions: acceptedSuggestions?.count || 0,
    });
  } catch (error) {
    console.error("GET /complaints/stats error:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.get("/:id", async (c) => {
  try {
    const { id } = c.req.param();
    const [complaint] = await db.select().from(complaints).where(eq(complaints.id, id));
    if (!complaint) return c.json({ error: "الشكوى غير موجودة" }, 404);

    const replies = await db.select().from(complaintReplies)
      .where(eq(complaintReplies.complaintId, id))
      .orderBy(complaintReplies.createdAt);
    
    const history = await db.select().from(complaintHistory)
      .where(eq(complaintHistory.complaintId, id))
      .orderBy(desc(complaintHistory.createdAt));

    return c.json({ ...complaint, replies, history });
  } catch (error) {
    console.error("GET /complaints/:id error:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const id = `comp_${nanoid(12)}`;
    const complaintNumber = generateNumber("COMP");

    // حساب SLA
    const slaHours = body.priority === "urgent" ? 4 : body.priority === "high" ? 24 : 48;
    const slaDeadline = new Date(Date.now() + slaHours * 60 * 60 * 1000);

    await db.insert(complaints).values({
      id, complaintNumber,
      submitterType: body.submitterType || "customer",
      customerId: body.customerId || null,
      employeeId: body.employeeId || null,
      externalName: body.externalName || null,
      externalPhone: body.externalPhone || null,
      externalEmail: body.externalEmail || null,
      category: body.category || "service",
      subcategory: body.subcategory || null,
      subject: body.subject,
      description: body.description,
      priority: body.priority || "medium",
      relatedType: body.relatedType || null,
      relatedId: body.relatedId || null,
      departmentId: body.departmentId || null,
      branchId: body.branchId || null,
      status: "new",
      slaDeadline,
      attachments: body.attachments || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // تسجيل السجل
    await db.insert(complaintHistory).values({
      id: `ch_${nanoid(12)}`,
      complaintId: id,
      action: "created",
      toValue: "new",
      createdAt: new Date(),
    });

    return c.json({ id, complaintNumber }, 201);
  } catch (error) {
    console.error("POST /complaints error:", error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

app.patch("/:id/status", async (c) => {
  try {
    const { id } = c.req.param();
    const { status, resolution, userId } = await c.req.json();

    const [complaint] = await db.select().from(complaints).where(eq(complaints.id, id));
    if (!complaint) return c.json({ error: "الشكوى غير موجودة" }, 404);

    const updates: any = { status, updatedAt: new Date() };
    if (status === "resolved") {
      updates.resolution = resolution || null;
      updates.resolvedBy = userId || null;
      updates.resolvedAt = new Date();
    }

    await db.update(complaints).set(updates).where(eq(complaints.id, id));

    // تسجيل السجل
    await db.insert(complaintHistory).values({
      id: `ch_${nanoid(12)}`,
      complaintId: id,
      action: "status_change",
      fromValue: complaint.status,
      toValue: status,
      performedBy: userId || null,
      createdAt: new Date(),
    });

    return c.json({ success: true });
  } catch (error) {
    console.error("PATCH /complaints/:id/status error:", error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

app.patch("/:id/assign", async (c) => {
  try {
    const { id } = c.req.param();
    const { assignedTo, userId } = await c.req.json();

    const [complaint] = await db.select().from(complaints).where(eq(complaints.id, id));
    if (!complaint) return c.json({ error: "الشكوى غير موجودة" }, 404);

    await db.update(complaints).set({
      assignedTo,
      status: complaint.status === "new" ? "acknowledged" : complaint.status,
      updatedAt: new Date(),
    }).where(eq(complaints.id, id));

    await db.insert(complaintHistory).values({
      id: `ch_${nanoid(12)}`,
      complaintId: id,
      action: "assignment",
      fromValue: complaint.assignedTo || "unassigned",
      toValue: assignedTo,
      performedBy: userId || null,
      createdAt: new Date(),
    });

    return c.json({ success: true });
  } catch (error) {
    console.error("PATCH /complaints/:id/assign error:", error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

app.post("/:id/escalate", async (c) => {
  try {
    const { id } = c.req.param();
    const { escalatedTo, reason, userId } = await c.req.json();

    const [complaint] = await db.select().from(complaints).where(eq(complaints.id, id));
    if (!complaint) return c.json({ error: "الشكوى غير موجودة" }, 404);

    await db.update(complaints).set({
      status: "escalated",
      escalationLevel: (complaint.escalationLevel || 0) + 1,
      escalatedTo,
      escalatedAt: new Date(),
      escalationReason: reason || null,
      updatedAt: new Date(),
    }).where(eq(complaints.id, id));

    await db.insert(complaintHistory).values({
      id: `ch_${nanoid(12)}`,
      complaintId: id,
      action: "escalation",
      fromValue: complaint.status,
      toValue: "escalated",
      performedBy: userId || null,
      notes: reason,
      createdAt: new Date(),
    });

    return c.json({ success: true });
  } catch (error) {
    console.error("POST /complaints/:id/escalate error:", error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

app.post("/:id/reply", async (c) => {
  try {
    const { id: complaintId } = c.req.param();
    const body = await c.req.json();
    const id = `cr_${nanoid(12)}`;

    await db.insert(complaintReplies).values({
      id, complaintId,
      userId: body.userId || null,
      isCustomerReply: body.isCustomerReply || false,
      message: body.message,
      attachments: body.attachments || null,
      isInternal: body.isInternal || false,
      createdAt: new Date(),
    });

    // تحديث الحالة إذا كان رد من العميل
    if (body.isCustomerReply) {
      await db.update(complaints).set({
        status: "investigating",
        updatedAt: new Date(),
      }).where(eq(complaints.id, complaintId));
    }

    return c.json({ id }, 201);
  } catch (error) {
    console.error("POST /complaints/:id/reply error:", error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

// تقييم الرضا
app.post("/:id/satisfaction", async (c) => {
  try {
    const { id: complaintId } = c.req.param();
    const body = await c.req.json();
    const id = `ss_${nanoid(12)}`;

    await db.insert(satisfactionSurveys).values({
      id, complaintId,
      customerId: body.customerId || null,
      overallRating: body.overallRating,
      responseTimeRating: body.responseTimeRating || null,
      solutionQualityRating: body.solutionQualityRating || null,
      staffProfessionalismRating: body.staffProfessionalismRating || null,
      comment: body.comment || null,
      wouldRecommend: body.wouldRecommend || null,
      needsFollowUp: body.needsFollowUp || false,
      submittedAt: new Date(),
    });

    // تحديث الشكوى
    await db.update(complaints).set({
      satisfactionRating: body.overallRating,
      satisfactionComment: body.comment || null,
      status: "closed",
      updatedAt: new Date(),
    }).where(eq(complaints.id, complaintId));

    return c.json({ id }, 201);
  } catch (error) {
    console.error("POST /complaints/:id/satisfaction error:", error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

// الاقتراحات
app.get("/suggestions/all", async (c) => {
  try {
    const { status, category } = c.req.query();
    const conditions = [];
    if (status) conditions.push(eq(suggestions.status, status));
    if (category) conditions.push(eq(suggestions.category, category));

    const result = await db.select().from(suggestions)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(suggestions.createdAt));

    return c.json(result);
  } catch (error) {
    console.error("GET /complaints/suggestions/all error:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.post("/suggestions", async (c) => {
  try {
    const body = await c.req.json();
    const id = `sug_${nanoid(12)}`;
    const suggestionNumber = generateNumber("SUG");

    await db.insert(suggestions).values({
      id, suggestionNumber,
      submitterType: body.submitterType || "customer",
      customerId: body.customerId || null,
      employeeId: body.employeeId || null,
      externalName: body.externalName || null,
      externalEmail: body.externalEmail || null,
      category: body.category || "general",
      title: body.title,
      description: body.description,
      expectedBenefit: body.expectedBenefit || null,
      status: "submitted",
      attachments: body.attachments || null,
      isPublic: body.isPublic || false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return c.json({ id, suggestionNumber }, 201);
  } catch (error) {
    console.error("POST /complaints/suggestions error:", error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

app.patch("/suggestions/:id", async (c) => {
  try {
    const { id } = c.req.param();
    const body = await c.req.json();

    const updates: any = { updatedAt: new Date() };
    if (body.status) updates.status = body.status;
    if (body.feasibility) updates.feasibility = body.feasibility;
    if (body.impact) updates.impact = body.impact;
    if (body.reviewNotes) updates.reviewNotes = body.reviewNotes;
    if (body.reviewedBy) {
      updates.reviewedBy = body.reviewedBy;
      updates.reviewedAt = new Date();
    }
    if (body.status === "implemented") {
      updates.implementedBy = body.implementedBy;
      updates.implementedAt = new Date();
      updates.implementationNotes = body.implementationNotes || null;
    }

    await db.update(suggestions).set(updates).where(eq(suggestions.id, id));

    return c.json({ success: true });
  } catch (error) {
    console.error("PATCH /complaints/suggestions/:id error:", error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

app.post("/suggestions/:id/vote", async (c) => {
  try {
    const { id } = c.req.param();
    const { type } = await c.req.json(); // upvote, downvote

    const [suggestion] = await db.select().from(suggestions).where(eq(suggestions.id, id));
    if (!suggestion) return c.json({ error: "غير موجود" }, 404);

    const updates: any = { updatedAt: new Date() };
    if (type === "upvote") updates.upvotes = (suggestion.upvotes || 0) + 1;
    else updates.downvotes = (suggestion.downvotes || 0) + 1;

    await db.update(suggestions).set(updates).where(eq(suggestions.id, id));

    return c.json({ success: true });
  } catch (error) {
    console.error("POST /complaints/suggestions/:id/vote error:", error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

// الفئات
app.get("/categories", async (c) => {
  try {
    const result = await db.select().from(complaintCategories)
      .where(eq(complaintCategories.isActive, true))
      .orderBy(complaintCategories.sortOrder);
    return c.json(result);
  } catch (error) {
    console.error("GET /complaints/categories error:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

export default app;

/**
 * API routes للوائح والسياسات
 */
import { Hono } from "hono";
import {
  db,
  policies,
  policySections,
  policyAcknowledgments,
  acknowledgmentRequests,
  policyChangeRequests,
  policyViolations,
  policyReviews,
  policyTemplates,
  policyFAQs,
} from "@bi-management/database";
import { eq, desc, and, or, ilike, gte, lte, count, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { authMiddleware } from "../lib/auth.js";

const app = new Hono();

// توليد رقم اللائحة
function generatePolicyNumber() {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
  return `POL-${year}-${random}`;
}

// توليد رقم طلب التعديل
function generateChangeRequestNumber() {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
  return `CR-${year}-${random}`;
}

// توليد رقم المخالفة
function generateViolationNumber() {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
  return `VIO-${year}-${random}`;
}

// إحصائيات اللوائح
app.get("/stats", async (c) => {
  try {
    const [policyStats] = await db.select({
      total: count(),
      active: count(sql`CASE WHEN status = 'active' THEN 1 END`),
      draft: count(sql`CASE WHEN status = 'draft' THEN 1 END`),
      pendingApproval: count(sql`CASE WHEN status = 'pending_approval' THEN 1 END`),
      expired: count(sql`CASE WHEN status = 'expired' THEN 1 END`),
    }).from(policies);

    const [acknowledgmentStats] = await db.select({
      total: count(),
    }).from(policyAcknowledgments);

    const [changeRequestStats] = await db.select({
      total: count(),
      pending: count(sql`CASE WHEN status = 'submitted' OR status = 'under_review' THEN 1 END`),
    }).from(policyChangeRequests);

    const [violationStats] = await db.select({
      total: count(),
      open: count(sql`CASE WHEN status = 'reported' OR status = 'investigating' THEN 1 END`),
    }).from(policyViolations);

    return c.json({
      policies: {
        total: policyStats.total,
        active: policyStats.active || 0,
        draft: policyStats.draft || 0,
        pendingApproval: policyStats.pendingApproval || 0,
        expired: policyStats.expired || 0,
      },
      acknowledgments: acknowledgmentStats.total,
      changeRequests: {
        total: changeRequestStats.total,
        pending: changeRequestStats.pending || 0,
      },
      violations: {
        total: violationStats.total,
        open: violationStats.open || 0,
      },
    });
  } catch (error) {
    return c.json({ error: "فشل" }, 500);
  }
});

// ====== اللوائح والسياسات ======

// قائمة اللوائح
app.get("/", async (c) => {
  try {
    const { status, type, category, search, scope } = c.req.query();

    let query = db.select().from(policies);
    const conditions = [];

    if (status) conditions.push(eq(policies.status, status));
    if (type) conditions.push(eq(policies.policyType, type));
    if (category) conditions.push(eq(policies.category, category));
    if (scope) conditions.push(eq(policies.scope, scope));
    if (search) {
      conditions.push(
        or(
          ilike(policies.title, `%${search}%`),
          ilike(policies.policyNumber, `%${search}%`),
          ilike(policies.description, `%${search}%`)
        )
      );
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    const items = await query.orderBy(desc(policies.createdAt)).limit(100);
    return c.json(items);
  } catch (error) {
    return c.json({ error: "فشل" }, 500);
  }
});

// إنشاء لائحة
app.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const id = `pol_${nanoid(12)}`;
    const policyNumber = generatePolicyNumber();

    await db.insert(policies).values({
      id,
      policyNumber,
      title: body.title,
      description: body.description || null,
      content: body.content || null,
      summary: body.summary || null,
      policyType: body.policyType || "policy",
      category: body.category || "general",
      subcategory: body.subcategory || null,
      scope: body.scope || "organization",
      applicableDepartments: body.applicableDepartments || null,
      applicableBranches: body.applicableBranches || null,
      applicableRoles: body.applicableRoles || null,
      version: "1.0",
      effectiveDate: new Date(body.effectiveDate),
      expirationDate: body.expirationDate ? new Date(body.expirationDate) : null,
      reviewDate: body.reviewDate ? new Date(body.reviewDate) : null,
      status: "draft",
      requiresApproval: body.requiresApproval !== false,
      ownerId: body.ownerId || null,
      ownerDepartmentId: body.ownerDepartmentId || null,
      custodianId: body.custodianId || null,
      priority: body.priority || "medium",
      complianceLevel: body.complianceLevel || "mandatory",
      attachments: body.attachments || null,
      relatedPolicies: body.relatedPolicies || null,
      references: body.references || null,
      keywords: body.keywords || null,
      tags: body.tags || null,
      notes: body.notes || null,
      createdBy: body.createdBy || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return c.json({ id, policyNumber }, 201);
  } catch (error) {
    console.error("Error creating policy:", error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

// تفاصيل لائحة
app.get("/:id", async (c) => {
  try {
    const { id } = c.req.param();
    const [policy] = await db.select().from(policies).where(eq(policies.id, id));
    if (!policy) return c.json({ error: "غير موجود" }, 404);

    // زيادة عدد المشاهدات
    await db.update(policies).set({
      viewCount: (policy.viewCount || 0) + 1,
    }).where(eq(policies.id, id));

    const sections = await db.select().from(policySections)
      .where(eq(policySections.policyId, id))
      .orderBy(policySections.orderIndex);

    const faqs = await db.select().from(policyFAQs)
      .where(and(eq(policyFAQs.policyId, id), eq(policyFAQs.isPublished, true)))
      .orderBy(policyFAQs.orderIndex);

    const [acknowledgmentCount] = await db.select({ count: count() })
      .from(policyAcknowledgments)
      .where(eq(policyAcknowledgments.policyId, id));

    return c.json({
      ...policy,
      sections,
      faqs,
      acknowledgmentCount: acknowledgmentCount.count,
    });
  } catch (error) {
    return c.json({ error: "فشل" }, 500);
  }
});

// تحديث لائحة
app.patch("/:id", async (c) => {
  try {
    const { id } = c.req.param();
    const body = await c.req.json();

    await db.update(policies).set({
      title: body.title,
      description: body.description,
      content: body.content,
      summary: body.summary,
      policyType: body.policyType,
      category: body.category,
      subcategory: body.subcategory,
      scope: body.scope,
      applicableDepartments: body.applicableDepartments,
      applicableBranches: body.applicableBranches,
      applicableRoles: body.applicableRoles,
      effectiveDate: body.effectiveDate ? new Date(body.effectiveDate) : undefined,
      expirationDate: body.expirationDate ? new Date(body.expirationDate) : null,
      reviewDate: body.reviewDate ? new Date(body.reviewDate) : null,
      priority: body.priority,
      complianceLevel: body.complianceLevel,
      attachments: body.attachments,
      relatedPolicies: body.relatedPolicies,
      references: body.references,
      keywords: body.keywords,
      tags: body.tags,
      notes: body.notes,
      updatedAt: new Date(),
    }).where(eq(policies.id, id));

    return c.json({ success: true });
  } catch (error) {
    console.error("Error updating policy:", error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

// إرسال للموافقة
app.patch("/:id/submit", async (c) => {
  try {
    const { id } = c.req.param();

    await db.update(policies).set({
      status: "pending_approval",
      updatedAt: new Date(),
    }).where(eq(policies.id, id));

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: "فشل" }, 500);
  }
});

// الموافقة
app.patch("/:id/approve", async (c) => {
  try {
    const { id } = c.req.param();
    const { userId } = await c.req.json();

    await db.update(policies).set({
      status: "approved",
      approvedBy: userId || null,
      approvedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(policies.id, id));

    return c.json({ success: true });
  } catch (error) {
    console.error("Error approving policy:", error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

// تفعيل
app.patch("/:id/activate", async (c) => {
  try {
    const { id } = c.req.param();

    await db.update(policies).set({
      status: "active",
      updatedAt: new Date(),
    }).where(eq(policies.id, id));

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: "فشل" }, 500);
  }
});

// تعليق
app.patch("/:id/suspend", async (c) => {
  try {
    const { id } = c.req.param();

    await db.update(policies).set({
      status: "suspended",
      updatedAt: new Date(),
    }).where(eq(policies.id, id));

    return c.json({ success: true });
  } catch (error) {
    console.error("Error suspending policy:", error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

// أرشفة
app.patch("/:id/archive", async (c) => {
  try {
    const { id } = c.req.param();

    await db.update(policies).set({
      status: "archived",
      updatedAt: new Date(),
    }).where(eq(policies.id, id));

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: "فشل" }, 500);
  }
});

// ====== إقرارات الاطلاع ======

// تسجيل إقرار
app.post("/:id/acknowledge", async (c) => {
  try {
    const { id: policyId } = c.req.param();
    const body = await c.req.json();
    const id = `ack_${nanoid(12)}`;

    // التحقق من عدم وجود إقرار سابق
    const [existing] = await db.select().from(policyAcknowledgments)
      .where(and(
        eq(policyAcknowledgments.policyId, policyId),
        eq(policyAcknowledgments.userId, body.userId)
      ));

    if (existing) {
      return c.json({ error: "تم الإقرار مسبقاً" }, 400);
    }

    // الحصول على إصدار اللائحة
    const [policy] = await db.select().from(policies).where(eq(policies.id, policyId));

    await db.insert(policyAcknowledgments).values({
      id,
      policyId,
      userId: body.userId,
      acknowledgedAt: new Date(),
      ipAddress: body.ipAddress || null,
      userAgent: body.userAgent || null,
      method: body.method || "digital",
      signatureUrl: body.signatureUrl || null,
      notes: body.notes || null,
      version: policy?.version || "1.0",
    });

    return c.json({ id }, 201);
  } catch (error) {
    return c.json({ error: "فشل" }, 500);
  }
});

// قائمة الإقرارات
app.get("/:id/acknowledgments", async (c) => {
  try {
    const { id: policyId } = c.req.param();

    const acknowledgments = await db.select().from(policyAcknowledgments)
      .where(eq(policyAcknowledgments.policyId, policyId))
      .orderBy(desc(policyAcknowledgments.acknowledgedAt));

    return c.json(acknowledgments);
  } catch (error) {
    console.error("Error fetching acknowledgments:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

// طلب إقرار من مجموعة
app.post("/:id/request-acknowledgment", async (c) => {
  try {
    const { id: policyId } = c.req.param();
    const body = await c.req.json();
    const id = `ar_${nanoid(12)}`;

    await db.insert(acknowledgmentRequests).values({
      id,
      policyId,
      requestedBy: body.requestedBy || null,
      targetType: body.targetType || "all",
      targetDepartmentId: body.targetDepartmentId || null,
      targetBranchId: body.targetBranchId || null,
      targetUserIds: body.targetUserIds || null,
      deadline: body.deadline ? new Date(body.deadline) : null,
      message: body.message || null,
      status: "active",
      createdAt: new Date(),
    });

    return c.json({ id }, 201);
  } catch (error) {
    return c.json({ error: "فشل" }, 500);
  }
});

// ====== طلبات التعديل ======

app.get("/change-requests", async (c) => {
  try {
    const { status, policyId } = c.req.query();

    let query = db.select().from(policyChangeRequests);
    const conditions = [];

    if (status) conditions.push(eq(policyChangeRequests.status, status));
    if (policyId) conditions.push(eq(policyChangeRequests.policyId, policyId));

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    const requests = await query.orderBy(desc(policyChangeRequests.requestedAt)).limit(50);
    return c.json(requests);
  } catch (error) {
    return c.json({ error: "فشل" }, 500);
  }
});

app.post("/change-requests", async (c) => {
  try {
    const body = await c.req.json();
    const id = `cr_${nanoid(12)}`;
    const requestNumber = generateChangeRequestNumber();

    await db.insert(policyChangeRequests).values({
      id,
      requestNumber,
      policyId: body.policyId,
      changeType: body.changeType || "amendment",
      title: body.title,
      description: body.description || null,
      proposedChanges: body.proposedChanges || null,
      justification: body.justification || null,
      impactAnalysis: body.impactAnalysis || null,
      priority: body.priority || "normal",
      requestedBy: body.requestedBy || null,
      requestedAt: new Date(),
      status: "submitted",
      attachments: body.attachments || null,
    });

    return c.json({ id, requestNumber }, 201);
  } catch (error) {
    return c.json({ error: "فشل" }, 500);
  }
});

app.patch("/change-requests/:id/approve", async (c) => {
  try {
    const { id } = c.req.param();
    const { userId, comments } = await c.req.json();

    await db.update(policyChangeRequests).set({
      status: "approved",
      reviewedBy: userId || null,
      reviewedAt: new Date(),
      reviewComments: comments || null,
    }).where(eq(policyChangeRequests.id, id));

    return c.json({ success: true });
  } catch (error) {
    console.error("Error approving change request:", error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

app.patch("/change-requests/:id/reject", async (c) => {
  try {
    const { id } = c.req.param();
    const { userId, comments } = await c.req.json();

    await db.update(policyChangeRequests).set({
      status: "rejected",
      reviewedBy: userId || null,
      reviewedAt: new Date(),
      reviewComments: comments || null,
    }).where(eq(policyChangeRequests.id, id));

    return c.json({ success: true });
  } catch (error) {
    console.error("Error rejecting change request:", error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

// ====== المخالفات ======

app.get("/violations", async (c) => {
  try {
    const { status, severity, policyId } = c.req.query();

    let query = db.select().from(policyViolations);
    const conditions = [];

    if (status) conditions.push(eq(policyViolations.status, status));
    if (severity) conditions.push(eq(policyViolations.severity, severity));
    if (policyId) conditions.push(eq(policyViolations.policyId, policyId));

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    const violations = await query.orderBy(desc(policyViolations.reportedAt)).limit(50);
    return c.json(violations);
  } catch (error) {
    console.error("Error fetching violations:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.post("/violations", async (c) => {
  try {
    const body = await c.req.json();
    const id = `vio_${nanoid(12)}`;
    const violationNumber = generateViolationNumber();

    await db.insert(policyViolations).values({
      id,
      violationNumber,
      policyId: body.policyId,
      violatorId: body.violatorId || null,
      violatorName: body.violatorName || null,
      departmentId: body.departmentId || null,
      branchId: body.branchId || null,
      violationDate: new Date(body.violationDate),
      description: body.description,
      severity: body.severity || "minor",
      evidence: body.evidence || null,
      reportedBy: body.reportedBy || null,
      reportedAt: new Date(),
      status: "reported",
      notes: body.notes || null,
    });

    return c.json({ id, violationNumber }, 201);
  } catch (error) {
    console.error("Error creating violation:", error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

app.patch("/violations/:id/investigate", async (c) => {
  try {
    const { id } = c.req.param();
    const { investigatorId } = await c.req.json();

    await db.update(policyViolations).set({
      status: "investigating",
      investigatedBy: investigatorId || null,
      investigationStartedAt: new Date(),
    }).where(eq(policyViolations.id, id));

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: "فشل" }, 500);
  }
});

app.patch("/violations/:id/resolve", async (c) => {
  try {
    const { id } = c.req.param();
    const { findings, correctiveAction, penaltyApplied } = await c.req.json();

    await db.update(policyViolations).set({
      status: "resolved",
      investigationFindings: findings || null,
      correctiveAction: correctiveAction || null,
      correctiveActionCompletedAt: new Date(),
      penaltyApplied: penaltyApplied || null,
      investigationCompletedAt: new Date(),
    }).where(eq(policyViolations.id, id));

    return c.json({ success: true });
  } catch (error) {
    console.error("Error resolving violation:", error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

// ====== القوالب ======

app.get("/templates", async (c) => {
  try {
    const templates = await db.select().from(policyTemplates)
      .where(eq(policyTemplates.isActive, true))
      .orderBy(policyTemplates.name);
    return c.json(templates);
  } catch (error) {
    return c.json({ error: "فشل" }, 500);
  }
});

app.post("/templates", async (c) => {
  try {
    const body = await c.req.json();
    const id = `ptpl_${nanoid(12)}`;

    await db.insert(policyTemplates).values({
      id,
      name: body.name,
      description: body.description || null,
      policyType: body.policyType,
      category: body.category || null,
      structure: body.structure || null,
      defaultContent: body.defaultContent || null,
      isActive: true,
      createdBy: body.createdBy || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return c.json({ id }, 201);
  } catch (error) {
    console.error("Error creating template:", error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

export default app;

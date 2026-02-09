/**
 * API routes للمراسلات الصادرة والواردة
 */
import { Hono } from "hono";
import {
  db,
  outgoingCorrespondence,
  incomingCorrespondence,
  correspondenceTracking,
  correspondenceComments,
  correspondenceTemplates,
} from "@bi-management/database";
import { eq, desc, and, or, ilike, gte, lte, count, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { authMiddleware } from "../lib/auth.js";

const app = new Hono();

// توليد رقم المراسلة
function generateCorrespondenceNumber(direction: "OUT" | "IN") {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
  return `${direction}-${year}-${random}`;
}

// إحصائيات المراسلات
app.get("/stats", async (c) => {
  try {
    const [outgoingStats] = await db.select({
      total: count(),
      draft: count(sql`CASE WHEN status = 'draft' THEN 1 END`),
      sent: count(sql`CASE WHEN status = 'sent' THEN 1 END`),
      pending: count(sql`CASE WHEN status = 'pending_approval' THEN 1 END`),
    }).from(outgoingCorrespondence);

    const [incomingStats] = await db.select({
      total: count(),
      received: count(sql`CASE WHEN status = 'received' THEN 1 END`),
      inProgress: count(sql`CASE WHEN status = 'in_progress' THEN 1 END`),
      closed: count(sql`CASE WHEN status = 'closed' THEN 1 END`),
    }).from(incomingCorrespondence);

    return c.json({
      outgoing: {
        total: outgoingStats.total,
        draft: outgoingStats.draft || 0,
        sent: outgoingStats.sent || 0,
        pending: outgoingStats.pending || 0,
      },
      incoming: {
        total: incomingStats.total,
        received: incomingStats.received || 0,
        inProgress: incomingStats.inProgress || 0,
        closed: incomingStats.closed || 0,
      },
    });
  } catch (error) {
    console.error("Error fetching correspondence stats:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

// ====== المراسلات الصادرة ======

// قائمة المراسلات الصادرة
app.get("/outgoing", async (c) => {
  try {
    const { status, type, priority, search, from, to } = c.req.query();

    let query = db.select().from(outgoingCorrespondence);
    const conditions = [];

    if (status) conditions.push(eq(outgoingCorrespondence.status, status));
    if (type) conditions.push(eq(outgoingCorrespondence.correspondenceType, type));
    if (priority) conditions.push(eq(outgoingCorrespondence.priority, priority));
    if (search) {
      conditions.push(
        or(
          ilike(outgoingCorrespondence.subject, `%${search}%`),
          ilike(outgoingCorrespondence.referenceNumber, `%${search}%`),
          ilike(outgoingCorrespondence.recipientName, `%${search}%`)
        )
      );
    }
    if (from) conditions.push(gte(outgoingCorrespondence.issueDate, new Date(from)));
    if (to) conditions.push(lte(outgoingCorrespondence.issueDate, new Date(to)));

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    const items = await query.orderBy(desc(outgoingCorrespondence.createdAt)).limit(100);
    return c.json(items);
  } catch (error) {
    console.error("Error fetching outgoing correspondence:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

// إنشاء مراسلة صادرة
app.post("/outgoing", async (c) => {
  try {
    const body = await c.req.json();
    const id = `out_${nanoid(12)}`;
    const referenceNumber = generateCorrespondenceNumber("OUT");

    await db.insert(outgoingCorrespondence).values({
      id,
      referenceNumber,
      subject: body.subject,
      content: body.content || null,
      correspondenceType: body.correspondenceType || "letter",
      category: body.category || "general",
      priority: body.priority || "normal",
      senderId: body.senderId || null,
      senderDepartmentId: body.senderDepartmentId || null,
      senderBranchId: body.senderBranchId || null,
      recipientType: body.recipientType || "external",
      recipientName: body.recipientName || null,
      recipientOrganization: body.recipientOrganization || null,
      recipientDepartment: body.recipientDepartment || null,
      recipientAddress: body.recipientAddress || null,
      recipientEmail: body.recipientEmail || null,
      recipientPhone: body.recipientPhone || null,
      customerId: body.customerId || null,
      supplierId: body.supplierId || null,
      internalRecipientId: body.internalRecipientId || null,
      internalDepartmentId: body.internalDepartmentId || null,
      ccRecipients: body.ccRecipients || null,
      issueDate: new Date(body.issueDate || Date.now()),
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      status: "draft",
      requiresApproval: body.requiresApproval || false,
      deliveryMethod: body.deliveryMethod || "email",
      attachments: body.attachments || null,
      notes: body.notes || null,
      tags: body.tags || null,
      createdBy: body.createdBy || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // تسجيل التتبع
    await db.insert(correspondenceTracking).values({
      id: `ct_${nanoid(12)}`,
      correspondenceId: id,
      correspondenceDirection: "outgoing",
      action: "created",
      toStatus: "draft",
      performedBy: body.createdBy || null,
      performedAt: new Date(),
    });

    return c.json({ id, referenceNumber }, 201);
  } catch (error) {
    console.error("Error creating outgoing correspondence:", error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

// تفاصيل مراسلة صادرة
app.get("/outgoing/:id", async (c) => {
  try {
    const { id } = c.req.param();
    const [item] = await db.select().from(outgoingCorrespondence).where(eq(outgoingCorrespondence.id, id));
    if (!item) return c.json({ error: "غير موجود" }, 404);

    const tracking = await db.select().from(correspondenceTracking)
      .where(and(
        eq(correspondenceTracking.correspondenceId, id),
        eq(correspondenceTracking.correspondenceDirection, "outgoing")
      ))
      .orderBy(desc(correspondenceTracking.performedAt));

    const comments = await db.select().from(correspondenceComments)
      .where(and(
        eq(correspondenceComments.correspondenceId, id),
        eq(correspondenceComments.correspondenceDirection, "outgoing")
      ))
      .orderBy(desc(correspondenceComments.createdAt));

    return c.json({ ...item, tracking, comments });
  } catch (error) {
    console.error("Error fetching outgoing correspondence:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

// إرسال للموافقة
app.patch("/outgoing/:id/submit", async (c) => {
  try {
    const { id } = c.req.param();
    const { userId } = await c.req.json();

    await db.update(outgoingCorrespondence).set({
      status: "pending_approval",
      updatedAt: new Date(),
    }).where(eq(outgoingCorrespondence.id, id));

    await db.insert(correspondenceTracking).values({
      id: `ct_${nanoid(12)}`,
      correspondenceId: id,
      correspondenceDirection: "outgoing",
      action: "submitted",
      fromStatus: "draft",
      toStatus: "pending_approval",
      performedBy: userId || null,
      performedAt: new Date(),
    });

    return c.json({ success: true });
  } catch (error) {
    console.error("Error submitting outgoing correspondence:", error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

// الموافقة والتوقيع
app.patch("/outgoing/:id/approve", async (c) => {
  try {
    const { id } = c.req.param();
    const { userId } = await c.req.json();

    await db.update(outgoingCorrespondence).set({
      status: "approved",
      approvedBy: userId || null,
      approvedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(outgoingCorrespondence.id, id));

    await db.insert(correspondenceTracking).values({
      id: `ct_${nanoid(12)}`,
      correspondenceId: id,
      correspondenceDirection: "outgoing",
      action: "approved",
      fromStatus: "pending_approval",
      toStatus: "approved",
      performedBy: userId || null,
      performedAt: new Date(),
    });

    return c.json({ success: true });
  } catch (error) {
    console.error("Error approving outgoing correspondence:", error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

// إرسال المراسلة
app.patch("/outgoing/:id/send", async (c) => {
  try {
    const { id } = c.req.param();
    const { userId, trackingNumber } = await c.req.json();

    await db.update(outgoingCorrespondence).set({
      status: "sent",
      sentDate: new Date(),
      trackingNumber: trackingNumber || null,
      updatedAt: new Date(),
    }).where(eq(outgoingCorrespondence.id, id));

    await db.insert(correspondenceTracking).values({
      id: `ct_${nanoid(12)}`,
      correspondenceId: id,
      correspondenceDirection: "outgoing",
      action: "sent",
      toStatus: "sent",
      details: trackingNumber ? `رقم التتبع: ${trackingNumber}` : null,
      performedBy: userId || null,
      performedAt: new Date(),
    });

    return c.json({ success: true });
  } catch (error) {
    console.error("Error sending outgoing correspondence:", error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

// أرشفة
app.patch("/outgoing/:id/archive", async (c) => {
  try {
    const { id } = c.req.param();
    const { userId, archiveNumber, archiveLocation } = await c.req.json();

    await db.update(outgoingCorrespondence).set({
      status: "archived",
      isArchived: true,
      archiveNumber: archiveNumber || null,
      archiveLocation: archiveLocation || null,
      archivedAt: new Date(),
      archivedBy: userId || null,
      updatedAt: new Date(),
    }).where(eq(outgoingCorrespondence.id, id));

    await db.insert(correspondenceTracking).values({
      id: `ct_${nanoid(12)}`,
      correspondenceId: id,
      correspondenceDirection: "outgoing",
      action: "archived",
      toStatus: "archived",
      performedBy: userId || null,
      performedAt: new Date(),
    });

    return c.json({ success: true });
  } catch (error) {
    console.error("Error archiving outgoing correspondence:", error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

// ====== المراسلات الواردة ======

// قائمة المراسلات الواردة
app.get("/incoming", async (c) => {
  try {
    const { status, type, priority, search, from, to } = c.req.query();

    let query = db.select().from(incomingCorrespondence);
    const conditions = [];

    if (status) conditions.push(eq(incomingCorrespondence.status, status));
    if (type) conditions.push(eq(incomingCorrespondence.correspondenceType, type));
    if (priority) conditions.push(eq(incomingCorrespondence.priority, priority));
    if (search) {
      conditions.push(
        or(
          ilike(incomingCorrespondence.subject, `%${search}%`),
          ilike(incomingCorrespondence.referenceNumber, `%${search}%`),
          ilike(incomingCorrespondence.senderName, `%${search}%`)
        )
      );
    }
    if (from) conditions.push(gte(incomingCorrespondence.receivedDate, new Date(from)));
    if (to) conditions.push(lte(incomingCorrespondence.receivedDate, new Date(to)));

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    const items = await query.orderBy(desc(incomingCorrespondence.receivedDate)).limit(100);
    return c.json(items);
  } catch (error) {
    console.error("Error fetching incoming correspondence:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

// تسجيل مراسلة واردة
app.post("/incoming", async (c) => {
  try {
    const body = await c.req.json();
    const id = `in_${nanoid(12)}`;
    const referenceNumber = generateCorrespondenceNumber("IN");

    await db.insert(incomingCorrespondence).values({
      id,
      referenceNumber,
      externalReferenceNumber: body.externalReferenceNumber || null,
      subject: body.subject,
      content: body.content || null,
      correspondenceType: body.correspondenceType || "letter",
      category: body.category || "general",
      priority: body.priority || "normal",
      senderType: body.senderType || "external",
      senderName: body.senderName,
      senderOrganization: body.senderOrganization || null,
      senderDepartment: body.senderDepartment || null,
      senderAddress: body.senderAddress || null,
      senderEmail: body.senderEmail || null,
      senderPhone: body.senderPhone || null,
      customerId: body.customerId || null,
      supplierId: body.supplierId || null,
      receivedDate: new Date(body.receivedDate || Date.now()),
      receivedBy: body.receivedBy || null,
      receivedAtBranchId: body.receivedAtBranchId || null,
      requiresAction: body.requiresAction || false,
      actionRequired: body.actionRequired || null,
      actionDeadline: body.actionDeadline ? new Date(body.actionDeadline) : null,
      status: "received",
      attachments: body.attachments || null,
      notes: body.notes || null,
      tags: body.tags || null,
      createdBy: body.createdBy || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await db.insert(correspondenceTracking).values({
      id: `ct_${nanoid(12)}`,
      correspondenceId: id,
      correspondenceDirection: "incoming",
      action: "received",
      toStatus: "received",
      performedBy: body.receivedBy || null,
      performedAt: new Date(),
    });

    return c.json({ id, referenceNumber }, 201);
  } catch (error) {
    console.error("Error creating incoming correspondence:", error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

// تفاصيل مراسلة واردة
app.get("/incoming/:id", async (c) => {
  try {
    const { id } = c.req.param();
    const [item] = await db.select().from(incomingCorrespondence).where(eq(incomingCorrespondence.id, id));
    if (!item) return c.json({ error: "غير موجود" }, 404);

    const tracking = await db.select().from(correspondenceTracking)
      .where(and(
        eq(correspondenceTracking.correspondenceId, id),
        eq(correspondenceTracking.correspondenceDirection, "incoming")
      ))
      .orderBy(desc(correspondenceTracking.performedAt));

    const comments = await db.select().from(correspondenceComments)
      .where(and(
        eq(correspondenceComments.correspondenceId, id),
        eq(correspondenceComments.correspondenceDirection, "incoming")
      ))
      .orderBy(desc(correspondenceComments.createdAt));

    return c.json({ ...item, tracking, comments });
  } catch (error) {
    console.error("Error fetching incoming correspondence:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

// إحالة لموظف
app.patch("/incoming/:id/assign", async (c) => {
  try {
    const { id } = c.req.param();
    const { assignedTo, assignedDepartmentId, assignedBy } = await c.req.json();

    await db.update(incomingCorrespondence).set({
      assignedTo: assignedTo || null,
      assignedDepartmentId: assignedDepartmentId || null,
      assignedBy: assignedBy || null,
      assignedAt: new Date(),
      status: "assigned",
      updatedAt: new Date(),
    }).where(eq(incomingCorrespondence.id, id));

    await db.insert(correspondenceTracking).values({
      id: `ct_${nanoid(12)}`,
      correspondenceId: id,
      correspondenceDirection: "incoming",
      action: "assigned",
      toStatus: "assigned",
      details: assignedTo ? `تم الإحالة إلى ${assignedTo}` : null,
      performedBy: assignedBy || null,
      performedAt: new Date(),
    });

    return c.json({ success: true });
  } catch (error) {
    console.error("Error assigning incoming correspondence:", error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

// تسجيل الإجراء المتخذ
app.patch("/incoming/:id/action", async (c) => {
  try {
    const { id } = c.req.param();
    const { actionTaken, userId } = await c.req.json();

    await db.update(incomingCorrespondence).set({
      actionTaken,
      actionTakenDate: new Date(),
      status: "responded",
      updatedAt: new Date(),
    }).where(eq(incomingCorrespondence.id, id));

    await db.insert(correspondenceTracking).values({
      id: `ct_${nanoid(12)}`,
      correspondenceId: id,
      correspondenceDirection: "incoming",
      action: "responded",
      toStatus: "responded",
      details: actionTaken,
      performedBy: userId || null,
      performedAt: new Date(),
    });

    return c.json({ success: true });
  } catch (error) {
    console.error("Error recording action for incoming correspondence:", error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

// إغلاق
app.patch("/incoming/:id/close", async (c) => {
  try {
    const { id } = c.req.param();
    const { userId } = await c.req.json();

    await db.update(incomingCorrespondence).set({
      status: "closed",
      updatedAt: new Date(),
    }).where(eq(incomingCorrespondence.id, id));

    await db.insert(correspondenceTracking).values({
      id: `ct_${nanoid(12)}`,
      correspondenceId: id,
      correspondenceDirection: "incoming",
      action: "closed",
      toStatus: "closed",
      performedBy: userId || null,
      performedAt: new Date(),
    });

    return c.json({ success: true });
  } catch (error) {
    console.error("Error closing incoming correspondence:", error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

// أرشفة واردة
app.patch("/incoming/:id/archive", async (c) => {
  try {
    const { id } = c.req.param();
    const { userId, archiveNumber, archiveLocation } = await c.req.json();

    await db.update(incomingCorrespondence).set({
      status: "archived",
      isArchived: true,
      archiveNumber: archiveNumber || null,
      archiveLocation: archiveLocation || null,
      archivedAt: new Date(),
      archivedBy: userId || null,
      updatedAt: new Date(),
    }).where(eq(incomingCorrespondence.id, id));

    await db.insert(correspondenceTracking).values({
      id: `ct_${nanoid(12)}`,
      correspondenceId: id,
      correspondenceDirection: "incoming",
      action: "archived",
      toStatus: "archived",
      performedBy: userId || null,
      performedAt: new Date(),
    });

    return c.json({ success: true });
  } catch (error) {
    console.error("Error archiving incoming correspondence:", error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

// إضافة تعليق
app.post("/comments", async (c) => {
  try {
    const body = await c.req.json();
    const id = `cc_${nanoid(12)}`;

    await db.insert(correspondenceComments).values({
      id,
      correspondenceId: body.correspondenceId,
      correspondenceDirection: body.direction,
      comment: body.comment,
      isInternal: body.isInternal !== false,
      parentCommentId: body.parentCommentId || null,
      createdBy: body.createdBy || null,
      createdAt: new Date(),
    });

    return c.json({ id }, 201);
  } catch (error) {
    console.error("Error creating correspondence comment:", error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

// قوالب المراسلات
app.get("/templates", async (c) => {
  try {
    const templates = await db.select().from(correspondenceTemplates)
      .where(eq(correspondenceTemplates.isActive, true))
      .orderBy(correspondenceTemplates.name);
    return c.json(templates);
  } catch (error) {
    console.error("Error fetching correspondence templates:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.post("/templates", async (c) => {
  try {
    const body = await c.req.json();
    const id = `tpl_${nanoid(12)}`;

    await db.insert(correspondenceTemplates).values({
      id,
      name: body.name,
      description: body.description || null,
      correspondenceType: body.correspondenceType,
      category: body.category || null,
      subject: body.subject || null,
      content: body.content || null,
      headerTemplate: body.headerTemplate || null,
      footerTemplate: body.footerTemplate || null,
      variables: body.variables || null,
      departmentId: body.departmentId || null,
      isActive: true,
      isDefault: body.isDefault || false,
      createdBy: body.createdBy || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return c.json({ id }, 201);
  } catch (error) {
    console.error("Error creating correspondence template:", error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

export default app;

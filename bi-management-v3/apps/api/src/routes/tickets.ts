/**
 * API Routes - نظام التذاكر
 */
import { Hono } from "hono";
import { db, tickets, ticketReplies, ticketHistory } from "@bi-management/database";
import { eq, and, or, desc, count, like, not } from "drizzle-orm";
import { nanoid } from "nanoid";
import { authMiddleware } from "../lib/auth.js";

const app = new Hono();

const generateTicketNumber = () => `TK${Date.now().toString(36).toUpperCase()}`;

app.get("/", async (c) => {
  try {
    const { status, priority, assignedTo, search, page = "1", limit = "20" } = c.req.query();
    const conditions = [];
    if (status) conditions.push(eq(tickets.status, status));
    if (priority) conditions.push(eq(tickets.priority, priority));
    if (assignedTo) conditions.push(eq(tickets.assignedTo, assignedTo));
    if (search) conditions.push(or(
      like(tickets.title, `%${search}%`),
      like(tickets.ticketNumber, `%${search}%`)
    ));

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    const result = await db.select().from(tickets)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(tickets.createdAt))
      .limit(limitNum).offset((pageNum - 1) * limitNum);

    const [total] = await db.select({ count: count() }).from(tickets)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    return c.json({ tickets: result, pagination: { page: pageNum, limit: limitNum, total: total?.count || 0 } });
  } catch (error) {
    console.error("Error fetching tickets:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.get("/stats", async (c) => {
  try {
    const [total] = await db.select({ count: count() }).from(tickets);
    const [open] = await db.select({ count: count() }).from(tickets).where(eq(tickets.status, "open"));
    const [inProgress] = await db.select({ count: count() }).from(tickets).where(eq(tickets.status, "in_progress"));
    const [resolved] = await db.select({ count: count() }).from(tickets).where(eq(tickets.status, "resolved"));

    const priorityStats = await db.select({ priority: tickets.priority, count: count() })
      .from(tickets).where(not(eq(tickets.status, "closed"))).groupBy(tickets.priority);

    const categoryStats = await db.select({ category: tickets.category, count: count() })
      .from(tickets).groupBy(tickets.category);

    return c.json({
      total: total?.count || 0,
      open: open?.count || 0,
      inProgress: inProgress?.count || 0,
      resolved: resolved?.count || 0,
      byPriority: priorityStats.reduce((acc, s) => ({ ...acc, [s.priority || "medium"]: s.count }), {}),
      byCategory: categoryStats.reduce((acc, s) => ({ ...acc, [s.category || "other"]: s.count }), {}),
    });
  } catch (error) {
    console.error("Error fetching ticket stats:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.get("/:id", async (c) => {
  try {
    const { id } = c.req.param();
    const [ticket] = await db.select().from(tickets).where(eq(tickets.id, id));
    if (!ticket) return c.json({ error: "التذكرة غير موجودة" }, 404);

    const replies = await db.select().from(ticketReplies)
      .where(eq(ticketReplies.ticketId, id))
      .orderBy(ticketReplies.createdAt);

    const history = await db.select().from(ticketHistory)
      .where(eq(ticketHistory.ticketId, id))
      .orderBy(desc(ticketHistory.createdAt));

    return c.json({ ...ticket, replies, history });
  } catch (error) {
    console.error("Error fetching ticket:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const id = `tkt_${nanoid(12)}`;
    const ticketNumber = generateTicketNumber();

    await db.insert(tickets).values({
      id, ticketNumber,
      title: body.title,
      description: body.description || null,
      category: body.category || "technical",
      subCategory: body.subCategory || null,
      priority: body.priority || "medium",
      status: "open",
      source: body.source || "internal",
      branchId: body.branchId || null,
      departmentId: body.departmentId || null,
      createdBy: body.createdBy || null,
      assignedTo: body.assignedTo || null,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      tags: body.tags || null,
      attachments: body.attachments || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return c.json({ id, ticketNumber }, 201);
  } catch (error) {
    console.error("Error creating ticket:", error);
    return c.json({ error: "فشل في إنشاء التذكرة" }, 500);
  }
});

app.patch("/:id", async (c) => {
  try {
    const { id } = c.req.param();
    const body = await c.req.json();

    const [ticket] = await db.select().from(tickets).where(eq(tickets.id, id));
    if (!ticket) return c.json({ error: "التذكرة غير موجودة" }, 404);

    const updates: any = { updatedAt: new Date() };
    const historyEntries: any[] = [];

    const trackableFields = ["status", "priority", "assignedTo", "category"];
    for (const field of trackableFields) {
      if (body[field] !== undefined && body[field] !== (ticket as any)[field]) {
        updates[field] = body[field];
        historyEntries.push({
          id: `th_${nanoid(12)}`,
          ticketId: id,
          field,
          oldValue: String((ticket as any)[field] || ""),
          newValue: String(body[field]),
          changedBy: body.changedBy || null,
          createdAt: new Date(),
        });
      }
    }

    if (body.status === "resolved" && ticket.status !== "resolved") {
      updates.resolvedAt = new Date();
    }
    if (body.status === "closed" && ticket.status !== "closed") {
      updates.closedAt = new Date();
    }

    await db.update(tickets).set(updates).where(eq(tickets.id, id));

    for (const entry of historyEntries) {
      await db.insert(ticketHistory).values(entry);
    }

    return c.json({ success: true });
  } catch (error) {
    console.error("Error updating ticket:", error);
    return c.json({ error: "فشل في تحديث التذكرة" }, 500);
  }
});

app.post("/:id/reply", async (c) => {
  try {
    const { id: ticketId } = c.req.param();
    const body = await c.req.json();
    const id = `tr_${nanoid(12)}`;

    const [ticket] = await db.select().from(tickets).where(eq(tickets.id, ticketId));
    if (!ticket) return c.json({ error: "التذكرة غير موجودة" }, 404);

    await db.insert(ticketReplies).values({
      id, ticketId,
      content: body.content,
      replyType: body.replyType || "reply",
      isInternal: body.isInternal || false,
      attachments: body.attachments || null,
      createdBy: body.createdBy || null,
      createdAt: new Date(),
    });

    // تحديث وقت أول رد
    if (!ticket.firstResponseAt) {
      await db.update(tickets).set({ firstResponseAt: new Date(), updatedAt: new Date() }).where(eq(tickets.id, ticketId));
    }

    return c.json({ id }, 201);
  } catch (error) {
    console.error("Error creating ticket reply:", error);
    return c.json({ error: "فشل في إنشاء التذكرة" }, 500);
  }
});

app.post("/:id/rate", async (c) => {
  try {
    const { id } = c.req.param();
    const { rating, comment } = await c.req.json();

    await db.update(tickets).set({
      satisfactionRating: rating,
      satisfactionComment: comment || null,
      updatedAt: new Date(),
    }).where(eq(tickets.id, id));

    return c.json({ success: true });
  } catch (error) {
    console.error("Error updating ticket rating:", error);
    return c.json({ error: "فشل في تحديث التذكرة" }, 500);
  }
});

export default app;

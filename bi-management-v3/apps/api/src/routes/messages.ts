/**
 * API Routes - نظام المراسلات
 */
import { Hono } from "hono";
import { db, messages, messageRecipients, conversations, conversationMembers, conversationMessages } from "@bi-management/database";
import { eq, and, or, desc, count, not, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";
import { authMiddleware } from "../lib/auth.js";

const app = new Hono();

// صندوق الوارد
app.get("/inbox", async (c) => {
  try {
    const { userId, folder = "inbox", unreadOnly, page = "1", limit = "20" } = c.req.query();
    if (!userId) return c.json({ error: "userId مطلوب" }, 400);

    const conditions = [
      eq(messageRecipients.recipientId, userId),
      eq(messageRecipients.folder, folder),
      eq(messageRecipients.isDeleted, false),
    ];
    if (unreadOnly === "true") conditions.push(eq(messageRecipients.isRead, false));

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    const recipients = await db.select().from(messageRecipients)
      .where(and(...conditions))
      .orderBy(desc(messageRecipients.createdAt))
      .limit(limitNum).offset((pageNum - 1) * limitNum);

    const messageIds = recipients.map(r => r.messageId);
    const msgs = messageIds.length > 0 
      ? await db.select().from(messages).where(inArray(messages.id, messageIds))
      : [];

    const result = recipients.map(r => ({
      ...r,
      message: msgs.find(m => m.id === r.messageId),
    }));

    const [total] = await db.select({ count: count() }).from(messageRecipients).where(and(...conditions));
    const [unread] = await db.select({ count: count() }).from(messageRecipients)
      .where(and(eq(messageRecipients.recipientId, userId), eq(messageRecipients.isRead, false), eq(messageRecipients.isDeleted, false)));

    return c.json({ 
      messages: result,
      pagination: { page: pageNum, limit: limitNum, total: total?.count || 0 },
      unreadCount: unread?.count || 0,
    });
  } catch (error) {
    console.error("Get inbox error:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

// إرسال رسالة
app.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const id = `msg_${nanoid(12)}`;
    const threadId = body.replyToId ? body.threadId : id;

    await db.insert(messages).values({
      id,
      messageType: body.messageType || "direct",
      subject: body.subject || null,
      content: body.content,
      contentType: body.contentType || "text",
      senderId: body.senderId || null,
      priority: body.priority || "normal",
      attachments: body.attachments || null,
      replyToId: body.replyToId || null,
      threadId,
      isAnnouncement: body.isAnnouncement || false,
      isPinned: body.isPinned || false,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // إضافة المستلمين
    const recipients = body.recipients || [];
    for (const recipient of recipients) {
      await db.insert(messageRecipients).values({
        id: `mr_${nanoid(12)}`,
        messageId: id,
        recipientId: recipient.userId || null,
        recipientType: recipient.type || "user",
        departmentId: recipient.departmentId || null,
        folder: "inbox",
        createdAt: new Date(),
      });
    }

    // إضافة نسخة المرسل
    if (body.senderId) {
      await db.insert(messageRecipients).values({
        id: `mr_${nanoid(12)}`,
        messageId: id,
        recipientId: body.senderId,
        recipientType: "user",
        folder: "sent",
        isRead: true,
        readAt: new Date(),
        createdAt: new Date(),
      });
    }

    return c.json({ id }, 201);
  } catch (error) {
    console.error("Create message error:", error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

// قراءة رسالة
app.patch("/:id/read", async (c) => {
  try {
    const { id } = c.req.param();
    const { userId } = await c.req.json();

    await db.update(messageRecipients).set({
      isRead: true,
      readAt: new Date(),
    }).where(and(eq(messageRecipients.messageId, id), eq(messageRecipients.recipientId, userId)));

    return c.json({ success: true });
  } catch (error) {
    console.error("Mark message as read error:", error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

// نقل لمجلد
app.patch("/:id/move", async (c) => {
  try {
    const { id } = c.req.param();
    const { userId, folder } = await c.req.json();

    await db.update(messageRecipients).set({
      folder,
      isDeleted: folder === "trash",
      deletedAt: folder === "trash" ? new Date() : null,
    }).where(and(eq(messageRecipients.messageId, id), eq(messageRecipients.recipientId, userId)));

    return c.json({ success: true });
  } catch (error) {
    console.error("Move message error:", error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

// تمييز بنجمة
app.patch("/:id/star", async (c) => {
  try {
    const { id } = c.req.param();
    const { userId, starred } = await c.req.json();

    await db.update(messageRecipients).set({
      isStarred: starred,
    }).where(and(eq(messageRecipients.messageId, id), eq(messageRecipients.recipientId, userId)));

    return c.json({ success: true });
  } catch (error) {
    console.error("Star message error:", error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

// المحادثات
app.get("/conversations", async (c) => {
  try {
    const { userId } = c.req.query();
    if (!userId) return c.json({ error: "userId مطلوب" }, 400);

    const memberships = await db.select().from(conversationMembers)
      .where(and(eq(conversationMembers.userId, userId), eq(conversationMembers.leftAt, null)));

    const conversationIds = memberships.map(m => m.conversationId);
    const convs = conversationIds.length > 0
      ? await db.select().from(conversations)
          .where(and(inArray(conversations.id, conversationIds), eq(conversations.isActive, true)))
          .orderBy(desc(conversations.lastMessageAt))
      : [];

    const result = convs.map(conv => ({
      ...conv,
      membership: memberships.find(m => m.conversationId === conv.id),
    }));

    return c.json(result);
  } catch (error) {
    console.error("Get conversations error:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

// إنشاء محادثة
app.post("/conversations", async (c) => {
  try {
    const body = await c.req.json();
    const id = `conv_${nanoid(12)}`;

    await db.insert(conversations).values({
      id,
      name: body.name || null,
      description: body.description || null,
      conversationType: body.type || "private",
      createdBy: body.createdBy || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // إضافة الأعضاء
    const members = body.members || [];
    for (const member of members) {
      await db.insert(conversationMembers).values({
        id: `cm_${nanoid(12)}`,
        conversationId: id,
        userId: member.userId,
        role: member.userId === body.createdBy ? "admin" : "member",
        joinedAt: new Date(),
      });
    }

    return c.json({ id }, 201);
  } catch (error) {
    console.error("Create conversation error:", error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

// رسائل المحادثة
app.get("/conversations/:id/messages", async (c) => {
  try {
    const { id } = c.req.param();
    const { page = "1", limit = "50" } = c.req.query();

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    const msgs = await db.select().from(conversationMessages)
      .where(and(eq(conversationMessages.conversationId, id), eq(conversationMessages.isDeleted, false)))
      .orderBy(desc(conversationMessages.createdAt))
      .limit(limitNum).offset((pageNum - 1) * limitNum);

    return c.json(msgs.reverse());
  } catch (error) {
    console.error("Get conversation messages error:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

// إرسال رسالة في محادثة
app.post("/conversations/:id/messages", async (c) => {
  try {
    const { id: conversationId } = c.req.param();
    const body = await c.req.json();
    const id = `cmsg_${nanoid(12)}`;

    await db.insert(conversationMessages).values({
      id,
      conversationId,
      senderId: body.senderId || null,
      content: body.content,
      contentType: body.contentType || "text",
      attachments: body.attachments || null,
      replyToId: body.replyToId || null,
      createdAt: new Date(),
    });

    // تحديث المحادثة
    await db.update(conversations).set({
      lastMessageId: id,
      lastMessageAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(conversations.id, conversationId));

    // زيادة عداد غير المقروءة للأعضاء
    await db.update(conversationMembers).set({
      unreadCount: 1, // يمكن استخدام SQL increment
    }).where(and(
      eq(conversationMembers.conversationId, conversationId),
      not(eq(conversationMembers.userId, body.senderId || ""))
    ));

    return c.json({ id }, 201);
  } catch (error) {
    console.error("Create conversation message error:", error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

// الإعلانات
app.get("/announcements", async (c) => {
  try {
    const announcements = await db.select().from(messages)
      .where(and(eq(messages.isAnnouncement, true), eq(messages.isDeleted, false)))
      .orderBy(desc(messages.createdAt))
      .limit(20);

    return c.json(announcements);
  } catch (error) {
    console.error("Get announcements error:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

export default app;

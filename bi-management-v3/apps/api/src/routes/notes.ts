/**
 * API Routes - نظام الملاحظات
 */
import { Hono } from "hono";
import { db, notes, noteTemplates, quickNotes } from "@bi-management/database";
import { eq, and, or, desc, count, like, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";
import { authMiddleware } from "../lib/auth.js";

const app = new Hono();

// ============== الملاحظات ==============

// جلب ملاحظات كيان معين
app.get("/entity/:type/:id", async (c) => {
  try {
    const { type, id } = c.req.param();
    const result = await db.select().from(notes)
      .where(and(eq(notes.entityType, type), eq(notes.entityId, id)))
      .orderBy(desc(notes.isPinned), desc(notes.createdAt));
    return c.json({ notes: result });
  } catch (error) {
    return c.json({ error: "فشل في جلب الملاحظات" }, 500);
  }
});

// جلب كل الملاحظات (مع فلترة)
app.get("/", async (c) => {
  try {
    const { entityType, noteType, search, pinnedOnly, page = "1", limit = "20" } = c.req.query();
    const conditions = [];
    if (entityType) conditions.push(eq(notes.entityType, entityType));
    if (noteType) conditions.push(eq(notes.noteType, noteType));
    if (search) conditions.push(or(like(notes.content, `%${search}%`), like(notes.title, `%${search}%`)));
    if (pinnedOnly === "true") conditions.push(eq(notes.isPinned, true));

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    const result = await db.select().from(notes)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(notes.isPinned), desc(notes.createdAt))
      .limit(limitNum).offset((pageNum - 1) * limitNum);

    const [total] = await db.select({ count: count() }).from(notes)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    return c.json({ notes: result, pagination: { page: pageNum, limit: limitNum, total: total?.count || 0 } });
  } catch (error) {
    return c.json({ error: "فشل" }, 500);
  }
});

// إنشاء ملاحظة
app.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const id = `note_${nanoid(12)}`;

    await db.insert(notes).values({
      id,
      title: body.title || null,
      content: body.content,
      entityType: body.entityType,
      entityId: body.entityId,
      entityName: body.entityName || null,
      noteType: body.noteType || "general",
      isPinned: body.isPinned || false,
      isPrivate: body.isPrivate || false,
      color: body.color || null,
      reminderAt: body.reminderAt ? new Date(body.reminderAt) : null,
      attachments: body.attachments || null,
      mentions: body.mentions || null,
      createdBy: body.createdBy || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return c.json({ id }, 201);
  } catch (error) {
    console.error("Create note error:", error);
    return c.json({ error: "فشل في إنشاء الملاحظة" }, 500);
  }
});

// تحديث ملاحظة
app.put("/:id", async (c) => {
  try {
    const { id } = c.req.param();
    const body = await c.req.json();

    await db.update(notes).set({
      title: body.title,
      content: body.content,
      noteType: body.noteType,
      isPinned: body.isPinned,
      color: body.color,
      reminderAt: body.reminderAt ? new Date(body.reminderAt) : null,
      updatedAt: new Date(),
    }).where(eq(notes.id, id));

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: "فشل" }, 500);
  }
});

// حذف ملاحظة
app.delete("/:id", async (c) => {
  try {
    const { id } = c.req.param();
    await db.delete(notes).where(eq(notes.id, id));
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: "فشل" }, 500);
  }
});

// تثبيت/إلغاء تثبيت
app.post("/:id/toggle-pin", async (c) => {
  try {
    const { id } = c.req.param();
    const [note] = await db.select().from(notes).where(eq(notes.id, id));
    if (!note) return c.json({ error: "الملاحظة غير موجودة" }, 404);

    await db.update(notes).set({ isPinned: !note.isPinned, updatedAt: new Date() }).where(eq(notes.id, id));
    return c.json({ isPinned: !note.isPinned });
  } catch (error) {
    return c.json({ error: "فشل" }, 500);
  }
});

// ============== القوالب ==============

app.get("/templates", async (c) => {
  try {
    const result = await db.select().from(noteTemplates).where(eq(noteTemplates.isActive, true));
    return c.json({ templates: result });
  } catch (error) {
    return c.json({ error: "فشل" }, 500);
  }
});

app.post("/templates", async (c) => {
  try {
    const body = await c.req.json();
    const id = `tmpl_${nanoid(12)}`;
    await db.insert(noteTemplates).values({
      id, name: body.name, content: body.content,
      category: body.category || null, entityType: body.entityType || null,
      createdBy: body.createdBy || null, createdAt: new Date(),
    });
    return c.json({ id }, 201);
  } catch (error) {
    return c.json({ error: "فشل" }, 500);
  }
});

// ============== الملاحظات السريعة ==============

app.get("/quick/:userId", async (c) => {
  try {
    const { userId } = c.req.param();
    const result = await db.select().from(quickNotes).where(eq(quickNotes.userId, userId)).orderBy(quickNotes.sortOrder);
    return c.json({ quickNotes: result });
  } catch (error) {
    return c.json({ error: "فشل" }, 500);
  }
});

app.post("/quick", async (c) => {
  try {
    const body = await c.req.json();
    const id = `qn_${nanoid(12)}`;
    await db.insert(quickNotes).values({
      id, userId: body.userId, content: body.content,
      color: body.color || null, createdAt: new Date(), updatedAt: new Date(),
    });
    return c.json({ id }, 201);
  } catch (error) {
    return c.json({ error: "فشل" }, 500);
  }
});

app.delete("/quick/:id", async (c) => {
  try {
    const { id } = c.req.param();
    await db.delete(quickNotes).where(eq(quickNotes.id, id));
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: "فشل" }, 500);
  }
});

export default app;

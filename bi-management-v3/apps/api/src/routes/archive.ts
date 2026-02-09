/**
 * API Routes - نظام الأرشيف
 */
import { Hono } from "hono";
import { db, archivedItems, backups, retentionPolicies, archiveLog } from "@bi-management/database";
import { eq, and, or, desc, count, like, gte, lte } from "drizzle-orm";
import { nanoid } from "nanoid";
import { authMiddleware } from "../lib/auth.js";

const app = new Hono();

// ============== العناصر المؤرشفة ==============

app.get("/items", async (c) => {
  try {
    const { entityType, category, search, page = "1", limit = "20" } = c.req.query();
    const conditions = [];
    if (entityType) conditions.push(eq(archivedItems.entityType, entityType));
    if (category) conditions.push(eq(archivedItems.category, category));
    if (search) conditions.push(or(
      like(archivedItems.title, `%${search}%`),
      like(archivedItems.searchText, `%${search}%`)
    ));

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    const result = await db.select().from(archivedItems)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(archivedItems.archivedAt))
      .limit(limitNum).offset((pageNum - 1) * limitNum);

    const [total] = await db.select({ count: count() }).from(archivedItems)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    return c.json({ items: result, pagination: { page: pageNum, limit: limitNum, total: total?.count || 0 } });
  } catch (error) {
    return c.json({ error: "فشل" }, 500);
  }
});

app.get("/stats", async (c) => {
  try {
    const [total] = await db.select({ count: count() }).from(archivedItems);

    const typeStats = await db.select({ type: archivedItems.entityType, count: count() })
      .from(archivedItems).groupBy(archivedItems.entityType);

    const categoryStats = await db.select({ category: archivedItems.category, count: count() })
      .from(archivedItems).groupBy(archivedItems.category);

    const [backupsCount] = await db.select({ count: count() }).from(backups);

    return c.json({
      totalItems: total?.count || 0,
      totalBackups: backupsCount?.count || 0,
      byType: typeStats.reduce((acc, s) => ({ ...acc, [s.type || "other"]: s.count }), {}),
      byCategory: categoryStats.reduce((acc, s) => ({ ...acc, [s.category || "other"]: s.count }), {}),
    });
  } catch (error) {
    return c.json({ error: "فشل" }, 500);
  }
});

app.get("/items/:id", async (c) => {
  try {
    const { id } = c.req.param();
    const [item] = await db.select().from(archivedItems).where(eq(archivedItems.id, id));
    if (!item) return c.json({ error: "العنصر غير موجود" }, 404);
    return c.json(item);
  } catch (error) {
    return c.json({ error: "فشل" }, 500);
  }
});

app.post("/items", async (c) => {
  try {
    const body = await c.req.json();
    const id = `arch_${nanoid(12)}`;

    await db.insert(archivedItems).values({
      id,
      entityType: body.entityType,
      entityId: body.entityId,
      title: body.title,
      description: body.description || null,
      originalData: body.originalData || null,
      category: body.category || null,
      tags: body.tags || null,
      archivePeriod: body.archivePeriod || null,
      archiveReason: body.archiveReason || null,
      retentionPeriod: body.retentionPeriod || null,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      searchText: body.searchText || body.title,
      archivedBy: body.archivedBy || null,
      archivedAt: new Date(),
      createdAt: new Date(),
    });

    await db.insert(archiveLog).values({
      id: `alog_${nanoid(12)}`,
      operation: "archive",
      entityType: body.entityType,
      entityId: body.entityId,
      status: "success",
      performedBy: body.archivedBy || null,
      createdAt: new Date(),
    });

    return c.json({ id }, 201);
  } catch (error) {
    return c.json({ error: "فشل" }, 500);
  }
});

app.delete("/items/:id", async (c) => {
  try {
    const { id } = c.req.param();
    const [item] = await db.select().from(archivedItems).where(eq(archivedItems.id, id));
    if (item?.isLocked) return c.json({ error: "العنصر مقفل ولا يمكن حذفه" }, 403);

    await db.delete(archivedItems).where(eq(archivedItems.id, id));

    await db.insert(archiveLog).values({
      id: `alog_${nanoid(12)}`,
      operation: "delete",
      entityType: item?.entityType,
      entityId: item?.entityId,
      status: "success",
      createdAt: new Date(),
    });

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: "فشل" }, 500);
  }
});

// ============== النسخ الاحتياطية ==============

app.get("/backups", async (c) => {
  try {
    const result = await db.select().from(backups).orderBy(desc(backups.createdAt));
    return c.json({ backups: result });
  } catch (error) {
    return c.json({ error: "فشل" }, 500);
  }
});

app.post("/backups", async (c) => {
  try {
    const body = await c.req.json();
    const id = `bkp_${nanoid(12)}`;

    await db.insert(backups).values({
      id,
      name: body.name || `نسخة احتياطية ${new Date().toLocaleDateString("ar-IQ")}`,
      description: body.description || null,
      backupType: body.backupType || "full",
      scope: body.scope || "all",
      includedTables: body.includedTables || null,
      status: "pending",
      createdBy: body.createdBy || null,
      createdAt: new Date(),
    });

    // في بيئة حقيقية، سيتم تشغيل عملية النسخ الاحتياطي بشكل غير متزامن
    await db.update(backups).set({
      status: "completed",
      startedAt: new Date(),
      completedAt: new Date(),
      progress: 100,
      size: "0", // سيتم حسابها فعلياً
    }).where(eq(backups.id, id));

    return c.json({ id }, 201);
  } catch (error) {
    return c.json({ error: "فشل" }, 500);
  }
});

app.post("/backups/:id/restore", async (c) => {
  try {
    const { id } = c.req.param();

    await db.update(backups).set({
      lastRestoredAt: new Date(),
      restoreCount: (await db.select().from(backups).where(eq(backups.id, id)))[0]?.restoreCount + 1 || 1,
    }).where(eq(backups.id, id));

    await db.insert(archiveLog).values({
      id: `alog_${nanoid(12)}`,
      operation: "restore",
      details: `استعادة النسخة ${id}`,
      status: "success",
      createdAt: new Date(),
    });

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: "فشل" }, 500);
  }
});

// ============== سياسات الاحتفاظ ==============

app.get("/policies", async (c) => {
  try {
    const result = await db.select().from(retentionPolicies).orderBy(retentionPolicies.entityType);
    return c.json({ policies: result });
  } catch (error) {
    return c.json({ error: "فشل" }, 500);
  }
});

app.post("/policies", async (c) => {
  try {
    const body = await c.req.json();
    const id = `rp_${nanoid(12)}`;

    await db.insert(retentionPolicies).values({
      id,
      name: body.name,
      description: body.description || null,
      entityType: body.entityType,
      retentionPeriod: body.retentionPeriod,
      action: body.action || "archive",
      conditions: body.conditions || null,
      runFrequency: body.runFrequency || "monthly",
      createdBy: body.createdBy || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return c.json({ id }, 201);
  } catch (error) {
    return c.json({ error: "فشل" }, 500);
  }
});

// ============== السجل ==============

app.get("/log", async (c) => {
  try {
    const { operation, page = "1", limit = "50" } = c.req.query();
    const conditions = operation ? [eq(archiveLog.operation, operation)] : [];

    const result = await db.select().from(archiveLog)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(archiveLog.createdAt))
      .limit(parseInt(limit)).offset((parseInt(page) - 1) * parseInt(limit));

    return c.json({ log: result });
  } catch (error) {
    return c.json({ error: "فشل" }, 500);
  }
});

export default app;

/**
 * API Routes - نظام المرفقات والملفات
 */
import { Hono } from "hono";
import { db, files, folders, fileShares, fileDownloads } from "@bi-management/database";
import { eq, and, or, desc, count, like, sum, isNull } from "drizzle-orm";
import { nanoid } from "nanoid";
import { authMiddleware } from "../lib/auth.js";

const app = new Hono();

// ============== المجلدات ==============

app.get("/folders", async (c) => {
  try {
    const { parentId } = c.req.query();
    const conditions = parentId ? [eq(folders.parentId, parentId)] : [isNull(folders.parentId)];
    
    const result = await db.select().from(folders)
      .where(and(...conditions))
      .orderBy(folders.name);

    return c.json({ folders: result });
  } catch (error) {
    console.error("Get folders error:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.post("/folders", async (c) => {
  try {
    const body = await c.req.json();
    const id = `fld_${nanoid(12)}`;

    let parentPath = "";
    if (body.parentId) {
      const [parent] = await db.select().from(folders).where(eq(folders.id, body.parentId));
      if (parent) parentPath = parent.path;
    }

    const path = parentPath ? `${parentPath}/${body.name}` : `/${body.name}`;

    await db.insert(folders).values({
      id,
      name: body.name,
      parentId: body.parentId || null,
      path,
      folderType: body.folderType || "general",
      isPublic: body.isPublic || false,
      color: body.color || null,
      icon: body.icon || null,
      createdBy: body.createdBy || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return c.json({ id, path }, 201);
  } catch (error) {
    console.error("Create folder error:", error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

app.delete("/folders/:id", async (c) => {
  try {
    const { id } = c.req.param();
    // حذف الملفات داخل المجلد
    await db.delete(files).where(eq(files.folderId, id));
    // حذف المجلد
    await db.delete(folders).where(eq(folders.id, id));
    return c.json({ success: true });
  } catch (error) {
    console.error("Delete folder error:", error);
    return c.json({ error: "فشل في حذف السجل" }, 500);
  }
});

// ============== الملفات ==============

app.get("/", async (c) => {
  try {
    const { folderId, entityType, entityId, category, search, page = "1", limit = "20" } = c.req.query();
    const conditions = [];
    
    if (folderId) conditions.push(eq(files.folderId, folderId));
    else if (!entityType) conditions.push(isNull(files.folderId));
    
    if (entityType) conditions.push(eq(files.entityType, entityType));
    if (entityId) conditions.push(eq(files.entityId, entityId));
    if (category) conditions.push(eq(files.category, category));
    if (search) conditions.push(or(like(files.name, `%${search}%`), like(files.originalName, `%${search}%`)));

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    const result = await db.select().from(files)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(files.createdAt))
      .limit(limitNum).offset((pageNum - 1) * limitNum);

    const [total] = await db.select({ count: count() }).from(files)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    return c.json({ files: result, pagination: { page: pageNum, limit: limitNum, total: total?.count || 0 } });
  } catch (error) {
    return c.json({ error: "فشل" }, 500);
  }
});

app.get("/stats", async (c) => {
  try {
    const [totalFiles] = await db.select({ count: count() }).from(files);
    const [totalSize] = await db.select({ size: sum(files.size) }).from(files);

    const categoryStats = await db.select({ category: files.category, count: count() })
      .from(files).groupBy(files.category);

    return c.json({
      totalFiles: totalFiles?.count || 0,
      totalSize: totalSize?.size || 0,
      byCategory: categoryStats.reduce((acc, s) => ({ ...acc, [s.category || "other"]: s.count }), {}),
    });
  } catch (error) {
    console.error("Get stats error:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.get("/:id", async (c) => {
  try {
    const { id } = c.req.param();
    const [file] = await db.select().from(files).where(eq(files.id, id));
    if (!file) return c.json({ error: "الملف غير موجود" }, 404);
    return c.json(file);
  } catch (error) {
    console.error("Get file error:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

// تسجيل ملف (يُستخدم بعد رفع الملف الفعلي)
app.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const id = `file_${nanoid(12)}`;

    const extension = body.originalName.split(".").pop()?.toLowerCase() || "";
    let category = "other";
    if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(extension)) category = "image";
    else if (["mp4", "webm", "mov", "avi"].includes(extension)) category = "video";
    else if (["mp3", "wav", "ogg"].includes(extension)) category = "audio";
    else if (["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt"].includes(extension)) category = "document";
    else if (["zip", "rar", "7z", "tar", "gz"].includes(extension)) category = "archive";

    let folderPath = "/";
    if (body.folderId) {
      const [folder] = await db.select().from(folders).where(eq(folders.id, body.folderId));
      if (folder) folderPath = folder.path;
    }

    await db.insert(files).values({
      id,
      name: body.name || body.originalName,
      originalName: body.originalName,
      folderId: body.folderId || null,
      path: `${folderPath}/${body.originalName}`,
      url: body.url,
      mimeType: body.mimeType,
      extension,
      size: body.size,
      entityType: body.entityType || null,
      entityId: body.entityId || null,
      description: body.description || null,
      tags: body.tags || null,
      category,
      metadata: body.metadata || null,
      isPublic: body.isPublic || false,
      uploadedBy: body.uploadedBy || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return c.json({ id }, 201);
  } catch (error) {
    console.error("Create file error:", error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

app.put("/:id", async (c) => {
  try {
    const { id } = c.req.param();
    const body = await c.req.json();

    await db.update(files).set({
      name: body.name,
      description: body.description,
      tags: body.tags,
      isPublic: body.isPublic,
      updatedAt: new Date(),
    }).where(eq(files.id, id));

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: "فشل" }, 500);
  }
});

app.delete("/:id", async (c) => {
  try {
    const { id } = c.req.param();
    await db.delete(files).where(eq(files.id, id));
    return c.json({ success: true });
  } catch (error) {
    console.error("Delete file error:", error);
    return c.json({ error: "فشل في حذف السجل" }, 500);
  }
});

// تسجيل تحميل
app.post("/:id/download", async (c) => {
  try {
    const { id } = c.req.param();
    const body = await c.req.json();

    await db.insert(fileDownloads).values({
      id: `fd_${nanoid(12)}`,
      fileId: id,
      downloadedBy: body.downloadedBy || null,
      ipAddress: body.ipAddress || null,
      userAgent: body.userAgent || null,
      createdAt: new Date(),
    });

    await db.update(files).set({
      downloadCount: (await db.select().from(files).where(eq(files.id, id)))[0]?.downloadCount + 1 || 1,
      lastDownloadedAt: new Date(),
    }).where(eq(files.id, id));

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: "فشل" }, 500);
  }
});

// ============== المشاركة ==============

app.post("/:id/share", async (c) => {
  try {
    const { id: fileId } = c.req.param();
    const body = await c.req.json();
    const shareId = `fsh_${nanoid(12)}`;
    const shareToken = nanoid(32);

    await db.insert(fileShares).values({
      id: shareId,
      fileId,
      shareType: body.shareType || "link",
      sharedWithUserId: body.sharedWithUserId || null,
      sharedWithRole: body.sharedWithRole || null,
      shareToken,
      shareUrl: `/shared/${shareToken}`,
      permissions: body.permissions || "view",
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      maxDownloads: body.maxDownloads || null,
      password: body.password || null,
      sharedBy: body.sharedBy || null,
      createdAt: new Date(),
    });

    return c.json({ id: shareId, shareToken, shareUrl: `/shared/${shareToken}` }, 201);
  } catch (error) {
    console.error("Share file error:", error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

app.get("/shared/:token", async (c) => {
  try {
    const { token } = c.req.param();
    const [share] = await db.select().from(fileShares).where(eq(fileShares.shareToken, token));
    if (!share) return c.json({ error: "الرابط غير صالح" }, 404);
    if (share.expiresAt && new Date(share.expiresAt) < new Date()) return c.json({ error: "الرابط منتهي الصلاحية" }, 410);
    if (share.maxDownloads && share.downloadCount >= share.maxDownloads) return c.json({ error: "تم تجاوز الحد الأقصى للتحميلات" }, 410);

    const [file] = await db.select().from(files).where(eq(files.id, share.fileId));
    return c.json({ file, share });
  } catch (error) {
    console.error("Get shared file error:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

export default app;

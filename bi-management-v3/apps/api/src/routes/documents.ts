/**
 * API Routes - نظام إدارة المستندات
 */
import { Hono } from "hono";
import { db, documents, signatures, documentFolders, documentViews } from "@bi-management/database";
import { eq, and, or, desc, count, like, isNull } from "drizzle-orm";
import { nanoid } from "nanoid";
import { authMiddleware } from "../lib/auth.js";

const app = new Hono();


const generateDocNumber = () => `DOC-${Date.now().toString(36).toUpperCase()}`;

// المستندات
app.get("/", async (c) => {
  try {
    const { type, status, category, folderId, search, page = "1", limit = "20" } = c.req.query();
    const conditions = [];

    if (type) conditions.push(eq(documents.documentType, type));
    if (status) conditions.push(eq(documents.status, status));
    if (category) conditions.push(eq(documents.category, category));
    if (folderId) conditions.push(eq(documents.category, folderId));
    if (search) conditions.push(or(
      like(documents.title, `%${search}%`),
      like(documents.documentNumber, `%${search}%`)
    ));

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    const result = await db.select().from(documents)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(documents.createdAt))
      .limit(limitNum).offset((pageNum - 1) * limitNum);

    const [total] = await db.select({ count: count() }).from(documents)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    return c.json({ documents: result, pagination: { page: pageNum, limit: limitNum, total: total?.count || 0 } });
  } catch (error) {
    return c.json({ error: "فشل" }, 500);
  }
});

app.get("/stats", async (c) => {
  try {
    const [total] = await db.select({ count: count() }).from(documents);
    const [pending] = await db.select({ count: count() }).from(documents).where(eq(documents.status, "pending_review"));
    const [needSign] = await db.select({ count: count() }).from(documents)
      .where(and(eq(documents.requiresSignature, true), eq(documents.signatureStatus, "pending")));
    const [expired] = await db.select({ count: count() }).from(documents)
      .where(and(eq(documents.status, "approved"), like(documents.expiryDate?.toString() || "", "%")));

    const typeStats = await db.select({ type: documents.documentType, count: count() })
      .from(documents).groupBy(documents.documentType);

    return c.json({
      total: total?.count || 0,
      pendingReview: pending?.count || 0,
      pendingSignature: needSign?.count || 0,
      expired: expired?.count || 0,
      byType: typeStats.reduce((acc, s) => ({ ...acc, [s.type || "other"]: s.count }), {}),
    });
  } catch (error) {
    return c.json({ error: "فشل" }, 500);
  }
});

app.get("/:id", async (c) => {
  try {
    const { id } = c.req.param();
    const [doc] = await db.select().from(documents).where(eq(documents.id, id));
    if (!doc) return c.json({ error: "المستند غير موجود" }, 404);

    const docSignatures = await db.select().from(signatures)
      .where(eq(signatures.documentId, id))
      .orderBy(signatures.signOrder);

    const views = await db.select({ count: count() }).from(documentViews)
      .where(eq(documentViews.documentId, id));

    return c.json({ ...doc, signatures: docSignatures, viewCount: views[0]?.count || 0 });
  } catch (error) {
    return c.json({ error: "فشل" }, 500);
  }
});

app.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const id = `doc_${nanoid(12)}`;
    const documentNumber = generateDocNumber();

    await db.insert(documents).values({
      id, documentNumber,
      title: body.title,
      description: body.description || null,
      documentType: body.documentType || "general",
      category: body.category || null,
      fileName: body.fileName || null,
      fileUrl: body.fileUrl || null,
      fileType: body.fileType || null,
      fileSize: body.fileSize || null,
      status: "draft",
      requiresSignature: body.requiresSignature || false,
      isPublic: body.isPublic || false,
      isConfidential: body.isConfidential || false,
      accessLevel: body.accessLevel || "standard",
      branchId: body.branchId || null,
      departmentId: body.departmentId || null,
      effectiveDate: body.effectiveDate ? new Date(body.effectiveDate) : null,
      expiryDate: body.expiryDate ? new Date(body.expiryDate) : null,
      tags: body.tags || null,
      metadata: body.metadata || null,
      createdBy: body.createdBy || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // إضافة التوقيعات المطلوبة
    if (body.signers && body.signers.length > 0) {
      for (let i = 0; i < body.signers.length; i++) {
        const signer = body.signers[i];
        await db.insert(signatures).values({
          id: `sig_${nanoid(12)}`,
          documentId: id,
          signerId: signer.userId || null,
          signerName: signer.name,
          signerEmail: signer.email || null,
          signerRole: signer.role || "approver",
          status: "pending",
          signOrder: i + 1,
          verificationCode: nanoid(8).toUpperCase(),
          requestedAt: new Date(),
          expiresAt: body.signatureExpiry ? new Date(body.signatureExpiry) : null,
        });
      }
      await db.update(documents).set({ signatureStatus: "pending" }).where(eq(documents.id, id));
    }

    return c.json({ id, documentNumber }, 201);
  } catch (error) {
    return c.json({ error: "فشل" }, 500);
  }
});

app.patch("/:id/status", async (c) => {
  try {
    const { id } = c.req.param();
    const { status, updatedBy } = await c.req.json();

    await db.update(documents).set({
      status,
      updatedBy: updatedBy || null,
      updatedAt: new Date(),
    }).where(eq(documents.id, id));

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: "فشل" }, 500);
  }
});

// التوقيعات
app.post("/:id/sign", async (c) => {
  try {
    const { id: documentId } = c.req.param();
    const body = await c.req.json();

    const [signature] = await db.select().from(signatures)
      .where(and(eq(signatures.documentId, documentId), eq(signatures.signerId, body.signerId)));

    if (!signature) return c.json({ error: "التوقيع غير موجود" }, 404);
    if (signature.status === "signed") return c.json({ error: "تم التوقيع مسبقاً" }, 400);

    await db.update(signatures).set({
      status: "signed",
      signatureType: body.signatureType || "electronic",
      signatureData: body.signatureData || null,
      signedAt: new Date(),
      ipAddress: body.ipAddress || null,
      userAgent: body.userAgent || null,
      isVerified: true,
    }).where(eq(signatures.id, signature.id));

    // تحقق من اكتمال جميع التوقيعات
    const allSignatures = await db.select().from(signatures).where(eq(signatures.documentId, documentId));
    const allSigned = allSignatures.every(s => s.status === "signed");

    if (allSigned) {
      await db.update(documents).set({
        signatureStatus: "completed",
        signedAt: new Date(),
        status: "approved",
        updatedAt: new Date(),
      }).where(eq(documents.id, documentId));
    } else {
      const signedCount = allSignatures.filter(s => s.status === "signed").length;
      await db.update(documents).set({
        signatureStatus: signedCount > 0 ? "partial" : "pending",
        updatedAt: new Date(),
      }).where(eq(documents.id, documentId));
    }

    return c.json({ success: true, allSigned });
  } catch (error) {
    return c.json({ error: "فشل" }, 500);
  }
});

app.post("/:id/decline", async (c) => {
  try {
    const { id: documentId } = c.req.param();
    const { signerId, reason } = await c.req.json();

    await db.update(signatures).set({
      status: "declined",
      declinedAt: new Date(),
      declineReason: reason || null,
    }).where(and(eq(signatures.documentId, documentId), eq(signatures.signerId, signerId)));

    await db.update(documents).set({
      status: "rejected",
      updatedAt: new Date(),
    }).where(eq(documents.id, documentId));

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: "فشل" }, 500);
  }
});

// المجلدات
app.get("/folders", async (c) => {
  try {
    const { parentId } = c.req.query();
    const condition = parentId ? eq(documentFolders.parentId, parentId) : isNull(documentFolders.parentId);
    const folders = await db.select().from(documentFolders).where(condition);
    return c.json(folders);
  } catch (error) {
    return c.json({ error: "فشل" }, 500);
  }
});

app.post("/folders", async (c) => {
  try {
    const body = await c.req.json();
    const id = `fld_${nanoid(12)}`;

    let path = `/${body.name}`;
    if (body.parentId) {
      const [parent] = await db.select().from(documentFolders).where(eq(documentFolders.id, body.parentId));
      if (parent) path = `${parent.path}/${body.name}`;
    }

    await db.insert(documentFolders).values({
      id,
      name: body.name,
      description: body.description || null,
      parentId: body.parentId || null,
      path,
      color: body.color || null,
      icon: body.icon || null,
      branchId: body.branchId || null,
      departmentId: body.departmentId || null,
      createdBy: body.createdBy || null,
      createdAt: new Date(),
    });

    return c.json({ id }, 201);
  } catch (error) {
    return c.json({ error: "فشل" }, 500);
  }
});

// تسجيل العرض
app.post("/:id/view", async (c) => {
  try {
    const { id: documentId } = c.req.param();
    const body = await c.req.json();

    await db.insert(documentViews).values({
      id: `dv_${nanoid(12)}`,
      documentId,
      viewerId: body.viewerId || null,
      viewedAt: new Date(),
      ipAddress: body.ipAddress || null,
    });

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: "فشل" }, 500);
  }
});

export default app;

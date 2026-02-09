/**
 * API Routes - نظام الضمانات
 */
import { Hono } from "hono";
import {
  db, productWarranties, warrantyClaims, warrantyPolicies, warrantyActivities,
  products, serialNumbers, customers, users, invoices
} from "@bi-management/database";
import { eq, and, or, desc, asc, count, sql, like, gte, lte, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";
import { authMiddleware } from "../lib/auth.js";

const app = new Hono();

/**
 * توليد رقم ضمان فريد
 */
async function generateWarrantyNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `WR-${year}-`;
  const [last] = await db.select({ warrantyNumber: productWarranties.warrantyNumber })
    .from(productWarranties).where(like(productWarranties.warrantyNumber, `${prefix}%`))
    .orderBy(desc(productWarranties.warrantyNumber)).limit(1);
  const nextNum = last?.warrantyNumber ? parseInt(last.warrantyNumber.replace(prefix, ""), 10) + 1 : 1;
  return `${prefix}${String(nextNum).padStart(6, "0")}`;
}

/**
 * توليد رقم مطالبة فريد
 */
async function generateClaimNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `WC-${year}-`;
  const [last] = await db.select({ claimNumber: warrantyClaims.claimNumber })
    .from(warrantyClaims).where(like(warrantyClaims.claimNumber, `${prefix}%`))
    .orderBy(desc(warrantyClaims.claimNumber)).limit(1);
  const nextNum = last?.claimNumber ? parseInt(last.claimNumber.replace(prefix, ""), 10) + 1 : 1;
  return `${prefix}${String(nextNum).padStart(6, "0")}`;
}

/**
 * تسجيل نشاط
 */
async function logActivity(warrantyId: string | null, claimId: string | null, type: string, desc: string, userId?: string, meta?: any) {
  await db.insert(warrantyActivities).values({
    id: `wa_${nanoid(12)}`,
    warrantyId, claimId, activityType: type, description: desc,
    performedBy: userId || null, metadata: meta || null, createdAt: new Date(),
  });
}

// ========== الضمانات ==========

/**
 * جلب جميع الضمانات
 */
app.get("/", async (c) => {
  try {
    const { status, search, expiringSoon, page = "1", limit = "20" } = c.req.query();
    const conditions = [];

    if (status) conditions.push(inArray(productWarranties.status, status.split(",")));
    if (search) {
      conditions.push(or(
        like(productWarranties.warrantyNumber, `%${search}%`),
        like(productWarranties.serialNumber, `%${search}%`),
        like(productWarranties.customerName, `%${search}%`),
        like(productWarranties.customerPhone, `%${search}%`)
      ));
    }
    if (expiringSoon === "true") {
      const thirtyDaysLater = new Date();
      thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
      conditions.push(and(eq(productWarranties.status, "active"), lte(productWarranties.endDate, thirtyDaysLater)));
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    const warranties = await db.select({
      warranty: productWarranties,
      product: { id: products.id, nameAr: products.nameAr },
      customer: { id: customers.id, fullName: customers.name },
    }).from(productWarranties)
      .leftJoin(products, eq(productWarranties.productId, products.id))
      .leftJoin(customers, eq(productWarranties.customerId, customers.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(productWarranties.createdAt))
      .limit(limitNum).offset((pageNum - 1) * limitNum);

    const [totalResult] = await db.select({ count: count() }).from(productWarranties)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    return c.json({
      warranties: warranties.map(w => ({ ...w.warranty, product: w.product, customer: w.customer })),
      pagination: { page: pageNum, limit: limitNum, total: totalResult?.count || 0, totalPages: Math.ceil((totalResult?.count || 0) / limitNum) },
    });
  } catch (error) {
    console.error("Warranties error:", error);
    return c.json({ error: "فشل في جلب الضمانات" }, 500);
  }
});

/**
 * إحصائيات الضمانات
 */
app.get("/stats", async (c) => {
  try {
    const stats = await db.select({ status: productWarranties.status, count: count() })
      .from(productWarranties).groupBy(productWarranties.status);

    const thirtyDaysLater = new Date();
    thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
    const [expiring] = await db.select({ count: count() }).from(productWarranties)
      .where(and(eq(productWarranties.status, "active"), lte(productWarranties.endDate, thirtyDaysLater), gte(productWarranties.endDate, new Date())));

    const [pendingClaims] = await db.select({ count: count() }).from(warrantyClaims)
      .where(or(eq(warrantyClaims.status, "pending"), eq(warrantyClaims.status, "approved"), eq(warrantyClaims.status, "in_repair")));

    return c.json({
      byStatus: stats.reduce((acc, s) => ({ ...acc, [s.status || "unknown"]: s.count }), {}),
      expiringSoon: expiring?.count || 0,
      pendingClaims: pendingClaims?.count || 0,
    });
  } catch (error) {
    return c.json({ error: "فشل في جلب الإحصائيات" }, 500);
  }
});

/**
 * تفاصيل ضمان
 */
app.get("/:id", async (c) => {
  try {
    const { id } = c.req.param();
    const [warranty] = await db.select({
      warranty: productWarranties,
      product: { id: products.id, nameAr: products.nameAr, name: products.name },
      customer: { id: customers.id, fullName: customers.name, phone: customers.phone, email: customers.email },
      policy: { id: warrantyPolicies.id, name: warrantyPolicies.name, durationMonths: warrantyPolicies.durationMonths },
    }).from(productWarranties)
      .leftJoin(products, eq(productWarranties.productId, products.id))
      .leftJoin(customers, eq(productWarranties.customerId, customers.id))
      .leftJoin(warrantyPolicies, eq(productWarranties.policyId, warrantyPolicies.id))
      .where(or(eq(productWarranties.id, id), eq(productWarranties.warrantyNumber, id)));

    if (!warranty) return c.json({ error: "الضمان غير موجود" }, 404);

    const claims = await db.select().from(warrantyClaims)
      .where(eq(warrantyClaims.warrantyId, warranty.warranty.id))
      .orderBy(desc(warrantyClaims.createdAt));

    const activities = await db.select({ activity: warrantyActivities, user: { fullName: users.fullName } })
      .from(warrantyActivities).leftJoin(users, eq(warrantyActivities.performedBy, users.id))
      .where(eq(warrantyActivities.warrantyId, warranty.warranty.id))
      .orderBy(desc(warrantyActivities.createdAt)).limit(20);

    return c.json({
      ...warranty.warranty,
      product: warranty.product,
      customer: warranty.customer,
      policy: warranty.policy,
      claims,
      activities: activities.map(a => ({ ...a.activity, user: a.user })),
    });
  } catch (error) {
    return c.json({ error: "فشل في جلب الضمان" }, 500);
  }
});

/**
 * تسجيل ضمان جديد
 */
app.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const { productId, serialNumberId, serialNumber, customerId, customerName, customerPhone, customerEmail,
      invoiceId, invoiceNumber, policyId, purchaseDate, durationMonths = 12, notes, registeredBy } = body;

    const id = `warranty_${nanoid(12)}`;
    const warrantyNumber = await generateWarrantyNumber();
    
    const start = new Date(purchaseDate || new Date());
    const end = new Date(start);
    end.setMonth(end.getMonth() + durationMonths);

    await db.insert(productWarranties).values({
      id, warrantyNumber, productId, serialNumberId, serialNumber, customerId,
      customerName, customerPhone, customerEmail, invoiceId, invoiceNumber, policyId,
      purchaseDate: start, startDate: start, endDate: end, status: "active",
      notes, registeredBy, createdAt: new Date(), updatedAt: new Date(),
    });

    await logActivity(id, null, "registered", "تم تسجيل الضمان", registeredBy);

    return c.json({ id, warrantyNumber, message: "تم تسجيل الضمان بنجاح" }, 201);
  } catch (error) {
    console.error("Register warranty error:", error);
    return c.json({ error: "فشل في تسجيل الضمان" }, 500);
  }
});

/**
 * تمديد الضمان
 */
app.post("/:id/extend", async (c) => {
  try {
    const { id } = c.req.param();
    const { months, userId } = await c.req.json();

    const [warranty] = await db.select().from(productWarranties).where(eq(productWarranties.id, id));
    if (!warranty) return c.json({ error: "الضمان غير موجود" }, 404);

    const newEndDate = new Date(warranty.endDate);
    newEndDate.setMonth(newEndDate.getMonth() + months);

    await db.update(productWarranties).set({ endDate: newEndDate, status: "active", updatedAt: new Date() })
      .where(eq(productWarranties.id, id));

    await logActivity(id, null, "extended", `تم تمديد الضمان ${months} شهر`, userId, { months, newEndDate });

    return c.json({ success: true, newEndDate });
  } catch (error) {
    return c.json({ error: "فشل في تمديد الضمان" }, 500);
  }
});

/**
 * التحقق من صلاحية الضمان
 */
app.get("/check/:serialNumber", async (c) => {
  try {
    const { serialNumber } = c.req.param();
    
    const [warranty] = await db.select({
      warranty: productWarranties,
      product: { nameAr: products.nameAr },
    }).from(productWarranties)
      .leftJoin(products, eq(productWarranties.productId, products.id))
      .where(eq(productWarranties.serialNumber, serialNumber));

    if (!warranty) return c.json({ found: false, message: "لا يوجد ضمان لهذا الجهاز" });

    const isValid = warranty.warranty.status === "active" && new Date(warranty.warranty.endDate) > new Date();
    const daysRemaining = Math.ceil((new Date(warranty.warranty.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

    return c.json({
      found: true,
      isValid,
      warranty: {
        warrantyNumber: warranty.warranty.warrantyNumber,
        productName: warranty.product?.nameAr,
        status: warranty.warranty.status,
        startDate: warranty.warranty.startDate,
        endDate: warranty.warranty.endDate,
        daysRemaining: Math.max(0, daysRemaining),
        claimsCount: warranty.warranty.claimsCount,
      },
    });
  } catch (error) {
    return c.json({ error: "فشل في التحقق" }, 500);
  }
});

// ========== مطالبات الضمان ==========

/**
 * جلب المطالبات
 */
app.get("/claims/list", async (c) => {
  try {
    const { status, warrantyId, page = "1", limit = "20" } = c.req.query();
    const conditions = [];

    if (status) conditions.push(inArray(warrantyClaims.status, status.split(",")));
    if (warrantyId) conditions.push(eq(warrantyClaims.warrantyId, warrantyId));

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    const claims = await db.select({
      claim: warrantyClaims,
      warranty: { warrantyNumber: productWarranties.warrantyNumber, serialNumber: productWarranties.serialNumber },
    }).from(warrantyClaims)
      .leftJoin(productWarranties, eq(warrantyClaims.warrantyId, productWarranties.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(warrantyClaims.createdAt))
      .limit(limitNum).offset((pageNum - 1) * limitNum);

    return c.json({ claims: claims.map(c => ({ ...c.claim, warranty: c.warranty })) });
  } catch (error) {
    return c.json({ error: "فشل في جلب المطالبات" }, 500);
  }
});

/**
 * إنشاء مطالبة ضمان
 */
app.post("/claims", async (c) => {
  try {
    const body = await c.req.json();
    const { warrantyId, issueType, issueDescription, attachments, submittedBy } = body;

    const [warranty] = await db.select().from(productWarranties).where(eq(productWarranties.id, warrantyId));
    if (!warranty) return c.json({ error: "الضمان غير موجود" }, 404);

    if (warranty.status !== "active") return c.json({ error: "الضمان غير نشط" }, 400);
    if (new Date(warranty.endDate) < new Date()) return c.json({ error: "الضمان منتهي الصلاحية" }, 400);

    const id = `claim_${nanoid(12)}`;
    const claimNumber = await generateClaimNumber();

    await db.insert(warrantyClaims).values({
      id, claimNumber, warrantyId, issueType, issueDescription,
      status: "pending", attachments, submittedBy, claimDate: new Date(),
      createdAt: new Date(), updatedAt: new Date(),
    });

    await db.update(productWarranties).set({ claimsCount: (warranty.claimsCount || 0) + 1, updatedAt: new Date() })
      .where(eq(productWarranties.id, warrantyId));

    await logActivity(warrantyId, id, "claimed", "تم تقديم مطالبة ضمان", submittedBy);

    return c.json({ id, claimNumber, message: "تم تقديم المطالبة بنجاح" }, 201);
  } catch (error) {
    console.error("Create claim error:", error);
    return c.json({ error: "فشل في إنشاء المطالبة" }, 500);
  }
});

/**
 * تحديث مطالبة
 */
app.patch("/claims/:id", async (c) => {
  try {
    const { id } = c.req.param();
    const body = await c.req.json();

    const [existing] = await db.select().from(warrantyClaims).where(eq(warrantyClaims.id, id));
    if (!existing) return c.json({ error: "المطالبة غير موجودة" }, 404);

    const updates: any = { updatedAt: new Date() };

    if (body.status) {
      updates.status = body.status;
      if (body.status === "approved") updates.approvedAt = new Date();
      if (body.status === "completed") updates.completedAt = new Date();
    }

    const fields = ["diagnosisNotes", "isUnderWarranty", "rejectionReason", "repairType", "repairNotes", "repairCost", "customerPays", "reviewedBy", "repairedBy"];
    fields.forEach(f => { if (body[f] !== undefined) updates[f] = body[f]; });

    await db.update(warrantyClaims).set(updates).where(eq(warrantyClaims.id, id));

    if (body.status) {
      await logActivity(existing.warrantyId, id, "status_changed", `تم تغيير حالة المطالبة إلى ${body.status}`, body.userId);
    }

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: "فشل في تحديث المطالبة" }, 500);
  }
});

// ========== سياسات الضمان ==========

app.get("/policies/list", async (c) => {
  try {
    const policies = await db.select().from(warrantyPolicies)
      .where(eq(warrantyPolicies.isActive, true)).orderBy(desc(warrantyPolicies.isDefault));
    return c.json(policies);
  } catch (error) {
    return c.json({ error: "فشل في جلب السياسات" }, 500);
  }
});

app.post("/policies", async (c) => {
  try {
    const body = await c.req.json();
    const id = `wp_${nanoid(12)}`;
    await db.insert(warrantyPolicies).values({
      id, name: body.name, description: body.description, durationMonths: body.durationMonths || 12,
      coverageType: body.coverageType || "standard", coversHardware: body.coversHardware ?? true,
      coversSoftware: body.coversSoftware ?? false, coversAccidentalDamage: body.coversAccidentalDamage ?? false,
      coversWaterDamage: body.coversWaterDamage ?? false, exclusions: body.exclusions,
      terms: body.terms, isDefault: body.isDefault ?? false,
      createdAt: new Date(), updatedAt: new Date(),
    });
    return c.json({ id }, 201);
  } catch (error) {
    return c.json({ error: "فشل في إنشاء السياسة" }, 500);
  }
});

export default app;

/**
 * API Routes - نظام تحليل المنافسين
 */
import { Hono } from "hono";
import { db, competitors, competitorProducts, competitorPrices, competitorActivities, productComparisons } from "@bi-management/database";
import { eq, and, or, desc, count, like } from "drizzle-orm";
import { nanoid } from "nanoid";
import { authMiddleware } from "../lib/auth.js";

const app = new Hono();


// ============== المنافسين ==============

app.get("/", async (c) => {
  try {
    const { category, threatLevel, search, page = "1", limit = "20" } = c.req.query();
    const conditions = [eq(competitors.isActive, true)];
    if (category) conditions.push(eq(competitors.category, category));
    if (threatLevel) conditions.push(eq(competitors.threatLevel, threatLevel));
    if (search) conditions.push(or(like(competitors.name, `%${search}%`), like(competitors.nameEn, `%${search}%`)));

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    const result = await db.select().from(competitors)
      .where(and(...conditions))
      .orderBy(desc(competitors.updatedAt))
      .limit(limitNum).offset((pageNum - 1) * limitNum);

    const [total] = await db.select({ count: count() }).from(competitors).where(and(...conditions));

    return c.json({ competitors: result, pagination: { page: pageNum, limit: limitNum, total: total?.count || 0 } });
  } catch (error) {
    console.error("GET /competitors error:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.get("/stats", async (c) => {
  try {
    const [total] = await db.select({ count: count() }).from(competitors).where(eq(competitors.isActive, true));

    const categoryStats = await db.select({ category: competitors.category, count: count() })
      .from(competitors).where(eq(competitors.isActive, true)).groupBy(competitors.category);

    const threatStats = await db.select({ level: competitors.threatLevel, count: count() })
      .from(competitors).where(eq(competitors.isActive, true)).groupBy(competitors.threatLevel);

    return c.json({
      total: total?.count || 0,
      byCategory: categoryStats.reduce((acc, s) => ({ ...acc, [s.category || "direct"]: s.count }), {}),
      byThreatLevel: threatStats.reduce((acc, s) => ({ ...acc, [s.level || "medium"]: s.count }), {}),
    });
  } catch (error) {
    console.error("GET /competitors/stats error:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.get("/:id", async (c) => {
  try {
    const { id } = c.req.param();
    const [competitor] = await db.select().from(competitors).where(eq(competitors.id, id));
    if (!competitor) return c.json({ error: "المنافس غير موجود" }, 404);

    const [products, prices, activities] = await Promise.all([
      db.select().from(competitorProducts).where(eq(competitorProducts.competitorId, id)),
      db.select().from(competitorPrices).where(eq(competitorPrices.competitorId, id)).orderBy(desc(competitorPrices.recordedAt)).limit(50),
      db.select().from(competitorActivities).where(eq(competitorActivities.competitorId, id)).orderBy(desc(competitorActivities.createdAt)).limit(20),
    ]);

    return c.json({ ...competitor, products, prices, activities });
  } catch (error) {
    console.error("GET /competitors/:id error:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const id = `comp_${nanoid(12)}`;

    await db.insert(competitors).values({
      id,
      name: body.name,
      nameEn: body.nameEn || null,
      logo: body.logo || null,
      website: body.website || null,
      description: body.description || null,
      category: body.category || "direct",
      industry: body.industry || null,
      phone: body.phone || null,
      email: body.email || null,
      address: body.address || null,
      country: body.country || "العراق",
      city: body.city || null,
      regions: body.regions || null,
      companySize: body.companySize || null,
      marketShare: body.marketShare || null,
      strengths: body.strengths || null,
      weaknesses: body.weaknesses || null,
      threatLevel: body.threatLevel || "medium",
      rating: body.rating || 3,
      notes: body.notes || null,
      socialLinks: body.socialLinks || null,
      createdBy: body.createdBy || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return c.json({ id }, 201);
  } catch (error) {
    console.error("POST /competitors error:", error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

app.put("/:id", async (c) => {
  try {
    const { id } = c.req.param();
    const body = await c.req.json();

    await db.update(competitors).set({
      name: body.name,
      nameEn: body.nameEn,
      website: body.website,
      description: body.description,
      category: body.category,
      companySize: body.companySize,
      marketShare: body.marketShare,
      strengths: body.strengths,
      weaknesses: body.weaknesses,
      threatLevel: body.threatLevel,
      rating: body.rating,
      notes: body.notes,
      updatedAt: new Date(),
    }).where(eq(competitors.id, id));

    return c.json({ success: true });
  } catch (error) {
    console.error("PUT /competitors/:id error:", error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

// ============== المنتجات ==============

app.post("/:competitorId/products", async (c) => {
  try {
    const { competitorId } = c.req.param();
    const body = await c.req.json();
    const id = `cprod_${nanoid(12)}`;

    await db.insert(competitorProducts).values({
      id, competitorId,
      name: body.name,
      description: body.description || null,
      category: body.category || null,
      price: body.price || null,
      priceRange: body.priceRange || null,
      ourProductId: body.ourProductId || null,
      comparisonNotes: body.comparisonNotes || null,
      features: body.features || null,
      qualityRating: body.qualityRating || null,
      productUrl: body.productUrl || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return c.json({ id }, 201);
  } catch (error) {
    console.error("POST /competitors/:competitorId/products error:", error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

// ============== الأسعار ==============

app.post("/:competitorId/prices", async (c) => {
  try {
    const { competitorId } = c.req.param();
    const body = await c.req.json();
    const id = `cprice_${nanoid(12)}`;

    await db.insert(competitorPrices).values({
      id, competitorId,
      productId: body.productId || null,
      productName: body.productName,
      price: body.price,
      currency: body.currency || "IQD",
      source: body.source || null,
      sourceUrl: body.sourceUrl || null,
      recordedBy: body.recordedBy || null,
      recordedAt: new Date(),
    });

    return c.json({ id }, 201);
  } catch (error) {
    console.error("POST /competitors/:competitorId/prices error:", error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

// ============== الأنشطة ==============

app.post("/:competitorId/activities", async (c) => {
  try {
    const { competitorId } = c.req.param();
    const body = await c.req.json();
    const id = `cact_${nanoid(12)}`;

    await db.insert(competitorActivities).values({
      id, competitorId,
      activityType: body.activityType,
      title: body.title,
      description: body.description || null,
      importance: body.importance || "medium",
      source: body.source || null,
      sourceUrl: body.sourceUrl || null,
      activityDate: body.activityDate ? new Date(body.activityDate) : new Date(),
      attachments: body.attachments || null,
      recordedBy: body.recordedBy || null,
      createdAt: new Date(),
    });

    return c.json({ id }, 201);
  } catch (error) {
    console.error("POST /competitors/:competitorId/activities error:", error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

// ============== المقارنات ==============

app.get("/comparisons", async (c) => {
  try {
    const result = await db.select().from(productComparisons).orderBy(desc(productComparisons.updatedAt));
    return c.json({ comparisons: result });
  } catch (error) {
    console.error("GET /competitors/comparisons error:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.post("/comparisons", async (c) => {
  try {
    const body = await c.req.json();
    const id = `cmp_${nanoid(12)}`;

    await db.insert(productComparisons).values({
      id,
      name: body.name,
      ourProductId: body.ourProductId || null,
      ourProductName: body.ourProductName,
      comparedProducts: body.comparedProducts || null,
      criteria: body.criteria || null,
      summary: body.summary || null,
      recommendation: body.recommendation || null,
      createdBy: body.createdBy || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return c.json({ id }, 201);
  } catch (error) {
    console.error("POST /competitors/comparisons error:", error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

export default app;

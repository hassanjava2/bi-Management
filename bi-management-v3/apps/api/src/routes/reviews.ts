/**
 * API Routes - نظام التقييمات والمراجعات
 */
import { Hono } from "hono";
import { db, reviews, reviewStats, reviewVotes, reviewReports } from "@bi-management/database";
import { eq, and, or, desc, count, avg, like, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { authMiddleware } from "../lib/auth.js";

const app = new Hono();

// تحديث إحصائيات التقييم
async function updateReviewStats(entityType: string, entityId: string) {
  const stats = await db.select({
    total: count(),
    avg: avg(reviews.rating),
  }).from(reviews).where(and(
    eq(reviews.entityType, entityType),
    eq(reviews.entityId, entityId),
    eq(reviews.status, "approved"),
  ));

  const ratingCounts = await db.select({
    rating: reviews.rating,
    count: count(),
  }).from(reviews).where(and(
    eq(reviews.entityType, entityType),
    eq(reviews.entityId, entityId),
    eq(reviews.status, "approved"),
  )).groupBy(reviews.rating);

  const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  ratingCounts.forEach(r => { counts[r.rating as keyof typeof counts] = r.count; });

  await db.insert(reviewStats).values({
    id: `rs_${entityType}_${entityId}`,
    entityType, entityId,
    totalReviews: stats[0]?.total || 0,
    averageRating: String(stats[0]?.avg || 0),
    rating5Count: counts[5],
    rating4Count: counts[4],
    rating3Count: counts[3],
    rating2Count: counts[2],
    rating1Count: counts[1],
    lastReviewAt: new Date(),
    updatedAt: new Date(),
  }).onConflictDoUpdate({
    target: reviewStats.id,
    set: {
      totalReviews: stats[0]?.total || 0,
      averageRating: String(stats[0]?.avg || 0),
      rating5Count: counts[5],
      rating4Count: counts[4],
      rating3Count: counts[3],
      rating2Count: counts[2],
      rating1Count: counts[1],
      lastReviewAt: new Date(),
      updatedAt: new Date(),
    },
  });
}

// جلب التقييمات
app.get("/", async (c) => {
  try {
    const { entityType, entityId, status, rating, search, page = "1", limit = "20" } = c.req.query();
    const conditions = [];
    if (entityType) conditions.push(eq(reviews.entityType, entityType));
    if (entityId) conditions.push(eq(reviews.entityId, entityId));
    if (status) conditions.push(eq(reviews.status, status));
    if (rating) conditions.push(eq(reviews.rating, parseInt(rating)));
    if (search) conditions.push(or(like(reviews.content, `%${search}%`), like(reviews.customerName, `%${search}%`)));

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    const result = await db.select().from(reviews)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(reviews.createdAt))
      .limit(limitNum).offset((pageNum - 1) * limitNum);

    const [total] = await db.select({ count: count() }).from(reviews)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    return c.json({ reviews: result, pagination: { page: pageNum, limit: limitNum, total: total?.count || 0 } });
  } catch (error) {
    console.error("Get reviews error:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

// إحصائيات عامة
app.get("/stats/overview", async (c) => {
  try {
    const statusStats = await db.select({ status: reviews.status, count: count() })
      .from(reviews).groupBy(reviews.status);

    const ratingStats = await db.select({ rating: reviews.rating, count: count() })
      .from(reviews).where(eq(reviews.status, "approved")).groupBy(reviews.rating);

    const [avgRating] = await db.select({ avg: avg(reviews.rating) })
      .from(reviews).where(eq(reviews.status, "approved"));

    return c.json({
      byStatus: statusStats.reduce((acc, s) => ({ ...acc, [s.status || "unknown"]: s.count }), {}),
      byRating: ratingStats.reduce((acc, s) => ({ ...acc, [s.rating]: s.count }), {}),
      averageRating: avgRating?.avg || 0,
    });
  } catch (error) {
    console.error("Get review stats overview error:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

// إحصائيات كيان معين
app.get("/stats/:entityType/:entityId", async (c) => {
  try {
    const { entityType, entityId } = c.req.param();
    const [stat] = await db.select().from(reviewStats)
      .where(and(eq(reviewStats.entityType, entityType), eq(reviewStats.entityId, entityId)));
    return c.json(stat || { totalReviews: 0, averageRating: "0" });
  } catch (error) {
    console.error("Get review stats error:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

// تفاصيل تقييم
app.get("/:id", async (c) => {
  try {
    const { id } = c.req.param();
    const [review] = await db.select().from(reviews).where(eq(reviews.id, id));
    if (!review) return c.json({ error: "التقييم غير موجود" }, 404);
    return c.json(review);
  } catch (error) {
    console.error("Get review details error:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

// إنشاء تقييم
app.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const id = `rev_${nanoid(12)}`;

    await db.insert(reviews).values({
      id,
      entityType: body.entityType,
      entityId: body.entityId,
      entityName: body.entityName || null,
      customerId: body.customerId || null,
      customerName: body.customerName,
      customerEmail: body.customerEmail || null,
      isVerifiedPurchase: body.isVerifiedPurchase || false,
      rating: body.rating,
      title: body.title || null,
      content: body.content || null,
      pros: body.pros || null,
      cons: body.cons || null,
      images: body.images || null,
      status: "pending",
      source: body.source || "website",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return c.json({ id }, 201);
  } catch (error) {
    console.error("Create review error:", error);
    return c.json({ error: "فشل في إنشاء التقييم" }, 500);
  }
});

// مراجعة التقييم (موافقة/رفض)
app.post("/:id/moderate", async (c) => {
  try {
    const { id } = c.req.param();
    const { status, reason, moderatedBy } = await c.req.json();

    const [review] = await db.select().from(reviews).where(eq(reviews.id, id));
    if (!review) return c.json({ error: "التقييم غير موجود" }, 404);

    await db.update(reviews).set({
      status,
      rejectionReason: status === "rejected" ? reason : null,
      moderatedBy,
      moderatedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(reviews.id, id));

    if (status === "approved") {
      await updateReviewStats(review.entityType, review.entityId);
    }

    return c.json({ success: true });
  } catch (error) {
    console.error("Moderate review error:", error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

// الرد على تقييم
app.post("/:id/reply", async (c) => {
  try {
    const { id } = c.req.param();
    const { content, repliedBy } = await c.req.json();

    await db.update(reviews).set({
      replyContent: content,
      repliedBy,
      repliedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(reviews.id, id));

    return c.json({ success: true });
  } catch (error) {
    console.error("Reply to review error:", error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

// التصويت (مفيد/غير مفيد)
app.post("/:id/vote", async (c) => {
  try {
    const { id: reviewId } = c.req.param();
    const { voteType, voterId, voterType } = await c.req.json();

    await db.insert(reviewVotes).values({
      id: `rv_${nanoid(12)}`,
      reviewId,
      voterId,
      voterType,
      voteType,
      createdAt: new Date(),
    });

    const field = voteType === "helpful" ? "helpfulCount" : "notHelpfulCount";
    await db.update(reviews).set({
      [field]: sql`${reviews[field]} + 1`,
      updatedAt: new Date(),
    }).where(eq(reviews.id, reviewId));

    return c.json({ success: true });
  } catch (error) {
    console.error("Vote on review error:", error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

// الإبلاغ عن تقييم
app.post("/:id/report", async (c) => {
  try {
    const { id: reviewId } = c.req.param();
    const { reason, details, reporterId, reporterType } = await c.req.json();

    await db.insert(reviewReports).values({
      id: `rr_${nanoid(12)}`,
      reviewId,
      reporterId,
      reporterType,
      reason,
      details,
      createdAt: new Date(),
    });

    await db.update(reviews).set({ status: "flagged", updatedAt: new Date() }).where(eq(reviews.id, reviewId));

    return c.json({ success: true });
  } catch (error) {
    console.error("Error in reviews:", error);
    return c.json({ error: "فشل" }, 500);
  }
});

// حذف تقييم
app.delete("/:id", async (c) => {
  try {
    const { id } = c.req.param();
    const [review] = await db.select().from(reviews).where(eq(reviews.id, id));
    if (review) {
      await db.delete(reviews).where(eq(reviews.id, id));
      await updateReviewStats(review.entityType, review.entityId);
    }
    return c.json({ success: true });
  } catch (error) {
    console.error("Delete review error:", error);
    return c.json({ error: "فشل في حذف السجل" }, 500);
  }
});

export default app;

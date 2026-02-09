/**
 * API Routes - نظام إدارة المعرفة
 */
import { Hono } from "hono";
import { db, knowledgeArticles, knowledgeCategories, articleComments, articleVersions, faqs, articleRatings, userBookmarks } from "@bi-management/database";
import { eq, and, or, desc, count, ilike } from "drizzle-orm";
import { nanoid } from "nanoid";
import { authMiddleware } from "../lib/auth.js";

const app = new Hono();

const generateNumber = (prefix: string) => `${prefix}-${Date.now().toString(36).toUpperCase()}`;
const generateSlug = (title: string) => title.toLowerCase().replace(/[^a-z0-9\u0600-\u06FF]+/g, "-").replace(/^-|-$/g, "");

// المقالات
app.get("/articles", async (c) => {
  try {
    const { status, categoryId, audience, featured, search } = c.req.query();
    const conditions = [];
    if (status) conditions.push(eq(knowledgeArticles.status, status));
    if (categoryId) conditions.push(eq(knowledgeArticles.categoryId, categoryId));
    if (audience) conditions.push(eq(knowledgeArticles.audience, audience));
    if (featured === "true") conditions.push(eq(knowledgeArticles.isFeatured, true));
    if (search) conditions.push(or(
      ilike(knowledgeArticles.title, `%${search}%`),
      ilike(knowledgeArticles.content, `%${search}%`)
    ));

    const result = await db.select().from(knowledgeArticles)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(knowledgeArticles.createdAt));

    return c.json(result);
  } catch (error) {
    console.error("Error fetching articles:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.get("/stats", async (c) => {
  try {
    const [total] = await db.select({ count: count() }).from(knowledgeArticles);
    const [published] = await db.select({ count: count() }).from(knowledgeArticles)
      .where(eq(knowledgeArticles.status, "published"));
    const [draft] = await db.select({ count: count() }).from(knowledgeArticles)
      .where(eq(knowledgeArticles.status, "draft"));
    const [review] = await db.select({ count: count() }).from(knowledgeArticles)
      .where(eq(knowledgeArticles.status, "review"));
    
    const [totalCategories] = await db.select({ count: count() }).from(knowledgeCategories)
      .where(eq(knowledgeCategories.isActive, true));
    
    const [totalFaqs] = await db.select({ count: count() }).from(faqs)
      .where(eq(faqs.isPublished, true));
    
    const [pendingComments] = await db.select({ count: count() }).from(articleComments)
      .where(eq(articleComments.status, "pending"));

    return c.json({
      totalArticles: total?.count || 0,
      publishedArticles: published?.count || 0,
      draftArticles: draft?.count || 0,
      reviewArticles: review?.count || 0,
      totalCategories: totalCategories?.count || 0,
      totalFaqs: totalFaqs?.count || 0,
      pendingComments: pendingComments?.count || 0,
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.get("/articles/:id", async (c) => {
  try {
    const { id } = c.req.param();
    const [article] = await db.select().from(knowledgeArticles).where(eq(knowledgeArticles.id, id));
    if (!article) return c.json({ error: "المقالة غير موجودة" }, 404);

    // زيادة عداد المشاهدات
    await db.update(knowledgeArticles).set({
      viewCount: (article.viewCount || 0) + 1,
    }).where(eq(knowledgeArticles.id, id));

    const comments = await db.select().from(articleComments)
      .where(and(eq(articleComments.articleId, id), eq(articleComments.status, "approved")))
      .orderBy(articleComments.createdAt);
    
    const versions = await db.select().from(articleVersions)
      .where(eq(articleVersions.articleId, id))
      .orderBy(desc(articleVersions.version))
      .limit(5);

    return c.json({ ...article, comments, versions });
  } catch (error) {
    console.error("Error in knowledge:", error);
    return c.json({ error: "فشل" }, 500);
  }
});

app.post("/articles", async (c) => {
  try {
    const body = await c.req.json();
    const id = `art_${nanoid(12)}`;
    const articleNumber = generateNumber("ART");
    const slug = body.slug || generateSlug(body.title);

    await db.insert(knowledgeArticles).values({
      id, articleNumber,
      title: body.title,
      slug,
      summary: body.summary || null,
      content: body.content,
      categoryId: body.categoryId || null,
      tags: body.tags || null,
      articleType: body.articleType || "article",
      audience: body.audience || "internal",
      departmentId: body.departmentId || null,
      status: "draft",
      version: 1,
      metaTitle: body.metaTitle || null,
      metaDescription: body.metaDescription || null,
      attachments: body.attachments || null,
      authorId: body.authorId,
      isFeatured: body.isFeatured || false,
      isPinned: body.isPinned || false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // حفظ النسخة الأولى
    await db.insert(articleVersions).values({
      id: `av_${nanoid(12)}`,
      articleId: id,
      version: 1,
      title: body.title,
      content: body.content,
      changeNotes: "الإنشاء الأولي",
      createdBy: body.authorId,
      createdAt: new Date(),
    });

    return c.json({ id, articleNumber, slug }, 201);
  } catch (error) {
    console.error("Error creating article:", error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

app.patch("/articles/:id", async (c) => {
  try {
    const { id } = c.req.param();
    const body = await c.req.json();

    const [article] = await db.select().from(knowledgeArticles).where(eq(knowledgeArticles.id, id));
    if (!article) return c.json({ error: "المقالة غير موجودة" }, 404);

    const updates: any = { updatedAt: new Date() };
    const newVersion = (article.version || 1) + 1;

    if (body.title) updates.title = body.title;
    if (body.content) {
      updates.content = body.content;
      updates.version = newVersion;
      
      // حفظ النسخة الجديدة
      await db.insert(articleVersions).values({
        id: `av_${nanoid(12)}`,
        articleId: id,
        version: newVersion,
        title: body.title || article.title,
        content: body.content,
        changeNotes: body.changeNotes || null,
        createdBy: body.updatedBy || null,
        createdAt: new Date(),
      });
    }
    if (body.summary) updates.summary = body.summary;
    if (body.categoryId !== undefined) updates.categoryId = body.categoryId;
    if (body.tags) updates.tags = body.tags;

    await db.update(knowledgeArticles).set(updates).where(eq(knowledgeArticles.id, id));

    return c.json({ success: true, version: newVersion });
  } catch (error) {
    console.error("Error updating article:", error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

app.patch("/articles/:id/publish", async (c) => {
  try {
    const { id } = c.req.param();
    const { reviewerId } = await c.req.json();

    await db.update(knowledgeArticles).set({
      status: "published",
      publishedAt: new Date(),
      reviewerId: reviewerId || null,
      lastReviewedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(knowledgeArticles.id, id));

    return c.json({ success: true });
  } catch (error) {
    console.error("Error publishing article:", error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

app.patch("/articles/:id/archive", async (c) => {
  try {
    const { id } = c.req.param();

    await db.update(knowledgeArticles).set({
      status: "archived",
      updatedAt: new Date(),
    }).where(eq(knowledgeArticles.id, id));

    return c.json({ success: true });
  } catch (error) {
    console.error("Error archiving article:", error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

// التقييمات
app.post("/articles/:id/rate", async (c) => {
  try {
    const { id: articleId } = c.req.param();
    const { userId, isHelpful, feedback } = await c.req.json();
    const id = `ar_${nanoid(12)}`;

    await db.insert(articleRatings).values({
      id, articleId,
      userId: userId || null,
      isHelpful,
      feedback: feedback || null,
      createdAt: new Date(),
    });

    // تحديث العدادات
    const [article] = await db.select().from(knowledgeArticles).where(eq(knowledgeArticles.id, articleId));
    if (article) {
      const updates = isHelpful
        ? { helpfulCount: (article.helpfulCount || 0) + 1 }
        : { notHelpfulCount: (article.notHelpfulCount || 0) + 1 };
      await db.update(knowledgeArticles).set(updates).where(eq(knowledgeArticles.id, articleId));
    }

    return c.json({ success: true });
  } catch (error) {
    console.error("Error in knowledge:", error);
    return c.json({ error: "فشل" }, 500);
  }
});

// التعليقات
app.post("/articles/:id/comments", async (c) => {
  try {
    const { id: articleId } = c.req.param();
    const body = await c.req.json();
    const id = `cmt_${nanoid(12)}`;

    await db.insert(articleComments).values({
      id, articleId,
      userId: body.userId || null,
      guestName: body.guestName || null,
      content: body.content,
      parentId: body.parentId || null,
      status: body.isInternal ? "approved" : "pending",
      isInternal: body.isInternal || false,
      createdAt: new Date(),
    });

    return c.json({ id }, 201);
  } catch (error) {
    console.error("Error in knowledge:", error);
    return c.json({ error: "فشل" }, 500);
  }
});

app.patch("/comments/:id/approve", async (c) => {
  try {
    const { id } = c.req.param();

    await db.update(articleComments).set({ status: "approved" })
      .where(eq(articleComments.id, id));

    return c.json({ success: true });
  } catch (error) {
    console.error("Error in knowledge:", error);
    return c.json({ error: "فشل" }, 500);
  }
});

// الفئات
app.get("/categories", async (c) => {
  try {
    const result = await db.select().from(knowledgeCategories)
      .where(eq(knowledgeCategories.isActive, true))
      .orderBy(knowledgeCategories.sortOrder);
    return c.json(result);
  } catch (error) {
    console.error("Error fetching categories:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.post("/categories", async (c) => {
  try {
    const body = await c.req.json();
    const id = `kcat_${nanoid(12)}`;
    const slug = body.slug || generateSlug(body.name);

    await db.insert(knowledgeCategories).values({
      id,
      name: body.name,
      nameEn: body.nameEn || null,
      slug,
      description: body.description || null,
      parentId: body.parentId || null,
      icon: body.icon || null,
      color: body.color || null,
      sortOrder: body.sortOrder || 0,
      isActive: true,
      createdAt: new Date(),
    });

    return c.json({ id, slug }, 201);
  } catch (error) {
    console.error("Error creating category:", error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

// الأسئلة الشائعة
app.get("/faqs", async (c) => {
  try {
    const { categoryId } = c.req.query();
    const conditions = [eq(faqs.isPublished, true)];
    if (categoryId) conditions.push(eq(faqs.categoryId, categoryId));

    const result = await db.select().from(faqs)
      .where(and(...conditions))
      .orderBy(faqs.sortOrder);

    return c.json(result);
  } catch (error) {
    console.error("Error fetching FAQs:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.post("/faqs", async (c) => {
  try {
    const body = await c.req.json();
    const id = `faq_${nanoid(12)}`;

    await db.insert(faqs).values({
      id,
      question: body.question,
      answer: body.answer,
      categoryId: body.categoryId || null,
      audience: body.audience || "all",
      sortOrder: body.sortOrder || 0,
      isPublished: body.isPublished !== false,
      createdBy: body.createdBy || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return c.json({ id }, 201);
  } catch (error) {
    console.error("Error creating FAQ:", error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

// المفضلات
app.post("/bookmarks", async (c) => {
  try {
    const body = await c.req.json();
    const id = `bm_${nanoid(12)}`;

    await db.insert(userBookmarks).values({
      id,
      userId: body.userId,
      articleId: body.articleId,
      notes: body.notes || null,
      createdAt: new Date(),
    });

    return c.json({ id }, 201);
  } catch (error) {
    console.error("Error creating bookmark:", error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

app.get("/bookmarks/:userId", async (c) => {
  try {
    const { userId } = c.req.param();
    const result = await db.select().from(userBookmarks)
      .where(eq(userBookmarks.userId, userId))
      .orderBy(desc(userBookmarks.createdAt));
    return c.json(result);
  } catch (error) {
    console.error("Error fetching bookmarks:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

export default app;

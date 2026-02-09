/**
 * API Routes - نظام إدارة المناقصات والعطاءات
 */
import { Hono } from "hono";
import { db, tenders, bids, tenderCommittees, tenderClarifications, bidEvaluations, tenderHistory } from "@bi-management/database";
import { eq, and, or, desc, count, sum, avg } from "drizzle-orm";
import { nanoid } from "nanoid";
import { authMiddleware } from "../lib/auth.js";

const app = new Hono();


const generateNumber = (prefix: string) => `${prefix}-${Date.now().toString(36).toUpperCase()}`;

// المناقصات
app.get("/", async (c) => {
  try {
    const { status, type, category } = c.req.query();
    const conditions = [];
    if (status) conditions.push(eq(tenders.status, status));
    if (type) conditions.push(eq(tenders.tenderType, type));
    if (category) conditions.push(eq(tenders.category, category));

    const result = await db.select().from(tenders)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(tenders.createdAt));

    return c.json(result);
  } catch (error) {
    console.error("Error fetching tenders:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.get("/stats", async (c) => {
  try {
    const [total] = await db.select({ count: count() }).from(tenders);
    const [draft] = await db.select({ count: count() }).from(tenders)
      .where(eq(tenders.status, "draft"));
    const [published] = await db.select({ count: count() }).from(tenders)
      .where(eq(tenders.status, "published"));
    const [evaluation] = await db.select({ count: count() }).from(tenders)
      .where(eq(tenders.status, "evaluation"));
    const [awarded] = await db.select({ count: count() }).from(tenders)
      .where(eq(tenders.status, "awarded"));
    
    const [totalBids] = await db.select({ count: count() }).from(bids);
    const [pendingEvaluation] = await db.select({ count: count() }).from(bids)
      .where(eq(bids.status, "under_evaluation"));
    
    const [totalValue] = await db.select({ sum: sum(tenders.estimatedValue) }).from(tenders)
      .where(or(eq(tenders.status, "published"), eq(tenders.status, "evaluation")));

    return c.json({
      totalTenders: total?.count || 0,
      draftTenders: draft?.count || 0,
      publishedTenders: published?.count || 0,
      evaluationTenders: evaluation?.count || 0,
      awardedTenders: awarded?.count || 0,
      totalBids: totalBids?.count || 0,
      pendingEvaluation: pendingEvaluation?.count || 0,
      totalValue: totalValue?.sum || 0,
    });
  } catch (error) {
    console.error("Error fetching tender stats:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.get("/:id", async (c) => {
  try {
    const { id } = c.req.param();
    const [tender] = await db.select().from(tenders).where(eq(tenders.id, id));
    if (!tender) return c.json({ error: "المناقصة غير موجودة" }, 404);

    const tenderBids = await db.select().from(bids)
      .where(eq(bids.tenderId, id))
      .orderBy(desc(bids.submittedAt));
    
    const committee = await db.select().from(tenderCommittees)
      .where(eq(tenderCommittees.tenderId, id));
    
    const clarifications = await db.select().from(tenderClarifications)
      .where(eq(tenderClarifications.tenderId, id))
      .orderBy(desc(tenderClarifications.submittedAt));
    
    const history = await db.select().from(tenderHistory)
      .where(eq(tenderHistory.tenderId, id))
      .orderBy(desc(tenderHistory.createdAt));

    return c.json({ ...tender, bids: tenderBids, committee, clarifications, history });
  } catch (error) {
    console.error("Error fetching tender:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const id = `tender_${nanoid(12)}`;
    const tenderNumber = generateNumber("TND");

    await db.insert(tenders).values({
      id, tenderNumber,
      title: body.title,
      description: body.description || null,
      tenderType: body.tenderType || "open",
      category: body.category || "goods",
      departmentId: body.departmentId || null,
      branchId: body.branchId || null,
      projectId: body.projectId || null,
      estimatedValue: body.estimatedValue || null,
      currency: body.currency || "IQD",
      budgetAllocated: body.budgetAllocated || false,
      submissionDeadline: new Date(body.submissionDeadline),
      clarificationDeadline: body.clarificationDeadline ? new Date(body.clarificationDeadline) : null,
      openingDate: body.openingDate ? new Date(body.openingDate) : null,
      status: "draft",
      requirements: body.requirements || null,
      evaluationCriteria: body.evaluationCriteria || null,
      documents: body.documents || null,
      participationFee: body.participationFee || null,
      bidBondRequired: body.bidBondRequired || false,
      bidBondPercentage: body.bidBondPercentage || null,
      allowPartialBids: body.allowPartialBids || false,
      allowAlternativeBids: body.allowAlternativeBids || false,
      notes: body.notes || null,
      createdBy: body.createdBy || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await db.insert(tenderHistory).values({
      id: `th_${nanoid(12)}`,
      tenderId: id,
      action: "created",
      toStatus: "draft",
      performedBy: body.createdBy || null,
      createdAt: new Date(),
    });

    return c.json({ id, tenderNumber }, 201);
  } catch (error) {
    console.error("Error creating tender:", error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

app.patch("/:id/publish", async (c) => {
  try {
    const { id } = c.req.param();
    const { userId } = await c.req.json();

    const [tender] = await db.select().from(tenders).where(eq(tenders.id, id));
    if (!tender) return c.json({ error: "المناقصة غير موجودة" }, 404);

    await db.update(tenders).set({
      status: "published",
      publishDate: new Date(),
      updatedAt: new Date(),
    }).where(eq(tenders.id, id));

    await db.insert(tenderHistory).values({
      id: `th_${nanoid(12)}`,
      tenderId: id,
      action: "published",
      fromStatus: tender.status,
      toStatus: "published",
      performedBy: userId || null,
      createdAt: new Date(),
    });

    return c.json({ success: true });
  } catch (error) {
    console.error("Error publishing tender:", error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

app.patch("/:id/close-submission", async (c) => {
  try {
    const { id } = c.req.param();
    const { userId } = await c.req.json();

    await db.update(tenders).set({
      status: "evaluation",
      updatedAt: new Date(),
    }).where(eq(tenders.id, id));

    // تحديث حالة العروض
    await db.update(bids).set({
      status: "under_evaluation",
    }).where(and(eq(bids.tenderId, id), eq(bids.status, "submitted")));

    await db.insert(tenderHistory).values({
      id: `th_${nanoid(12)}`,
      tenderId: id,
      action: "closed_submission",
      toStatus: "evaluation",
      performedBy: userId || null,
      createdAt: new Date(),
    });

    return c.json({ success: true });
  } catch (error) {
    console.error("Error closing submission:", error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

app.patch("/:id/award", async (c) => {
  try {
    const { id } = c.req.param();
    const { winnerId, winnerBidId, awardValue, justification, userId } = await c.req.json();

    await db.update(tenders).set({
      status: "awarded",
      winnerId,
      winnerBidId,
      awardValue,
      awardJustification: justification || null,
      awardDate: new Date(),
      updatedAt: new Date(),
    }).where(eq(tenders.id, id));

    // تحديث حالة العرض الفائز
    await db.update(bids).set({ status: "awarded" }).where(eq(bids.id, winnerBidId));

    // رفض باقي العروض
    await db.update(bids).set({ status: "rejected" })
      .where(and(eq(bids.tenderId, id), eq(bids.status, "under_evaluation")));

    await db.insert(tenderHistory).values({
      id: `th_${nanoid(12)}`,
      tenderId: id,
      action: "awarded",
      toStatus: "awarded",
      details: `تم الترسية على المورد بقيمة ${awardValue}`,
      performedBy: userId || null,
      createdAt: new Date(),
    });

    return c.json({ success: true });
  } catch (error) {
    console.error("Error awarding tender:", error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

// العروض
app.post("/:id/bids", async (c) => {
  try {
    const { id: tenderId } = c.req.param();
    const body = await c.req.json();
    const id = `bid_${nanoid(12)}`;
    const bidNumber = generateNumber("BID");

    await db.insert(bids).values({
      id, bidNumber, tenderId,
      supplierId: body.supplierId,
      totalValue: body.totalValue,
      currency: body.currency || "IQD",
      technicalProposal: body.technicalProposal || null,
      financialProposal: body.financialProposal || null,
      lineItems: body.lineItems || null,
      documents: body.documents || null,
      bidBondSubmitted: body.bidBondSubmitted || false,
      bidBondAmount: body.bidBondAmount || null,
      bidBondExpiry: body.bidBondExpiry ? new Date(body.bidBondExpiry) : null,
      status: "submitted",
      submittedAt: new Date(),
    });

    return c.json({ id, bidNumber }, 201);
  } catch (error) {
    console.error("Error creating bid:", error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

app.patch("/bids/:id/evaluate", async (c) => {
  try {
    const { id } = c.req.param();
    const { technicalScore, financialScore, evaluationNotes, evaluatedBy } = await c.req.json();

    const totalScore = (Number(technicalScore) * 0.6) + (Number(financialScore) * 0.4);

    await db.update(bids).set({
      technicalScore,
      financialScore,
      totalScore: totalScore.toString(),
      evaluationNotes: evaluationNotes || null,
      evaluatedAt: new Date(),
      evaluatedBy: evaluatedBy || null,
    }).where(eq(bids.id, id));

    return c.json({ success: true, totalScore });
  } catch (error) {
    console.error("Error evaluating bid:", error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

app.patch("/bids/:id/disqualify", async (c) => {
  try {
    const { id } = c.req.param();
    const { reason } = await c.req.json();

    await db.update(bids).set({
      disqualified: true,
      disqualificationReason: reason,
      status: "rejected",
    }).where(eq(bids.id, id));

    return c.json({ success: true });
  } catch (error) {
    console.error("Error disqualifying bid:", error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

// اللجنة
app.post("/:id/committee", async (c) => {
  try {
    const { id: tenderId } = c.req.param();
    const body = await c.req.json();
    const id = `tc_${nanoid(12)}`;

    await db.insert(tenderCommittees).values({
      id, tenderId,
      userId: body.userId,
      role: body.role || "member",
      canEvaluate: body.canEvaluate !== false,
      canVote: body.canVote !== false,
      assignedAt: new Date(),
      assignedBy: body.assignedBy || null,
    });

    return c.json({ id }, 201);
  } catch (error) {
    console.error("Error creating committee member:", error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

// الاستفسارات
app.get("/:id/clarifications", async (c) => {
  try {
    const { id } = c.req.param();
    const result = await db.select().from(tenderClarifications)
      .where(eq(tenderClarifications.tenderId, id))
      .orderBy(desc(tenderClarifications.submittedAt));
    return c.json(result);
  } catch (error) {
    console.error("Error fetching clarifications:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.post("/:id/clarifications", async (c) => {
  try {
    const { id: tenderId } = c.req.param();
    const body = await c.req.json();
    const id = `tc_${nanoid(12)}`;

    await db.insert(tenderClarifications).values({
      id, tenderId,
      supplierId: body.supplierId || null,
      question: body.question,
      submittedAt: new Date(),
    });

    return c.json({ id }, 201);
  } catch (error) {
    console.error("Error creating clarification:", error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

app.patch("/clarifications/:id/answer", async (c) => {
  try {
    const { id } = c.req.param();
    const { answer, answeredBy, isPublic } = await c.req.json();

    await db.update(tenderClarifications).set({
      answer,
      answeredBy: answeredBy || null,
      answeredAt: new Date(),
      isPublic: isPublic !== false,
      publishedAt: isPublic !== false ? new Date() : null,
    }).where(eq(tenderClarifications.id, id));

    return c.json({ success: true });
  } catch (error) {
    console.error("Error answering clarification:", error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

export default app;

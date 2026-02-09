/**
 * API Routes - نظام التدريب
 */
import { Hono } from "hono";
import { db, courses, trainingSessions, trainingEnrollments, certificates, developmentPlans } from "@bi-management/database";
import { eq, and, or, desc, count, like, gte, lte } from "drizzle-orm";
import { nanoid } from "nanoid";
import { authMiddleware } from "../lib/auth.js";

const app = new Hono();

// الدورات
app.get("/courses", async (c) => {
  try {
    const { category, level, type, status, search, page = "1", limit = "20" } = c.req.query();
    const conditions = [];

    if (category) conditions.push(eq(courses.category, category));
    if (level) conditions.push(eq(courses.level, level));
    if (type) conditions.push(eq(courses.courseType, type));
    if (status) conditions.push(eq(courses.status, status));
    if (search) conditions.push(like(courses.title, `%${search}%`));

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    const result = await db.select().from(courses)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(courses.createdAt))
      .limit(limitNum).offset((pageNum - 1) * limitNum);

    const [total] = await db.select({ count: count() }).from(courses)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    return c.json({ courses: result, pagination: { page: pageNum, limit: limitNum, total: total?.count || 0 } });
  } catch (error) {
    console.error("Error fetching courses:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.get("/stats", async (c) => {
  try {
    const [totalCourses] = await db.select({ count: count() }).from(courses).where(eq(courses.isActive, true));
    const [totalSessions] = await db.select({ count: count() }).from(trainingSessions);
    const [upcomingSessions] = await db.select({ count: count() }).from(trainingSessions)
      .where(and(eq(trainingSessions.status, "scheduled"), gte(trainingSessions.startDate, new Date())));
    const [totalEnrollments] = await db.select({ count: count() }).from(trainingEnrollments);
    const [completedEnrollments] = await db.select({ count: count() }).from(trainingEnrollments)
      .where(eq(trainingEnrollments.status, "completed"));
    const [totalCertificates] = await db.select({ count: count() }).from(certificates);

    const categoryStats = await db.select({ category: courses.category, count: count() })
      .from(courses).where(eq(courses.isActive, true)).groupBy(courses.category);

    return c.json({
      totalCourses: totalCourses?.count || 0,
      totalSessions: totalSessions?.count || 0,
      upcomingSessions: upcomingSessions?.count || 0,
      totalEnrollments: totalEnrollments?.count || 0,
      completedEnrollments: completedEnrollments?.count || 0,
      totalCertificates: totalCertificates?.count || 0,
      completionRate: totalEnrollments?.count ? Math.round((completedEnrollments?.count || 0) / totalEnrollments.count * 100) : 0,
      byCategory: categoryStats.reduce((acc, s) => ({ ...acc, [s.category || "general"]: s.count }), {}),
    });
  } catch (error) {
    console.error("Error fetching training stats:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.get("/courses/:id", async (c) => {
  try {
    const { id } = c.req.param();
    const [course] = await db.select().from(courses).where(eq(courses.id, id));
    if (!course) return c.json({ error: "الدورة غير موجودة" }, 404);

    const sessions = await db.select().from(trainingSessions)
      .where(eq(trainingSessions.courseId, id))
      .orderBy(trainingSessions.startDate);

    return c.json({ ...course, sessions });
  } catch (error) {
    console.error("Error fetching course:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.post("/courses", async (c) => {
  try {
    const body = await c.req.json();
    const id = `crs_${nanoid(12)}`;

    await db.insert(courses).values({
      id,
      title: body.title,
      titleEn: body.titleEn || null,
      description: body.description || null,
      category: body.category || "general",
      level: body.level || "beginner",
      instructorId: body.instructorId || null,
      instructorName: body.instructorName || null,
      instructorExternal: body.instructorExternal || false,
      durationHours: body.durationHours || null,
      durationDays: body.durationDays || null,
      courseType: body.courseType || "classroom",
      cost: body.cost || null,
      currency: body.currency || "IQD",
      materials: body.materials || null,
      syllabus: body.syllabus || null,
      prerequisites: body.prerequisites || null,
      targetAudience: body.targetAudience || null,
      maxParticipants: body.maxParticipants || null,
      status: "draft",
      thumbnail: body.thumbnail || null,
      createdBy: body.createdBy || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return c.json({ id }, 201);
  } catch (error) {
    console.error("Error creating course:", error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

app.patch("/courses/:id", async (c) => {
  try {
    const { id } = c.req.param();
    const body = await c.req.json();

    await db.update(courses).set({
      ...body,
      updatedAt: new Date(),
    }).where(eq(courses.id, id));

    return c.json({ success: true });
  } catch (error) {
    console.error("Error updating course:", error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

// الجلسات
app.get("/sessions", async (c) => {
  try {
    const { status, upcoming, page = "1", limit = "20" } = c.req.query();
    const conditions = [];

    if (status) conditions.push(eq(trainingSessions.status, status));
    if (upcoming === "true") conditions.push(gte(trainingSessions.startDate, new Date()));

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    const result = await db.select().from(trainingSessions)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(trainingSessions.startDate)
      .limit(limitNum).offset((pageNum - 1) * limitNum);

    return c.json(result);
  } catch (error) {
    console.error("Error fetching sessions:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.post("/sessions", async (c) => {
  try {
    const body = await c.req.json();
    const id = `ses_${nanoid(12)}`;

    await db.insert(trainingSessions).values({
      id,
      courseId: body.courseId,
      title: body.title || null,
      description: body.description || null,
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
      locationType: body.locationType || "onsite",
      location: body.location || null,
      onlineLink: body.onlineLink || null,
      maxParticipants: body.maxParticipants || null,
      instructorId: body.instructorId || null,
      status: "scheduled",
      createdAt: new Date(),
    });

    return c.json({ id }, 201);
  } catch (error) {
    console.error("Error creating session:", error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

// التسجيل
app.post("/sessions/:id/enroll", async (c) => {
  try {
    const { id: sessionId } = c.req.param();
    const { userId } = await c.req.json();
    const id = `enr_${nanoid(12)}`;

    // تحقق من عدم التسجيل المسبق
    const [existing] = await db.select().from(trainingEnrollments)
      .where(and(eq(trainingEnrollments.sessionId, sessionId), eq(trainingEnrollments.userId, userId)));
    if (existing) return c.json({ error: "مسجل مسبقاً" }, 400);

    await db.insert(trainingEnrollments).values({
      id, sessionId, userId,
      status: "enrolled",
      enrolledAt: new Date(),
    });

    // تحديث عدد المشاركين
    await db.update(trainingSessions).set({
      currentParticipants: 1, // يمكن استخدام SQL increment
    }).where(eq(trainingSessions.id, sessionId));

    return c.json({ id }, 201);
  } catch (error) {
    console.error("Error enrolling in session:", error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

app.patch("/enrollments/:id/complete", async (c) => {
  try {
    const { id } = c.req.param();
    const { score, grade, feedback, rating } = await c.req.json();

    await db.update(trainingEnrollments).set({
      status: "completed",
      score: score || null,
      grade: grade || null,
      feedback: feedback || null,
      rating: rating || null,
      completedAt: new Date(),
    }).where(eq(trainingEnrollments.id, id));

    return c.json({ success: true });
  } catch (error) {
    console.error("Error completing enrollment:", error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

// الشهادات
app.get("/certificates", async (c) => {
  try {
    const { userId, status } = c.req.query();
    const conditions = [];
    if (userId) conditions.push(eq(certificates.userId, userId));
    if (status) conditions.push(eq(certificates.status, status));

    const result = await db.select().from(certificates)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(certificates.issueDate));

    return c.json(result);
  } catch (error) {
    console.error("Error fetching certificates:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.post("/certificates", async (c) => {
  try {
    const body = await c.req.json();
    const id = `cert_${nanoid(12)}`;
    const certificateNumber = `CERT-${Date.now().toString(36).toUpperCase()}`;
    const verificationCode = nanoid(10).toUpperCase();

    await db.insert(certificates).values({
      id,
      certificateNumber,
      title: body.title,
      userId: body.userId,
      userName: body.userName,
      courseId: body.courseId || null,
      courseName: body.courseName || null,
      issueDate: new Date(body.issueDate || Date.now()),
      expiryDate: body.expiryDate ? new Date(body.expiryDate) : null,
      status: "valid",
      verificationCode,
      signedBy: body.signedBy || null,
      createdAt: new Date(),
    });

    // تحديث التسجيل
    if (body.enrollmentId) {
      await db.update(trainingEnrollments).set({
        certificateIssued: true,
      }).where(eq(trainingEnrollments.id, body.enrollmentId));
    }

    return c.json({ id, certificateNumber, verificationCode }, 201);
  } catch (error) {
    console.error("Error creating certificate:", error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

// خطط التطوير
app.get("/development-plans", async (c) => {
  try {
    const { userId, status } = c.req.query();
    const conditions = [];
    if (userId) conditions.push(eq(developmentPlans.userId, userId));
    if (status) conditions.push(eq(developmentPlans.status, status));

    const result = await db.select().from(developmentPlans)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(developmentPlans.createdAt));

    return c.json(result);
  } catch (error) {
    console.error("Error fetching development plans:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.post("/development-plans", async (c) => {
  try {
    const body = await c.req.json();
    const id = `dp_${nanoid(12)}`;

    await db.insert(developmentPlans).values({
      id,
      userId: body.userId,
      title: body.title,
      description: body.description || null,
      startDate: body.startDate ? new Date(body.startDate) : null,
      targetDate: body.targetDate ? new Date(body.targetDate) : null,
      goals: body.goals || null,
      targetSkills: body.targetSkills || null,
      status: "active",
      supervisorId: body.supervisorId || null,
      notes: body.notes || null,
      createdBy: body.createdBy || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return c.json({ id }, 201);
  } catch (error) {
    console.error("Error creating development plan:", error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

export default app;

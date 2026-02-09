/**
 * API Routes - نظام إدارة الأحداث والفعاليات
 */
import { Hono } from "hono";
import { db, events, eventRegistrations, eventSessions, eventFeedback, eventTasks, eventExpenses } from "@bi-management/database";
import { eq, and, or, desc, count, sum, avg, gte, lte } from "drizzle-orm";
import { nanoid } from "nanoid";
import { authMiddleware } from "../lib/auth.js";

const app = new Hono();

const generateNumber = (prefix: string) => `${prefix}-${Date.now().toString(36).toUpperCase()}`;

// الفعاليات
app.get("/", async (c) => {
  try {
    const { status, type, from, to } = c.req.query();
    const conditions = [];
    if (status) conditions.push(eq(events.status, status));
    if (type) conditions.push(eq(events.eventType, type));
    if (from) conditions.push(gte(events.startDate, new Date(from)));
    if (to) conditions.push(lte(events.startDate, new Date(to)));

    const result = await db.select().from(events)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(events.startDate));

    return c.json(result);
  } catch (error) {
    console.error("Error fetching events:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.get("/stats", async (c) => {
  try {
    const [total] = await db.select({ count: count() }).from(events);
    const [upcoming] = await db.select({ count: count() }).from(events)
      .where(and(
        or(eq(events.status, "published"), eq(events.status, "registration_open")),
        gte(events.startDate, new Date())
      ));
    const [ongoing] = await db.select({ count: count() }).from(events)
      .where(eq(events.status, "ongoing"));
    const [completed] = await db.select({ count: count() }).from(events)
      .where(eq(events.status, "completed"));
    
    const [totalRegistrations] = await db.select({ count: count() }).from(eventRegistrations);
    const [confirmedRegistrations] = await db.select({ count: count() }).from(eventRegistrations)
      .where(eq(eventRegistrations.status, "confirmed"));
    
    const [avgRating] = await db.select({ avg: avg(eventFeedback.overallRating) }).from(eventFeedback);

    return c.json({
      totalEvents: total?.count || 0,
      upcomingEvents: upcoming?.count || 0,
      ongoingEvents: ongoing?.count || 0,
      completedEvents: completed?.count || 0,
      totalRegistrations: totalRegistrations?.count || 0,
      confirmedRegistrations: confirmedRegistrations?.count || 0,
      avgRating: avgRating?.avg ? Number(avgRating.avg).toFixed(1) : "N/A",
    });
  } catch (error) {
    console.error("Error fetching event stats:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.get("/:id", async (c) => {
  try {
    const { id } = c.req.param();
    const [event] = await db.select().from(events).where(eq(events.id, id));
    if (!event) return c.json({ error: "الفعالية غير موجودة" }, 404);

    const registrations = await db.select().from(eventRegistrations)
      .where(eq(eventRegistrations.eventId, id))
      .orderBy(desc(eventRegistrations.registeredAt));
    
    const sessions = await db.select().from(eventSessions)
      .where(eq(eventSessions.eventId, id))
      .orderBy(eventSessions.sortOrder);
    
    const tasks = await db.select().from(eventTasks)
      .where(eq(eventTasks.eventId, id));
    
    const expenses = await db.select().from(eventExpenses)
      .where(eq(eventExpenses.eventId, id));

    return c.json({ ...event, registrations, sessions, tasks, expenses });
  } catch (error) {
    console.error("Error fetching event:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const id = `evt_${nanoid(12)}`;
    const eventNumber = generateNumber("EVT");

    await db.insert(events).values({
      id, eventNumber,
      title: body.title,
      description: body.description || null,
      eventType: body.eventType || "conference",
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
      allDay: body.allDay || false,
      timezone: body.timezone || "Asia/Baghdad",
      locationType: body.locationType || "physical",
      venue: body.venue || null,
      address: body.address || null,
      city: body.city || null,
      virtualLink: body.virtualLink || null,
      maxAttendees: body.maxAttendees || null,
      registrationRequired: body.registrationRequired !== false,
      registrationDeadline: body.registrationDeadline ? new Date(body.registrationDeadline) : null,
      registrationFee: body.registrationFee || null,
      currency: body.currency || "IQD",
      status: "draft",
      organizerId: body.organizerId || null,
      departmentId: body.departmentId || null,
      branchId: body.branchId || null,
      audience: body.audience || "internal",
      isPublic: body.isPublic || false,
      bannerImage: body.bannerImage || null,
      agenda: body.agenda || null,
      speakers: body.speakers || null,
      estimatedBudget: body.estimatedBudget || null,
      feedbackEnabled: body.feedbackEnabled !== false,
      tags: body.tags || null,
      notes: body.notes || null,
      createdBy: body.createdBy || body.organizerId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return c.json({ id, eventNumber }, 201);
  } catch (error) {
    console.error("Error creating event:", error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

app.patch("/:id/publish", async (c) => {
  try {
    const { id } = c.req.param();

    await db.update(events).set({
      status: "published",
      publishedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(events.id, id));

    return c.json({ success: true });
  } catch (error) {
    console.error("Error publishing event:", error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

app.patch("/:id/open-registration", async (c) => {
  try {
    const { id } = c.req.param();

    await db.update(events).set({
      status: "registration_open",
      updatedAt: new Date(),
    }).where(eq(events.id, id));

    return c.json({ success: true });
  } catch (error) {
    console.error("Error opening event registration:", error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

app.patch("/:id/start", async (c) => {
  try {
    const { id } = c.req.param();

    await db.update(events).set({
      status: "ongoing",
      updatedAt: new Date(),
    }).where(eq(events.id, id));

    return c.json({ success: true });
  } catch (error) {
    console.error("Error starting event:", error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

app.patch("/:id/complete", async (c) => {
  try {
    const { id } = c.req.param();
    const { actualCost } = await c.req.json();

    await db.update(events).set({
      status: "completed",
      actualCost: actualCost || null,
      updatedAt: new Date(),
    }).where(eq(events.id, id));

    return c.json({ success: true });
  } catch (error) {
    console.error("Error completing event:", error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

// التسجيلات
app.post("/:id/register", async (c) => {
  try {
    const { id: eventId } = c.req.param();
    const body = await c.req.json();
    const id = `reg_${nanoid(12)}`;
    const registrationNumber = generateNumber("REG");
    const ticketCode = nanoid(8).toUpperCase();

    const [event] = await db.select().from(events).where(eq(events.id, eventId));
    if (!event) return c.json({ error: "الفعالية غير موجودة" }, 404);

    // التحقق من السعة
    if (event.maxAttendees && (event.currentAttendees || 0) >= event.maxAttendees) {
      // إضافة لقائمة الانتظار
      await db.insert(eventRegistrations).values({
        id, registrationNumber, eventId, ticketCode,
        registrationType: body.registrationType || "employee",
        userId: body.userId || null,
        customerId: body.customerId || null,
        externalName: body.externalName || null,
        externalEmail: body.externalEmail || null,
        externalPhone: body.externalPhone || null,
        externalCompany: body.externalCompany || null,
        status: "waitlist",
        paymentStatus: event.registrationFee ? "pending" : "not_required",
        paymentAmount: event.registrationFee || null,
        specialRequirements: body.specialRequirements || null,
        registeredAt: new Date(),
      });
      return c.json({ id, registrationNumber, ticketCode, status: "waitlist" }, 201);
    }

    await db.insert(eventRegistrations).values({
      id, registrationNumber, eventId, ticketCode,
      registrationType: body.registrationType || "employee",
      userId: body.userId || null,
      customerId: body.customerId || null,
      externalName: body.externalName || null,
      externalEmail: body.externalEmail || null,
      externalPhone: body.externalPhone || null,
      externalCompany: body.externalCompany || null,
      status: "pending",
      paymentStatus: event.registrationFee ? "pending" : "not_required",
      paymentAmount: event.registrationFee || null,
      specialRequirements: body.specialRequirements || null,
      registeredAt: new Date(),
    });

    // تحديث عدد المسجلين
    await db.update(events).set({
      currentAttendees: (event.currentAttendees || 0) + 1,
      updatedAt: new Date(),
    }).where(eq(events.id, eventId));

    return c.json({ id, registrationNumber, ticketCode }, 201);
  } catch (error) {
    console.error("Error registering for event:", error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

app.patch("/registrations/:id/confirm", async (c) => {
  try {
    const { id } = c.req.param();

    await db.update(eventRegistrations).set({
      status: "confirmed",
      confirmedAt: new Date(),
    }).where(eq(eventRegistrations.id, id));

    return c.json({ success: true });
  } catch (error) {
    console.error("Error confirming registration:", error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

app.patch("/registrations/:id/checkin", async (c) => {
  try {
    const { id } = c.req.param();
    const { checkedInBy } = await c.req.json();

    await db.update(eventRegistrations).set({
      status: "attended",
      checkedInAt: new Date(),
      checkedInBy: checkedInBy || null,
    }).where(eq(eventRegistrations.id, id));

    return c.json({ success: true });
  } catch (error) {
    console.error("Error checking in registration:", error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

// التقييم
app.post("/:id/feedback", async (c) => {
  try {
    const { id: eventId } = c.req.param();
    const body = await c.req.json();
    const id = `fb_${nanoid(12)}`;

    await db.insert(eventFeedback).values({
      id, eventId,
      registrationId: body.registrationId || null,
      overallRating: body.overallRating,
      contentRating: body.contentRating || null,
      organizationRating: body.organizationRating || null,
      venueRating: body.venueRating || null,
      speakersRating: body.speakersRating || null,
      likes: body.likes || null,
      improvements: body.improvements || null,
      comments: body.comments || null,
      wouldRecommend: body.wouldRecommend || null,
      interestedInFuture: body.interestedInFuture || null,
      isAnonymous: body.isAnonymous || false,
      submittedAt: new Date(),
    });

    return c.json({ id }, 201);
  } catch (error) {
    console.error("Error submitting feedback:", error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

// المهام
app.post("/:id/tasks", async (c) => {
  try {
    const { id: eventId } = c.req.param();
    const body = await c.req.json();
    const id = `etask_${nanoid(12)}`;

    await db.insert(eventTasks).values({
      id, eventId,
      title: body.title,
      description: body.description || null,
      assignedTo: body.assignedTo || null,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      priority: body.priority || "medium",
      status: "pending",
      createdAt: new Date(),
    });

    return c.json({ id }, 201);
  } catch (error) {
    console.error("Error creating event task:", error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

app.patch("/tasks/:id", async (c) => {
  try {
    const { id } = c.req.param();
    const { status } = await c.req.json();

    await db.update(eventTasks).set({
      status,
      completedAt: status === "completed" ? new Date() : null,
    }).where(eq(eventTasks.id, id));

    return c.json({ success: true });
  } catch (error) {
    console.error("Error updating event task:", error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

// المصاريف
app.post("/:id/expenses", async (c) => {
  try {
    const { id: eventId } = c.req.param();
    const body = await c.req.json();
    const id = `eexp_${nanoid(12)}`;

    await db.insert(eventExpenses).values({
      id, eventId,
      category: body.category || "other",
      description: body.description,
      amount: body.amount,
      currency: body.currency || "IQD",
      vendor: body.vendor || null,
      invoiceNumber: body.invoiceNumber || null,
      status: "pending",
      receipt: body.receipt || null,
      createdBy: body.createdBy || null,
      createdAt: new Date(),
    });

    return c.json({ id }, 201);
  } catch (error) {
    console.error("Error creating event expense:", error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

export default app;

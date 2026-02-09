/**
 * API Routes - نظام جدولة المواعيد
 */
import { Hono } from "hono";
import { db, appointments, availabilitySlots, blockedTimes, appointmentTypes } from "@bi-management/database";
import { eq, and, or, desc, count, gte, lte, between } from "drizzle-orm";
import { nanoid } from "nanoid";
import { authMiddleware } from "../lib/auth.js";

const app = new Hono();


// ============== المواعيد ==============

// جلب المواعيد (مع فلترة بالتاريخ)
app.get("/", async (c) => {
  try {
    const { start, end, status, assignedTo, customerId, page = "1", limit = "50" } = c.req.query();
    const conditions = [];
    
    if (start) conditions.push(gte(appointments.startTime, new Date(start)));
    if (end) conditions.push(lte(appointments.endTime, new Date(end)));
    if (status) conditions.push(eq(appointments.status, status));
    if (assignedTo) conditions.push(eq(appointments.assignedTo, assignedTo));
    if (customerId) conditions.push(eq(appointments.customerId, customerId));

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    const result = await db.select().from(appointments)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(appointments.startTime)
      .limit(limitNum).offset((pageNum - 1) * limitNum);

    return c.json({ appointments: result });
  } catch (error) {
    console.error("Get appointments error:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

// تفاصيل موعد
app.get("/:id", async (c) => {
  try {
    const { id } = c.req.param();
    const [appointment] = await db.select().from(appointments).where(eq(appointments.id, id));
    if (!appointment) return c.json({ error: "الموعد غير موجود" }, 404);
    return c.json(appointment);
  } catch (error) {
    console.error("Error in appointments:", error);
    return c.json({ error: "فشل" }, 500);
  }
});

// إنشاء موعد
app.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const id = `appt_${nanoid(12)}`;

    await db.insert(appointments).values({
      id,
      title: body.title,
      description: body.description || null,
      appointmentType: body.appointmentType || "meeting",
      startTime: new Date(body.startTime),
      endTime: new Date(body.endTime),
      allDay: body.allDay || false,
      status: "scheduled",
      customerId: body.customerId || null,
      customerName: body.customerName || null,
      customerPhone: body.customerPhone || null,
      branchId: body.branchId || null,
      location: body.location || null,
      meetingUrl: body.meetingUrl || null,
      assignedTo: body.assignedTo || null,
      attendees: body.attendees || null,
      reminderMinutes: body.reminderMinutes || 30,
      color: body.color || null,
      relatedType: body.relatedType || null,
      relatedId: body.relatedId || null,
      isRecurring: body.isRecurring || false,
      recurringPattern: body.recurringPattern || null,
      notes: body.notes || null,
      createdBy: body.createdBy || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return c.json({ id }, 201);
  } catch (error) {
    console.error("Create appointment error:", error);
    return c.json({ error: "فشل في إنشاء الموعد" }, 500);
  }
});

// تحديث موعد
app.put("/:id", async (c) => {
  try {
    const { id } = c.req.param();
    const body = await c.req.json();

    await db.update(appointments).set({
      title: body.title,
      description: body.description,
      appointmentType: body.appointmentType,
      startTime: body.startTime ? new Date(body.startTime) : undefined,
      endTime: body.endTime ? new Date(body.endTime) : undefined,
      location: body.location,
      meetingUrl: body.meetingUrl,
      assignedTo: body.assignedTo,
      notes: body.notes,
      color: body.color,
      updatedAt: new Date(),
    }).where(eq(appointments.id, id));

    return c.json({ success: true });
  } catch (error) {
    console.error("Update appointment error:", error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

// تغيير حالة الموعد
app.post("/:id/status", async (c) => {
  try {
    const { id } = c.req.param();
    const { status, reason } = await c.req.json();

    const updates: any = { status, updatedAt: new Date() };
    if (status === "cancelled") updates.cancellationReason = reason;

    await db.update(appointments).set(updates).where(eq(appointments.id, id));
    return c.json({ success: true });
  } catch (error) {
    console.error("Change appointment status error:", error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

// حذف موعد
app.delete("/:id", async (c) => {
  try {
    const { id } = c.req.param();
    await db.delete(appointments).where(eq(appointments.id, id));
    return c.json({ success: true });
  } catch (error) {
    console.error("Delete appointment error:", error);
    return c.json({ error: "فشل في حذف السجل" }, 500);
  }
});

// إحصائيات المواعيد
app.get("/stats/overview", async (c) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const [todayCount] = await db.select({ count: count() }).from(appointments)
      .where(and(gte(appointments.startTime, today), lte(appointments.startTime, tomorrow)));

    const [weekCount] = await db.select({ count: count() }).from(appointments)
      .where(and(gte(appointments.startTime, today), lte(appointments.startTime, weekEnd)));

    const statusStats = await db.select({ status: appointments.status, count: count() })
      .from(appointments).groupBy(appointments.status);

    return c.json({
      today: todayCount?.count || 0,
      thisWeek: weekCount?.count || 0,
      byStatus: statusStats.reduce((acc, s) => ({ ...acc, [s.status || "unknown"]: s.count }), {}),
    });
  } catch (error) {
    console.error("Get appointment stats error:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

// ============== أوقات العمل ==============

app.get("/availability/:userId", async (c) => {
  try {
    const { userId } = c.req.param();
    const result = await db.select().from(availabilitySlots)
      .where(and(eq(availabilitySlots.userId, userId), eq(availabilitySlots.isActive, true)));
    return c.json({ slots: result });
  } catch (error) {
    console.error("Get availability error:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.post("/availability", async (c) => {
  try {
    const body = await c.req.json();
    const id = `avail_${nanoid(12)}`;
    await db.insert(availabilitySlots).values({
      id, userId: body.userId, branchId: body.branchId || null,
      dayOfWeek: body.dayOfWeek, startTime: body.startTime, endTime: body.endTime,
      createdAt: new Date(),
    });
    return c.json({ id }, 201);
  } catch (error) {
    console.error("Create availability slot error:", error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

// ============== أنواع المواعيد ==============

app.get("/types", async (c) => {
  try {
    const result = await db.select().from(appointmentTypes).where(eq(appointmentTypes.isActive, true));
    return c.json({ types: result });
  } catch (error) {
    console.error("Get appointment types error:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.post("/types", async (c) => {
  try {
    const body = await c.req.json();
    const id = `atype_${nanoid(12)}`;
    await db.insert(appointmentTypes).values({
      id, name: body.name, nameAr: body.nameAr || null,
      duration: body.duration || 30, color: body.color || null,
      requiresApproval: body.requiresApproval || false,
      allowOnlineBooking: body.allowOnlineBooking ?? true,
      createdAt: new Date(),
    });
    return c.json({ id }, 201);
  } catch (error) {
    console.error("Create appointment type error:", error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

export default app;

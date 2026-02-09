/**
 * API Routes - نظام إدارة الزيارات والوفود
 */
import { Hono } from "hono";
import { db, visits, visitMembers, visitLogs, visitorBlacklist } from "@bi-management/database";
import { eq, and, or, desc, count, gte, lte } from "drizzle-orm";
import { nanoid } from "nanoid";
import { authMiddleware } from "../lib/auth.js";

const app = new Hono();

const generateNumber = (prefix: string) => `${prefix}-${Date.now().toString(36).toUpperCase()}`;

// الزيارات
app.get("/", async (c) => {
  try {
    const { status, type, hostId, date } = c.req.query();
    const conditions = [];
    if (status) conditions.push(eq(visits.status, status));
    if (type) conditions.push(eq(visits.visitType, type));
    if (hostId) conditions.push(eq(visits.hostId, hostId));
    if (date) {
      const d = new Date(date);
      const nextDay = new Date(d);
      nextDay.setDate(nextDay.getDate() + 1);
      conditions.push(gte(visits.scheduledDate, d));
      conditions.push(lte(visits.scheduledDate, nextDay));
    }

    const result = await db.select().from(visits)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(visits.scheduledDate));

    return c.json(result);
  } catch (error) {
    console.error("Error fetching visits:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.get("/stats", async (c) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [total] = await db.select({ count: count() }).from(visits);
    const [todayVisits] = await db.select({ count: count() }).from(visits)
      .where(and(gte(visits.scheduledDate, today), lte(visits.scheduledDate, tomorrow)));
    const [scheduled] = await db.select({ count: count() }).from(visits)
      .where(eq(visits.status, "scheduled"));
    const [checkedIn] = await db.select({ count: count() }).from(visits)
      .where(or(eq(visits.status, "checked_in"), eq(visits.status, "in_progress")));
    const [completed] = await db.select({ count: count() }).from(visits)
      .where(eq(visits.status, "completed"));
    const [blacklisted] = await db.select({ count: count() }).from(visitorBlacklist);

    return c.json({
      totalVisits: total?.count || 0,
      todayVisits: todayVisits?.count || 0,
      scheduledVisits: scheduled?.count || 0,
      currentVisitors: checkedIn?.count || 0,
      completedVisits: completed?.count || 0,
      blacklistedVisitors: blacklisted?.count || 0,
    });
  } catch (error) {
    console.error("Error fetching visit stats:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.get("/today", async (c) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const result = await db.select().from(visits)
      .where(and(gte(visits.scheduledDate, today), lte(visits.scheduledDate, tomorrow)))
      .orderBy(visits.scheduledDate);

    return c.json(result);
  } catch (error) {
    return c.json({ error: "فشل" }, 500);
  }
});

app.get("/:id", async (c) => {
  try {
    const { id } = c.req.param();
    const [visit] = await db.select().from(visits).where(eq(visits.id, id));
    if (!visit) return c.json({ error: "الزيارة غير موجودة" }, 404);

    const members = await db.select().from(visitMembers)
      .where(eq(visitMembers.visitId, id));
    
    const logs = await db.select().from(visitLogs)
      .where(eq(visitLogs.visitId, id))
      .orderBy(desc(visitLogs.createdAt));

    return c.json({ ...visit, members, logs });
  } catch (error) {
    console.error("Error fetching visit details:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const id = `visit_${nanoid(12)}`;
    const visitNumber = generateNumber("VIS");

    // التحقق من القائمة السوداء
    if (body.visitorIdNumber) {
      const [blacklisted] = await db.select().from(visitorBlacklist)
        .where(eq(visitorBlacklist.visitorIdNumber, body.visitorIdNumber));
      if (blacklisted && (blacklisted.isPermanent || (blacklisted.endDate && new Date(blacklisted.endDate) > new Date()))) {
        return c.json({ error: "الزائر في القائمة السوداء", reason: blacklisted.reason }, 403);
      }
    }

    await db.insert(visits).values({
      id, visitNumber,
      title: body.title,
      purpose: body.purpose,
      visitType: body.visitType || "client",
      visitorType: body.visitorType || "external",
      visitorName: body.visitorName,
      visitorCompany: body.visitorCompany || null,
      visitorTitle: body.visitorTitle || null,
      visitorPhone: body.visitorPhone || null,
      visitorEmail: body.visitorEmail || null,
      visitorIdNumber: body.visitorIdNumber || null,
      visitorsCount: body.visitorsCount || 1,
      hostId: body.hostId || null,
      departmentId: body.departmentId || null,
      branchId: body.branchId || null,
      scheduledDate: new Date(body.scheduledDate),
      scheduledStartTime: body.scheduledStartTime || null,
      scheduledEndTime: body.scheduledEndTime || null,
      meetingRoom: body.meetingRoom || null,
      status: "scheduled",
      requiresApproval: body.requiresApproval || false,
      escortRequired: body.escortRequired || false,
      equipmentNeeded: body.equipmentNeeded || null,
      refreshmentsNeeded: body.refreshmentsNeeded || false,
      parkingNeeded: body.parkingNeeded || false,
      notes: body.notes || null,
      createdBy: body.createdBy || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // إضافة أعضاء الوفد
    if (body.members && body.members.length > 0) {
      for (const member of body.members) {
        await db.insert(visitMembers).values({
          id: `vm_${nanoid(12)}`,
          visitId: id,
          name: member.name,
          title: member.title || null,
          company: member.company || null,
          phone: member.phone || null,
          email: member.email || null,
          idNumber: member.idNumber || null,
          createdAt: new Date(),
        });
      }
    }

    return c.json({ id, visitNumber }, 201);
  } catch (error) {
    return c.json({ error: "فشل" }, 500);
  }
});

app.post("/:id/checkin", async (c) => {
  try {
    const { id } = c.req.param();
    const { badgeNumber, recordedBy } = await c.req.json();

    await db.update(visits).set({
      status: "checked_in",
      actualArrival: new Date(),
      badgeNumber: badgeNumber || null,
      badgeIssued: !!badgeNumber,
      updatedAt: new Date(),
    }).where(eq(visits.id, id));

    await db.insert(visitLogs).values({
      id: `vl_${nanoid(12)}`,
      visitId: id,
      action: "check_in",
      details: badgeNumber ? `تم إصدار البطاقة: ${badgeNumber}` : null,
      recordedBy: recordedBy || null,
      createdAt: new Date(),
    });

    return c.json({ success: true });
  } catch (error) {
    console.error("Error checking in visit:", error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

app.post("/:id/checkout", async (c) => {
  try {
    const { id } = c.req.param();
    const { recordedBy, feedbackRating, feedbackComment } = await c.req.json();

    await db.update(visits).set({
      status: "completed",
      actualDeparture: new Date(),
      feedbackRating: feedbackRating || null,
      feedbackComment: feedbackComment || null,
      updatedAt: new Date(),
    }).where(eq(visits.id, id));

    await db.insert(visitLogs).values({
      id: `vl_${nanoid(12)}`,
      visitId: id,
      action: "check_out",
      recordedBy: recordedBy || null,
      createdAt: new Date(),
    });

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: "فشل" }, 500);
  }
});

app.patch("/:id/approve", async (c) => {
  try {
    const { id } = c.req.param();
    const { approvedBy } = await c.req.json();

    await db.update(visits).set({
      approvedBy: approvedBy || null,
      approvedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(visits.id, id));

    return c.json({ success: true });
  } catch (error) {
    console.error("Error approving visit:", error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

app.patch("/:id/cancel", async (c) => {
  try {
    const { id } = c.req.param();

    await db.update(visits).set({
      status: "cancelled",
      updatedAt: new Date(),
    }).where(eq(visits.id, id));

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: "فشل" }, 500);
  }
});

// أعضاء الوفد
app.post("/:id/members", async (c) => {
  try {
    const { id: visitId } = c.req.param();
    const body = await c.req.json();
    const id = `vm_${nanoid(12)}`;

    await db.insert(visitMembers).values({
      id, visitId,
      name: body.name,
      title: body.title || null,
      company: body.company || null,
      phone: body.phone || null,
      email: body.email || null,
      idNumber: body.idNumber || null,
      createdAt: new Date(),
    });

    // تحديث عدد الزوار
    const [visit] = await db.select().from(visits).where(eq(visits.id, visitId));
    if (visit) {
      await db.update(visits).set({
        visitorsCount: (visit.visitorsCount || 1) + 1,
        updatedAt: new Date(),
      }).where(eq(visits.id, visitId));
    }

    return c.json({ id }, 201);
  } catch (error) {
    console.error("Error creating visit member:", error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

app.patch("/members/:id/checkin", async (c) => {
  try {
    const { id } = c.req.param();
    const { badgeNumber } = await c.req.json();

    await db.update(visitMembers).set({
      checkedIn: true,
      checkedInAt: new Date(),
      badgeNumber: badgeNumber || null,
    }).where(eq(visitMembers.id, id));

    return c.json({ success: true });
  } catch (error) {
    console.error("Error checking in visit member:", error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

// القائمة السوداء
app.get("/blacklist", async (c) => {
  try {
    const result = await db.select().from(visitorBlacklist)
      .orderBy(desc(visitorBlacklist.createdAt));
    return c.json(result);
  } catch (error) {
    console.error("Error fetching blacklist:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.post("/blacklist", async (c) => {
  try {
    const body = await c.req.json();
    const id = `bl_${nanoid(12)}`;

    await db.insert(visitorBlacklist).values({
      id,
      visitorName: body.visitorName,
      visitorIdNumber: body.visitorIdNumber || null,
      visitorCompany: body.visitorCompany || null,
      reason: body.reason,
      startDate: new Date(),
      endDate: body.endDate ? new Date(body.endDate) : null,
      isPermanent: body.isPermanent || false,
      addedBy: body.addedBy || null,
      createdAt: new Date(),
    });

    return c.json({ id }, 201);
  } catch (error) {
    console.error("Error creating blacklist entry:", error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

export default app;

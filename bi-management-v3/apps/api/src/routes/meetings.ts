/**
 * API Routes - نظام إدارة الاجتماعات والقرارات
 */
import { Hono } from "hono";
import { db, meetings, meetingAttendees, meetingDecisions, decisionFollowUps, meetingActionItems, meetingRooms } from "@bi-management/database";
import { eq, and, or, desc, count, gte, lte } from "drizzle-orm";
import { nanoid } from "nanoid";
import { authMiddleware } from "../lib/auth.js";

const app = new Hono();

const generateNumber = (prefix: string) => `${prefix}-${Date.now().toString(36).toUpperCase()}`;

// الاجتماعات
app.get("/", async (c) => {
  try {
    const { status, type, organizerId, from, to } = c.req.query();
    const conditions = [];

    if (status) conditions.push(eq(meetings.status, status));
    if (type) conditions.push(eq(meetings.meetingType, type));
    if (organizerId) conditions.push(eq(meetings.organizerId, organizerId));
    if (from) conditions.push(gte(meetings.scheduledAt, new Date(from)));
    if (to) conditions.push(lte(meetings.scheduledAt, new Date(to)));

    const result = await db.select().from(meetings)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(meetings.scheduledAt));

    return c.json(result);
  } catch (error) {
    console.error("Error fetching meetings:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.get("/stats", async (c) => {
  try {
    const [total] = await db.select({ count: count() }).from(meetings);
    const [scheduled] = await db.select({ count: count() }).from(meetings)
      .where(eq(meetings.status, "scheduled"));
    const [inProgress] = await db.select({ count: count() }).from(meetings)
      .where(eq(meetings.status, "in_progress"));
    const [completed] = await db.select({ count: count() }).from(meetings)
      .where(eq(meetings.status, "completed"));
    
    // القرارات المعلقة
    const [pendingDecisions] = await db.select({ count: count() }).from(meetingDecisions)
      .where(or(eq(meetingDecisions.status, "pending"), eq(meetingDecisions.status, "in_progress")));
    
    // المهام المعلقة
    const [pendingActions] = await db.select({ count: count() }).from(meetingActionItems)
      .where(or(eq(meetingActionItems.status, "pending"), eq(meetingActionItems.status, "in_progress")));
    
    // القاعات
    const [totalRooms] = await db.select({ count: count() }).from(meetingRooms)
      .where(eq(meetingRooms.isActive, true));

    return c.json({
      totalMeetings: total?.count || 0,
      scheduledMeetings: scheduled?.count || 0,
      inProgressMeetings: inProgress?.count || 0,
      completedMeetings: completed?.count || 0,
      pendingDecisions: pendingDecisions?.count || 0,
      pendingActions: pendingActions?.count || 0,
      totalRooms: totalRooms?.count || 0,
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.get("/:id", async (c) => {
  try {
    const { id } = c.req.param();
    const [meeting] = await db.select().from(meetings).where(eq(meetings.id, id));
    if (!meeting) return c.json({ error: "الاجتماع غير موجود" }, 404);

    const attendees = await db.select().from(meetingAttendees)
      .where(eq(meetingAttendees.meetingId, id));
    const decisions = await db.select().from(meetingDecisions)
      .where(eq(meetingDecisions.meetingId, id));
    const actionItems = await db.select().from(meetingActionItems)
      .where(eq(meetingActionItems.meetingId, id));

    return c.json({ ...meeting, attendees, decisions, actionItems });
  } catch (error) {
    console.error("Error fetching meeting:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const id = `mtg_${nanoid(12)}`;
    const meetingNumber = generateNumber("MTG");

    await db.insert(meetings).values({
      id, meetingNumber,
      title: body.title,
      description: body.description || null,
      meetingType: body.meetingType || "regular",
      scheduledAt: new Date(body.scheduledAt),
      duration: body.duration || null,
      locationType: body.locationType || "physical",
      location: body.location || null,
      meetingLink: body.meetingLink || null,
      organizerId: body.organizerId,
      departmentId: body.departmentId || null,
      branchId: body.branchId || null,
      status: "scheduled",
      agenda: body.agenda || null,
      isRecurring: body.isRecurring || false,
      recurringPattern: body.recurringPattern || null,
      notes: body.notes || null,
      createdBy: body.createdBy || body.organizerId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // إضافة الحضور
    if (body.attendees && body.attendees.length > 0) {
      for (const attendee of body.attendees) {
        await db.insert(meetingAttendees).values({
          id: `ma_${nanoid(12)}`,
          meetingId: id,
          userId: attendee.userId || null,
          externalName: attendee.externalName || null,
          externalEmail: attendee.externalEmail || null,
          role: attendee.role || "attendee",
          inviteStatus: "pending",
          invitedAt: new Date(),
        });
      }
    }

    return c.json({ id, meetingNumber }, 201);
  } catch (error) {
    console.error("Error creating meeting:", error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

app.post("/:id/start", async (c) => {
  try {
    const { id } = c.req.param();

    await db.update(meetings).set({
      status: "in_progress",
      startedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(meetings.id, id));

    return c.json({ success: true });
  } catch (error) {
    console.error("Error starting meeting:", error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

app.post("/:id/end", async (c) => {
  try {
    const { id } = c.req.param();
    const { minutesText } = await c.req.json();

    const [meeting] = await db.select().from(meetings).where(eq(meetings.id, id));
    if (!meeting) return c.json({ error: "الاجتماع غير موجود" }, 404);

    const endTime = new Date();
    const duration = meeting.startedAt ? 
      Math.round((endTime.getTime() - new Date(meeting.startedAt).getTime()) / 60000) : null;

    await db.update(meetings).set({
      status: "completed",
      endedAt: endTime,
      duration,
      minutesText: minutesText || null,
      updatedAt: new Date(),
    }).where(eq(meetings.id, id));

    return c.json({ success: true, duration });
  } catch (error) {
    console.error("Error ending meeting:", error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

app.patch("/:id", async (c) => {
  try {
    const { id } = c.req.param();
    const body = await c.req.json();

    const updates: any = { updatedAt: new Date() };
    if (body.status) updates.status = body.status;
    if (body.minutesText) updates.minutesText = body.minutesText;
    if (body.agenda) updates.agenda = body.agenda;
    if (body.scheduledAt) updates.scheduledAt = new Date(body.scheduledAt);

    await db.update(meetings).set(updates).where(eq(meetings.id, id));

    return c.json({ success: true });
  } catch (error) {
    console.error("Error updating meeting:", error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

// الحضور
app.post("/:id/attendees", async (c) => {
  try {
    const { id: meetingId } = c.req.param();
    const body = await c.req.json();
    const id = `ma_${nanoid(12)}`;

    await db.insert(meetingAttendees).values({
      id, meetingId,
      userId: body.userId || null,
      externalName: body.externalName || null,
      externalEmail: body.externalEmail || null,
      role: body.role || "attendee",
      inviteStatus: "pending",
      invitedAt: new Date(),
    });

    return c.json({ id }, 201);
  } catch (error) {
    console.error("Error creating attendee:", error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

app.patch("/attendees/:id/respond", async (c) => {
  try {
    const { id } = c.req.param();
    const { response } = await c.req.json();

    await db.update(meetingAttendees).set({
      inviteStatus: response,
    }).where(eq(meetingAttendees.id, id));

    return c.json({ success: true });
  } catch (error) {
    console.error("Error responding to attendee:", error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

app.patch("/attendees/:id/checkin", async (c) => {
  try {
    const { id } = c.req.param();

    await db.update(meetingAttendees).set({
      attendanceStatus: "present",
      checkedInAt: new Date(),
    }).where(eq(meetingAttendees.id, id));

    return c.json({ success: true });
  } catch (error) {
    console.error("Error in meetings:", error);
    return c.json({ error: "فشل" }, 500);
  }
});

// القرارات
app.get("/decisions/all", async (c) => {
  try {
    const { status, assignedTo } = c.req.query();
    const conditions = [];
    if (status) conditions.push(eq(meetingDecisions.status, status));
    if (assignedTo) conditions.push(eq(meetingDecisions.assignedTo, assignedTo));

    const result = await db.select().from(meetingDecisions)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(meetingDecisions.createdAt));

    return c.json(result);
  } catch (error) {
    console.error("Error fetching decisions:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.post("/:id/decisions", async (c) => {
  try {
    const { id: meetingId } = c.req.param();
    const body = await c.req.json();
    const id = `dec_${nanoid(12)}`;
    const decisionNumber = generateNumber("DEC");

    await db.insert(meetingDecisions).values({
      id, meetingId, decisionNumber,
      title: body.title,
      description: body.description || null,
      category: body.category || "general",
      priority: body.priority || "medium",
      assignedTo: body.assignedTo || null,
      deadline: body.deadline ? new Date(body.deadline) : null,
      status: "pending",
      votesFor: body.votesFor || null,
      votesAgainst: body.votesAgainst || null,
      votesAbstain: body.votesAbstain || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return c.json({ id, decisionNumber }, 201);
  } catch (error) {
    console.error("Error creating decision:", error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

app.patch("/decisions/:id", async (c) => {
  try {
    const { id } = c.req.param();
    const body = await c.req.json();

    const updates: any = { updatedAt: new Date() };
    if (body.status) {
      updates.status = body.status;
      if (body.status === "completed") updates.completedAt = new Date();
    }
    if (body.implementationNotes) updates.implementationNotes = body.implementationNotes;
    if (body.assignedTo) updates.assignedTo = body.assignedTo;

    await db.update(meetingDecisions).set(updates).where(eq(meetingDecisions.id, id));

    return c.json({ success: true });
  } catch (error) {
    console.error("Error updating decision:", error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

app.post("/decisions/:id/followup", async (c) => {
  try {
    const { id: decisionId } = c.req.param();
    const body = await c.req.json();
    const id = `df_${nanoid(12)}`;

    await db.insert(decisionFollowUps).values({
      id, decisionId,
      updateText: body.updateText,
      progress: body.progress || null,
      attachments: body.attachments || null,
      createdBy: body.createdBy || null,
      createdAt: new Date(),
    });

    // تحديث نسبة الإنجاز في القرار
    if (body.progress) {
      const status = body.progress >= 100 ? "completed" : "in_progress";
      await db.update(meetingDecisions).set({
        status,
        completedAt: status === "completed" ? new Date() : null,
        updatedAt: new Date(),
      }).where(eq(meetingDecisions.id, decisionId));
    }

    return c.json({ id }, 201);
  } catch (error) {
    console.error("Error creating decision followup:", error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

// بنود المهام
app.post("/:id/actions", async (c) => {
  try {
    const { id: meetingId } = c.req.param();
    const body = await c.req.json();
    const id = `act_${nanoid(12)}`;

    await db.insert(meetingActionItems).values({
      id, meetingId,
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
    console.error("Error creating action item:", error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

app.patch("/actions/:id", async (c) => {
  try {
    const { id } = c.req.param();
    const { status } = await c.req.json();

    await db.update(meetingActionItems).set({
      status,
      completedAt: status === "completed" ? new Date() : null,
    }).where(eq(meetingActionItems.id, id));

    return c.json({ success: true });
  } catch (error) {
    console.error("Error updating action item:", error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

// القاعات
app.get("/rooms", async (c) => {
  try {
    const result = await db.select().from(meetingRooms)
      .where(eq(meetingRooms.isActive, true));
    return c.json(result);
  } catch (error) {
    console.error("Error fetching rooms:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.post("/rooms", async (c) => {
  try {
    const body = await c.req.json();
    const id = `room_${nanoid(12)}`;

    await db.insert(meetingRooms).values({
      id,
      name: body.name,
      branchId: body.branchId || null,
      floor: body.floor || null,
      building: body.building || null,
      capacity: body.capacity || null,
      facilities: body.facilities || null,
      isActive: true,
      createdAt: new Date(),
    });

    return c.json({ id }, 201);
  } catch (error) {
    console.error("Error creating room:", error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

export default app;

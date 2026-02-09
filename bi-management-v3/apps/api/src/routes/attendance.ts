import { Hono } from "hono";
import { db, attendance, employees, users } from "@bi-management/database";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";
import { authMiddleware } from "../lib/auth.js";

const app = new Hono();

// GET /attendance - List attendance records
app.get("/", async (c) => {
  try {
    const { page = "1", limit = "50", employeeId, date, startDate, endDate, status } = c.req.query();
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const conditions: any[] = [];

    if (employeeId) {
      conditions.push(eq(attendance.employeeId, employeeId));
    }

    if (date) {
      conditions.push(eq(attendance.date, date));
    }

    if (startDate && endDate) {
      conditions.push(gte(attendance.date, startDate));
      conditions.push(lte(attendance.date, endDate));
    }

    if (status) {
      conditions.push(eq(attendance.status, status));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [items, countResult] = await Promise.all([
      whereClause
        ? db.select().from(attendance).where(whereClause).orderBy(desc(attendance.date), desc(attendance.createdAt)).limit(parseInt(limit)).offset(offset)
        : db.select().from(attendance).orderBy(desc(attendance.date), desc(attendance.createdAt)).limit(parseInt(limit)).offset(offset),
      whereClause
        ? db.select({ count: sql<number>`count(*)` }).from(attendance).where(whereClause)
        : db.select({ count: sql<number>`count(*)` }).from(attendance),
    ]);

    // Get employee info
    const attendanceWithEmployee = await Promise.all(
      items.map(async (att) => {
        const [emp] = await db.select().from(employees).where(eq(employees.id, att.employeeId));
        let user = null;
        if (emp?.userId) {
          const [u] = await db.select({ id: users.id, fullName: users.fullName, avatar: users.avatarUrl }).from(users).where(eq(users.id, emp.userId));
          user = u;
        }
        return { ...att, employee: emp ? { ...emp, user } : null };
      })
    );

    return c.json({
      items: attendanceWithEmployee,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: Number(countResult[0]?.count || 0),
      },
    });
  } catch (error) {
    console.error("Error fetching attendance:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

// GET /attendance/today - Get today's attendance summary
app.get("/today", async (c) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const [present, absent, late, onLeave] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(attendance).where(and(eq(attendance.date, today), eq(attendance.status, 'present'))),
      db.select({ count: sql<number>`count(*)` }).from(attendance).where(and(eq(attendance.date, today), eq(attendance.status, 'absent'))),
      db.select({ count: sql<number>`count(*)` }).from(attendance).where(and(eq(attendance.date, today), eq(attendance.status, 'late'))),
      db.select({ count: sql<number>`count(*)` }).from(attendance).where(and(eq(attendance.date, today), eq(attendance.status, 'leave'))),
    ]);

    const todayRecords = await db.select().from(attendance).where(eq(attendance.date, today)).orderBy(desc(attendance.checkIn));

    const recordsWithEmployee = await Promise.all(
      todayRecords.map(async (att) => {
        const [emp] = await db.select().from(employees).where(eq(employees.id, att.employeeId));
        let user = null;
        if (emp?.userId) {
          const [u] = await db.select({ id: users.id, fullName: users.fullName, avatar: users.avatarUrl }).from(users).where(eq(users.id, emp.userId));
          user = u;
        }
        return { ...att, employee: emp ? { ...emp, user } : null };
      })
    );

    return c.json({
      summary: {
        present: Number(present[0]?.count || 0),
        absent: Number(absent[0]?.count || 0),
        late: Number(late[0]?.count || 0),
        onLeave: Number(onLeave[0]?.count || 0),
      },
      records: recordsWithEmployee,
    });
  } catch (error) {
    console.error("Error fetching today's attendance:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

// GET /attendance/:id - Get single attendance record
app.get("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const [record] = await db
      .select()
      .from(attendance)
      .where(eq(attendance.id, id));

    if (!record) {
      return c.json({ error: "Attendance record not found" }, 404);
    }

    const [emp] = await db.select().from(employees).where(eq(employees.id, record.employeeId));
    let user = null;
    if (emp?.userId) {
      const [u] = await db.select().from(users).where(eq(users.id, emp.userId));
      user = u;
    }

    return c.json({ ...record, employee: emp ? { ...emp, user } : null });
  } catch (error) {
    console.error("Error fetching attendance record:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

// POST /attendance - Create attendance record (check-in)
app.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const id = crypto.randomUUID();
    const today = body.date || new Date().toISOString().split('T')[0];
    const now = new Date().toTimeString().slice(0, 5);

    // Check if already checked in today
    const [existing] = await db
      .select()
      .from(attendance)
      .where(and(eq(attendance.employeeId, body.employeeId), eq(attendance.date, today)));

    if (existing) {
      return c.json({ error: "Already checked in today", existing }, 400);
    }

    await db.insert(attendance).values({
      id,
      employeeId: body.employeeId,
      date: today,
      checkIn: body.checkIn || now,
      checkInLocation: body.checkInLocation,
      status: body.status || 'present',
      notes: body.notes,
    });

    const [created] = await db
      .select()
      .from(attendance)
      .where(eq(attendance.id, id));

    return c.json(created, 201);
  } catch (error) {
    console.error("Error creating attendance:", error);
    return c.json({ error: "فشل في تسجيل الحضور" }, 500);
  }
});

// PUT /attendance/:id - Update attendance (check-out or edit)
app.put("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();

    // Calculate work hours if both check-in and check-out exist
    let workHours = body.workHours;
    if (body.checkIn && body.checkOut && !workHours) {
      const [inH, inM] = body.checkIn.split(':').map(Number);
      const [outH, outM] = body.checkOut.split(':').map(Number);
      workHours = ((outH * 60 + outM) - (inH * 60 + inM)) / 60;
    }

    await db
      .update(attendance)
      .set({
        checkIn: body.checkIn,
        checkOut: body.checkOut,
        checkInLocation: body.checkInLocation,
        checkOutLocation: body.checkOutLocation,
        workHours: workHours,
        overtimeHours: body.overtimeHours,
        status: body.status,
        notes: body.notes,
      })
      .where(eq(attendance.id, id));

    const [updated] = await db
      .select()
      .from(attendance)
      .where(eq(attendance.id, id));

    return c.json(updated);
  } catch (error) {
    console.error("Error updating attendance:", error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

// POST /attendance/checkout/:employeeId - Quick checkout
app.post("/checkout/:employeeId", async (c) => {
  try {
    const employeeId = c.req.param("employeeId");
    const body = await c.req.json();
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toTimeString().slice(0, 5);

    const [record] = await db
      .select()
      .from(attendance)
      .where(and(eq(attendance.employeeId, employeeId), eq(attendance.date, today)));

    if (!record) {
      return c.json({ error: "No check-in found for today" }, 404);
    }

    if (record.checkOut) {
      return c.json({ error: "Already checked out" }, 400);
    }

    // Calculate work hours
    const checkOut = body.checkOut || now;
    const [inH, inM] = record.checkIn!.split(':').map(Number);
    const [outH, outM] = checkOut.split(':').map(Number);
    const workHours = ((outH * 60 + outM) - (inH * 60 + inM)) / 60;

    await db
      .update(attendance)
      .set({
        checkOut,
        checkOutLocation: body.checkOutLocation,
        workHours: Math.max(0, workHours),
      })
      .where(eq(attendance.id, record.id));

    const [updated] = await db
      .select()
      .from(attendance)
      .where(eq(attendance.id, record.id));

    return c.json(updated);
  } catch (error) {
    console.error("Error checking out:", error);
    return c.json({ error: "فشل في تسجيل الحضور" }, 500);
  }
});

// DELETE /attendance/:id - Delete attendance record
app.delete("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    await db.delete(attendance).where(eq(attendance.id, id));
    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting attendance:", error);
    return c.json({ error: "فشل في حذف السجل" }, 500);
  }
});

export default app;

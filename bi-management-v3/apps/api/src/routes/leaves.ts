import { Hono } from "hono";
import { db, leaves, employees, users } from "@bi-management/database";
import { eq, desc, and, sql, gte, lte } from "drizzle-orm";
import { authMiddleware } from "../lib/auth.js";

const app = new Hono();

// GET /leaves - List all leave requests
app.get("/", async (c) => {
  try {
    const { page = "1", limit = "50", employeeId, status, type } = c.req.query();
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const conditions: any[] = [];

    if (employeeId) {
      conditions.push(eq(leaves.employeeId, employeeId));
    }

    if (status) {
      conditions.push(eq(leaves.status, status));
    }

    if (type) {
      conditions.push(eq(leaves.type, type));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [items, countResult] = await Promise.all([
      whereClause
        ? db.select().from(leaves).where(whereClause).orderBy(desc(leaves.createdAt)).limit(parseInt(limit)).offset(offset)
        : db.select().from(leaves).orderBy(desc(leaves.createdAt)).limit(parseInt(limit)).offset(offset),
      whereClause
        ? db.select({ count: sql<number>`count(*)` }).from(leaves).where(whereClause)
        : db.select({ count: sql<number>`count(*)` }).from(leaves),
    ]);

    // Get employee info
    const leavesWithEmployee = await Promise.all(
      items.map(async (leave) => {
        const [emp] = await db.select().from(employees).where(eq(employees.id, leave.employeeId));
        let user = null;
        if (emp?.userId) {
          const [u] = await db.select({ id: users.id, fullName: users.fullName, avatar: users.avatarUrl }).from(users).where(eq(users.id, emp.userId));
          user = u;
        }
        return { ...leave, employee: emp ? { ...emp, user } : null };
      })
    );

    return c.json({
      items: leavesWithEmployee,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: Number(countResult[0]?.count || 0),
      },
    });
  } catch (error) {
    console.error("Error fetching leaves:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

// GET /leaves/stats - Get leave statistics
app.get("/stats", async (c) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const [pending, approved, rejected, currentlyOnLeave] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(leaves).where(eq(leaves.status, 'pending')),
      db.select({ count: sql<number>`count(*)` }).from(leaves).where(eq(leaves.status, 'approved')),
      db.select({ count: sql<number>`count(*)` }).from(leaves).where(eq(leaves.status, 'rejected')),
      db.select({ count: sql<number>`count(*)` }).from(leaves).where(and(
        eq(leaves.status, 'approved'),
        lte(leaves.startDate, today),
        gte(leaves.endDate, today)
      )),
    ]);

    return c.json({
      pending: Number(pending[0]?.count || 0),
      approved: Number(approved[0]?.count || 0),
      rejected: Number(rejected[0]?.count || 0),
      currentlyOnLeave: Number(currentlyOnLeave[0]?.count || 0),
    });
  } catch (error) {
    console.error("Error fetching leave stats:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

// GET /leaves/:id - Get single leave request
app.get("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const [leave] = await db
      .select()
      .from(leaves)
      .where(eq(leaves.id, id));

    if (!leave) {
      return c.json({ error: "Leave request not found" }, 404);
    }

    const [emp] = await db.select().from(employees).where(eq(employees.id, leave.employeeId));
    let user = null;
    let approver = null;
    
    if (emp?.userId) {
      const [u] = await db.select().from(users).where(eq(users.id, emp.userId));
      user = u;
    }
    
    if (leave.approvedBy) {
      const [a] = await db.select({ id: users.id, fullName: users.fullName }).from(users).where(eq(users.id, leave.approvedBy));
      approver = a;
    }

    return c.json({ 
      ...leave, 
      employee: emp ? { ...emp, user } : null,
      approver 
    });
  } catch (error) {
    console.error("Error fetching leave request:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

// POST /leaves - Create leave request
app.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const id = crypto.randomUUID();

    // Calculate days
    const start = new Date(body.startDate);
    const end = new Date(body.endDate);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    await db.insert(leaves).values({
      id,
      employeeId: body.employeeId,
      type: body.type,
      startDate: body.startDate,
      endDate: body.endDate,
      days,
      reason: body.reason,
      status: 'pending',
    });

    const [created] = await db
      .select()
      .from(leaves)
      .where(eq(leaves.id, id));

    return c.json(created, 201);
  } catch (error) {
    console.error("Error creating leave request:", error);
    return c.json({ error: "فشل في تقديم طلب الإجازة" }, 500);
  }
});

// PUT /leaves/:id - Update leave request
app.put("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();

    // Calculate days if dates changed
    let days = body.days;
    if (body.startDate && body.endDate) {
      const start = new Date(body.startDate);
      const end = new Date(body.endDate);
      days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    }

    await db
      .update(leaves)
      .set({
        type: body.type,
        startDate: body.startDate,
        endDate: body.endDate,
        days,
        reason: body.reason,
        status: body.status,
      })
      .where(eq(leaves.id, id));

    const [updated] = await db
      .select()
      .from(leaves)
      .where(eq(leaves.id, id));

    return c.json(updated);
  } catch (error) {
    console.error("Error updating leave request:", error);
    return c.json({ error: "فشل في تحديث الطلب" }, 500);
  }
});

// POST /leaves/:id/approve - Approve leave request
app.post("/:id/approve", async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();

    await db
      .update(leaves)
      .set({
        status: 'approved',
        approvedBy: body.approvedBy,
        approvedAt: new Date(),
      })
      .where(eq(leaves.id, id));

    const [updated] = await db
      .select()
      .from(leaves)
      .where(eq(leaves.id, id));

    return c.json(updated);
  } catch (error) {
    console.error("Error approving leave:", error);
    return c.json({ error: "فشل في تحديث الطلب" }, 500);
  }
});

// POST /leaves/:id/reject - Reject leave request
app.post("/:id/reject", async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();

    await db
      .update(leaves)
      .set({
        status: 'rejected',
        approvedBy: body.approvedBy,
        approvedAt: new Date(),
        rejectionReason: body.rejectionReason,
      })
      .where(eq(leaves.id, id));

    const [updated] = await db
      .select()
      .from(leaves)
      .where(eq(leaves.id, id));

    return c.json(updated);
  } catch (error) {
    console.error("Error rejecting leave:", error);
    return c.json({ error: "فشل في تحديث الطلب" }, 500);
  }
});

// DELETE /leaves/:id - Delete leave request
app.delete("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    await db.delete(leaves).where(eq(leaves.id, id));
    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting leave request:", error);
    return c.json({ error: "فشل في حذف الطلب" }, 500);
  }
});

export default app;

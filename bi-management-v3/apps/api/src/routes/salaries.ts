import { Hono } from "hono";
import { db, salaries, salaryAdvances, employees, users, attendance } from "@bi-management/database";
import { eq, desc, and, sql, gte, lte, sum } from "drizzle-orm";
import { authMiddleware } from "../lib/auth.js";

const app = new Hono();

// GET /salaries - List all salary records
app.get("/", async (c) => {
  try {
    const { page = "1", limit = "50", employeeId, status, periodStart, periodEnd } = c.req.query();
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const conditions: any[] = [];

    if (employeeId) {
      conditions.push(eq(salaries.employeeId, employeeId));
    }

    if (status) {
      conditions.push(eq(salaries.status, status));
    }

    if (periodStart) {
      conditions.push(gte(salaries.periodStart, periodStart));
    }

    if (periodEnd) {
      conditions.push(lte(salaries.periodEnd, periodEnd));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [items, countResult] = await Promise.all([
      whereClause
        ? db.select().from(salaries).where(whereClause).orderBy(desc(salaries.createdAt)).limit(parseInt(limit)).offset(offset)
        : db.select().from(salaries).orderBy(desc(salaries.createdAt)).limit(parseInt(limit)).offset(offset),
      whereClause
        ? db.select({ count: sql<number>`count(*)` }).from(salaries).where(whereClause)
        : db.select({ count: sql<number>`count(*)` }).from(salaries),
    ]);

    // Get employee info
    const salariesWithEmployee = await Promise.all(
      items.map(async (salary) => {
        const [emp] = await db.select().from(employees).where(eq(employees.id, salary.employeeId));
        let user = null;
        if (emp?.userId) {
          const [u] = await db.select({ id: users.id, fullName: users.fullName, avatar: users.avatarUrl }).from(users).where(eq(users.id, emp.userId));
          user = u;
        }
        return { ...salary, employee: emp ? { ...emp, user } : null };
      })
    );

    return c.json({
      items: salariesWithEmployee,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: Number(countResult[0]?.count || 0),
      },
    });
  } catch (error) {
    console.error("Error fetching salaries:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

// GET /salaries/stats - Get salary statistics
app.get("/stats", async (c) => {
  try {
    const currentMonth = new Date().toISOString().slice(0, 7);

    const [totalPaid, totalPending, totalDraft, monthlyTotal] = await Promise.all([
      db.select({ total: sum(salaries.netSalary) }).from(salaries).where(eq(salaries.status, 'paid')),
      db.select({ total: sum(salaries.netSalary) }).from(salaries).where(eq(salaries.status, 'approved')),
      db.select({ total: sum(salaries.netSalary) }).from(salaries).where(eq(salaries.status, 'draft')),
      db.select({ total: sum(salaries.netSalary) }).from(salaries).where(and(
        eq(salaries.status, 'paid'),
        sql`${salaries.periodStart} >= ${currentMonth + '-01'}`
      )),
    ]);

    return c.json({
      totalPaid: Number(totalPaid[0]?.total || 0),
      totalPending: Number(totalPending[0]?.total || 0),
      totalDraft: Number(totalDraft[0]?.total || 0),
      monthlyTotal: Number(monthlyTotal[0]?.total || 0),
    });
  } catch (error) {
    console.error("Error fetching salary stats:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

// GET /salaries/:id - Get single salary record
app.get("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const [salary] = await db
      .select()
      .from(salaries)
      .where(eq(salaries.id, id));

    if (!salary) {
      return c.json({ error: "Salary record not found" }, 404);
    }

    const [emp] = await db.select().from(employees).where(eq(employees.id, salary.employeeId));
    let user = null;
    let approver = null;
    let creator = null;
    
    if (emp?.userId) {
      const [u] = await db.select().from(users).where(eq(users.id, emp.userId));
      user = u;
    }
    
    if (salary.approvedBy) {
      const [a] = await db.select({ id: users.id, fullName: users.fullName }).from(users).where(eq(users.id, salary.approvedBy));
      approver = a;
    }
    
    if (salary.createdBy) {
      const [cr] = await db.select({ id: users.id, fullName: users.fullName }).from(users).where(eq(users.id, salary.createdBy));
      creator = cr;
    }

    return c.json({ 
      ...salary, 
      employee: emp ? { ...emp, user } : null,
      approver,
      creator 
    });
  } catch (error) {
    console.error("Error fetching salary record:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

// POST /salaries - Create salary record
app.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const id = crypto.randomUUID();

    // Calculate net salary
    const basicSalary = body.basicSalary || 0;
    const allowances = body.allowances || 0;
    const overtime = body.overtime || 0;
    const bonuses = body.bonuses || 0;
    const deductions = body.deductions || 0;
    const advancesDeducted = body.advancesDeducted || 0;
    const loansDeducted = body.loansDeducted || 0;

    const netSalary = basicSalary + allowances + overtime + bonuses - deductions - advancesDeducted - loansDeducted;

    await db.insert(salaries).values({
      id,
      employeeId: body.employeeId,
      periodStart: body.periodStart,
      periodEnd: body.periodEnd,
      basicSalary,
      allowances,
      overtime,
      bonuses,
      deductions,
      advancesDeducted,
      loansDeducted,
      netSalary,
      status: 'draft',
      paymentMethod: body.paymentMethod,
      notes: body.notes,
      createdBy: body.createdBy,
    });

    const [created] = await db
      .select()
      .from(salaries)
      .where(eq(salaries.id, id));

    return c.json(created, 201);
  } catch (error) {
    console.error("Error creating salary:", error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

// POST /salaries/generate - Generate salaries for all active employees
app.post("/generate", async (c) => {
  try {
    const body = await c.req.json();
    const { periodStart, periodEnd, createdBy } = body;

    // Get all active employees
    const activeEmployees = await db.select().from(employees).where(eq(employees.isActive, 1));

    const generatedSalaries = [];

    for (const emp of activeEmployees) {
      // Check if salary already exists for this period
      const [existing] = await db
        .select()
        .from(salaries)
        .where(and(
          eq(salaries.employeeId, emp.id),
          eq(salaries.periodStart, periodStart),
          eq(salaries.periodEnd, periodEnd)
        ));

      if (existing) continue;

      // Calculate overtime from attendance
      const attendanceRecords = await db
        .select()
        .from(attendance)
        .where(and(
          eq(attendance.employeeId, emp.id),
          gte(attendance.date, periodStart),
          lte(attendance.date, periodEnd)
        ));

      const totalOvertime = attendanceRecords.reduce((sum, a) => sum + (a.overtimeHours || 0), 0);
      const hourlyRate = emp.salary ? emp.salary / 30 / 8 : 0;
      const overtimeAmount = totalOvertime * hourlyRate * 1.5;

      // Get pending advances
      const pendingAdvances = await db
        .select()
        .from(salaryAdvances)
        .where(and(
          eq(salaryAdvances.employeeId, emp.id),
          eq(salaryAdvances.status, 'approved')
        ));

      const advancesDeducted = pendingAdvances.reduce((sum, a) => {
        if (a.deductionType === 'full') return sum + (a.remainingAmount || a.amount);
        return sum + (a.installmentAmount || 0);
      }, 0);

      // Parse allowances
      let allowances = 0;
      if (emp.allowances) {
        try {
          const allowancesObj = JSON.parse(emp.allowances);
          allowances = Object.values(allowancesObj).reduce((sum: number, val: any) => sum + (Number(val) || 0), 0);
        } catch {}
      }

      const basicSalary = emp.salary || 0;
      const netSalary = basicSalary + allowances + overtimeAmount - advancesDeducted;

      const id = crypto.randomUUID();
      await db.insert(salaries).values({
        id,
        employeeId: emp.id,
        periodStart,
        periodEnd,
        basicSalary,
        allowances,
        overtime: overtimeAmount,
        bonuses: 0,
        deductions: 0,
        advancesDeducted,
        loansDeducted: 0,
        netSalary,
        status: 'draft',
        createdBy,
      });

      const [created] = await db.select().from(salaries).where(eq(salaries.id, id));
      generatedSalaries.push(created);
    }

    return c.json({ 
      message: `Generated ${generatedSalaries.length} salary records`,
      salaries: generatedSalaries 
    }, 201);
  } catch (error) {
    console.error("Error generating salaries:", error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

// PUT /salaries/:id - Update salary record
app.put("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();

    // Recalculate net salary
    const basicSalary = body.basicSalary || 0;
    const allowances = body.allowances || 0;
    const overtime = body.overtime || 0;
    const bonuses = body.bonuses || 0;
    const deductions = body.deductions || 0;
    const advancesDeducted = body.advancesDeducted || 0;
    const loansDeducted = body.loansDeducted || 0;

    const netSalary = basicSalary + allowances + overtime + bonuses - deductions - advancesDeducted - loansDeducted;

    await db
      .update(salaries)
      .set({
        periodStart: body.periodStart,
        periodEnd: body.periodEnd,
        basicSalary,
        allowances,
        overtime,
        bonuses,
        deductions,
        advancesDeducted,
        loansDeducted,
        netSalary,
        status: body.status,
        paymentMethod: body.paymentMethod,
        notes: body.notes,
      })
      .where(eq(salaries.id, id));

    const [updated] = await db
      .select()
      .from(salaries)
      .where(eq(salaries.id, id));

    return c.json(updated);
  } catch (error) {
    console.error("Error updating salary:", error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

// POST /salaries/:id/approve - Approve salary
app.post("/:id/approve", async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();

    await db
      .update(salaries)
      .set({
        status: 'approved',
        approvedBy: body.approvedBy,
        approvedAt: new Date(),
      })
      .where(eq(salaries.id, id));

    const [updated] = await db
      .select()
      .from(salaries)
      .where(eq(salaries.id, id));

    return c.json(updated);
  } catch (error) {
    console.error("Error approving salary:", error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

// POST /salaries/:id/pay - Mark salary as paid
app.post("/:id/pay", async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();

    await db
      .update(salaries)
      .set({
        status: 'paid',
        paidAt: new Date(),
        paymentMethod: body.paymentMethod,
        paymentReference: body.paymentReference,
      })
      .where(eq(salaries.id, id));

    const [updated] = await db
      .select()
      .from(salaries)
      .where(eq(salaries.id, id));

    return c.json(updated);
  } catch (error) {
    console.error("Error marking salary as paid:", error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

// DELETE /salaries/:id - Delete salary record
app.delete("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    await db.delete(salaries).where(eq(salaries.id, id));
    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting salary:", error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

// ==================== SALARY ADVANCES ====================

// GET /salaries/advances - List all advances
app.get("/advances/list", async (c) => {
  try {
    const { page = "1", limit = "50", employeeId, status } = c.req.query();
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const conditions: any[] = [];

    if (employeeId) {
      conditions.push(eq(salaryAdvances.employeeId, employeeId));
    }

    if (status) {
      conditions.push(eq(salaryAdvances.status, status));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [items, countResult] = await Promise.all([
      whereClause
        ? db.select().from(salaryAdvances).where(whereClause).orderBy(desc(salaryAdvances.createdAt)).limit(parseInt(limit)).offset(offset)
        : db.select().from(salaryAdvances).orderBy(desc(salaryAdvances.createdAt)).limit(parseInt(limit)).offset(offset),
      whereClause
        ? db.select({ count: sql<number>`count(*)` }).from(salaryAdvances).where(whereClause)
        : db.select({ count: sql<number>`count(*)` }).from(salaryAdvances),
    ]);

    const advancesWithEmployee = await Promise.all(
      items.map(async (advance) => {
        const [emp] = await db.select().from(employees).where(eq(employees.id, advance.employeeId));
        let user = null;
        if (emp?.userId) {
          const [u] = await db.select({ id: users.id, fullName: users.fullName }).from(users).where(eq(users.id, emp.userId));
          user = u;
        }
        return { ...advance, employee: emp ? { ...emp, user } : null };
      })
    );

    return c.json({
      items: advancesWithEmployee,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: Number(countResult[0]?.count || 0),
      },
    });
  } catch (error) {
    console.error("Error fetching advances:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

// POST /salaries/advances - Create advance request
app.post("/advances", async (c) => {
  try {
    const body = await c.req.json();
    const id = crypto.randomUUID();

    await db.insert(salaryAdvances).values({
      id,
      employeeId: body.employeeId,
      amount: body.amount,
      reason: body.reason,
      deductionType: body.deductionType || 'installments',
      installmentAmount: body.installmentAmount,
      installmentCount: body.installmentCount,
      remainingAmount: body.amount,
      status: 'pending',
    });

    const [created] = await db
      .select()
      .from(salaryAdvances)
      .where(eq(salaryAdvances.id, id));

    return c.json(created, 201);
  } catch (error) {
    console.error("Error creating advance:", error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

// POST /salaries/advances/:id/approve
app.post("/advances/:id/approve", async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();

    await db
      .update(salaryAdvances)
      .set({
        status: 'approved',
        approvedBy: body.approvedBy,
        approvedAt: new Date(),
      })
      .where(eq(salaryAdvances.id, id));

    const [updated] = await db
      .select()
      .from(salaryAdvances)
      .where(eq(salaryAdvances.id, id));

    return c.json(updated);
  } catch (error) {
    console.error("Error approving advance:", error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

// POST /salaries/advances/:id/reject
app.post("/advances/:id/reject", async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();

    await db
      .update(salaryAdvances)
      .set({
        status: 'rejected',
        approvedBy: body.approvedBy,
        approvedAt: new Date(),
        rejectionReason: body.rejectionReason,
      })
      .where(eq(salaryAdvances.id, id));

    const [updated] = await db
      .select()
      .from(salaryAdvances)
      .where(eq(salaryAdvances.id, id));

    return c.json(updated);
  } catch (error) {
    console.error("Error rejecting advance:", error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

export default app;

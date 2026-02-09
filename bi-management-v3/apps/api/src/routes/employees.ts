import { Hono } from "hono";
import { db, employees, departments, positions, users, attendance, leaves, salaries } from "@bi-management/database";
import { eq, desc, like, or, sql, and, gte, lte } from "drizzle-orm";
import { authMiddleware } from "../lib/auth.js";

const app = new Hono();

app.use("*", authMiddleware);

// GET /employees - List all employees
app.get("/", async (c) => {
  try {
    const { page = "1", limit = "50", search, departmentId, positionId, status } = c.req.query();
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const conditions: any[] = [];

    if (search) {
      conditions.push(
        or(
          like(employees.employeeCode, `%${search}%`)
        )
      );
    }

    if (departmentId) {
      conditions.push(eq(employees.departmentId, departmentId));
    }

    if (positionId) {
      conditions.push(eq(employees.positionId, positionId));
    }

    if (status === "active") {
      conditions.push(eq(employees.isActive, 1));
    } else if (status === "inactive") {
      conditions.push(eq(employees.isActive, 0));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [items, countResult] = await Promise.all([
      whereClause
        ? db.select().from(employees).where(whereClause).orderBy(desc(employees.createdAt)).limit(parseInt(limit)).offset(offset)
        : db.select().from(employees).orderBy(desc(employees.createdAt)).limit(parseInt(limit)).offset(offset),
      whereClause
        ? db.select({ count: sql<number>`count(*)` }).from(employees).where(whereClause)
        : db.select({ count: sql<number>`count(*)` }).from(employees),
    ]);

    // Get related data for each employee
    const employeesWithDetails = await Promise.all(
      items.map(async (emp) => {
        const [user, dept, pos] = await Promise.all([
          emp.userId ? db.select({ id: users.id, fullName: users.fullName, email: users.email, phone: users.phone, avatar: users.avatarUrl }).from(users).where(eq(users.id, emp.userId)).then(r => r[0]) : null,
          emp.departmentId ? db.select({ id: departments.id, name: departments.name }).from(departments).where(eq(departments.id, emp.departmentId)).then(r => r[0]) : null,
          emp.positionId ? db.select({ id: positions.id, name: positions.name }).from(positions).where(eq(positions.id, emp.positionId)).then(r => r[0]) : null,
        ]);
        return { ...emp, user, department: dept, position: pos };
      })
    );

    return c.json({
      items: employeesWithDetails,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: Number(countResult[0]?.count || 0),
      },
    });
  } catch (error) {
    console.error("Error fetching employees:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

// GET /employees/stats - Get employee statistics
app.get("/stats", async (c) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const [
      totalEmployees,
      activeEmployees,
      presentToday,
      onLeaveToday
    ] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(employees),
      db.select({ count: sql<number>`count(*)` }).from(employees).where(eq(employees.isActive, 1)),
      db.select({ count: sql<number>`count(*)` }).from(attendance).where(and(eq(attendance.date, today), eq(attendance.status, 'present'))),
      db.select({ count: sql<number>`count(*)` }).from(leaves).where(and(lte(leaves.startDate, today), gte(leaves.endDate, today), eq(leaves.status, 'approved'))),
    ]);

    return c.json({
      totalEmployees: Number(totalEmployees[0]?.count || 0),
      activeEmployees: Number(activeEmployees[0]?.count || 0),
      presentToday: Number(presentToday[0]?.count || 0),
      onLeaveToday: Number(onLeaveToday[0]?.count || 0),
    });
  } catch (error) {
    console.error("Error fetching employee stats:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

// GET /employees/:id - Get single employee
app.get("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const [employee] = await db
      .select()
      .from(employees)
      .where(eq(employees.id, id));

    if (!employee) {
      return c.json({ error: "Employee not found" }, 404);
    }

    const [user, dept, pos, manager, recentAttendance, recentLeaves] = await Promise.all([
      employee.userId ? db.select().from(users).where(eq(users.id, employee.userId)).then(r => r[0]) : null,
      employee.departmentId ? db.select().from(departments).where(eq(departments.id, employee.departmentId)).then(r => r[0]) : null,
      employee.positionId ? db.select().from(positions).where(eq(positions.id, employee.positionId)).then(r => r[0]) : null,
      employee.managerId ? db.select().from(employees).where(eq(employees.id, employee.managerId)).then(r => r[0]) : null,
      db.select().from(attendance).where(eq(attendance.employeeId, id)).orderBy(desc(attendance.date)).limit(10),
      db.select().from(leaves).where(eq(leaves.employeeId, id)).orderBy(desc(leaves.createdAt)).limit(5),
    ]);

    return c.json({
      ...employee,
      user,
      department: dept,
      position: pos,
      manager,
      recentAttendance,
      recentLeaves,
    });
  } catch (error) {
    console.error("Error fetching employee:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

// POST /employees - Create employee
app.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const id = crypto.randomUUID();

    await db.insert(employees).values({
      id,
      userId: body.userId || null,
      employeeCode: body.employeeCode,
      departmentId: body.departmentId || null,
      positionId: body.positionId || null,
      managerId: body.managerId || null,
      workStartTime: body.workStartTime,
      workEndTime: body.workEndTime,
      workDays: body.workDays,
      salary: body.salary,
      salaryType: body.salaryType,
      allowances: body.allowances,
      bankAccount: body.bankAccount,
      bankName: body.bankName,
      hireDate: body.hireDate,
      contractEndDate: body.contractEndDate,
      contractType: body.contractType,
      emergencyContact: body.emergencyContact,
      emergencyPhone: body.emergencyPhone,
      isActive: body.isActive ?? 1,
    });

    const [created] = await db
      .select()
      .from(employees)
      .where(eq(employees.id, id));

    return c.json(created, 201);
  } catch (error) {
    console.error("Error creating employee:", error);
    return c.json({ error: "فشل في إضافة الموظف" }, 500);
  }
});

// PUT /employees/:id - Update employee
app.put("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();

    await db
      .update(employees)
      .set({
        userId: body.userId || null,
        employeeCode: body.employeeCode,
        departmentId: body.departmentId || null,
        positionId: body.positionId || null,
        managerId: body.managerId || null,
        workStartTime: body.workStartTime,
        workEndTime: body.workEndTime,
        workDays: body.workDays,
        salary: body.salary,
        salaryType: body.salaryType,
        allowances: body.allowances,
        bankAccount: body.bankAccount,
        bankName: body.bankName,
        hireDate: body.hireDate,
        contractEndDate: body.contractEndDate,
        contractType: body.contractType,
        emergencyContact: body.emergencyContact,
        emergencyPhone: body.emergencyPhone,
        isActive: body.isActive,
        updatedAt: new Date(),
      })
      .where(eq(employees.id, id));

    const [updated] = await db
      .select()
      .from(employees)
      .where(eq(employees.id, id));

    return c.json(updated);
  } catch (error) {
    console.error("Error updating employee:", error);
    return c.json({ error: "فشل في تحديث بيانات الموظف" }, 500);
  }
});

// DELETE /employees/:id - Delete employee
app.delete("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    await db.delete(employees).where(eq(employees.id, id));
    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting employee:", error);
    return c.json({ error: "فشل في حذف الموظف" }, 500);
  }
});

export default app;

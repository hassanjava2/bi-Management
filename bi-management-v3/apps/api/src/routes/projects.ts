import { Hono } from "hono";
import { db, projects, projectTasks, projectMilestones, timeEntries, projectMembers, users, customers } from "@bi-management/database";
import { eq, desc, sql } from "drizzle-orm";
import { authMiddleware } from "../lib/auth.js";

const app = new Hono();

app.get("/", async (c) => {
  try {
    const { status, limit = "50" } = c.req.query();

    let query = db
      .select({
        project: projects,
        customer: customers,
        manager: users,
      })
      .from(projects)
      .leftJoin(customers, eq(projects.customerId, customers.id))
      .leftJoin(users, eq(projects.managerId, users.id));

    if (status) {
      query = query.where(eq(projects.status, status)) as typeof query;
    }

    const items = await query.orderBy(desc(projects.createdAt)).limit(parseInt(limit));

    return c.json({
      items: items.map((row) => ({
        ...row.project,
        customer: row.customer ? { id: row.customer.id, name: row.customer.name } : null,
        manager: row.manager ? { id: row.manager.id, name: row.manager.name } : null,
      })),
    });
  } catch (error) {
    console.error(error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.get("/stats", async (c) => {
  try {
    const [stats] = await db
      .select({
        total: sql<number>`count(*)`,
        active: sql<number>`count(*) filter (where ${projects.status} = 'active')`,
        completed: sql<number>`count(*) filter (where ${projects.status} = 'completed')`,
        totalBudget: sql<number>`coalesce(sum(${projects.estimatedBudget}), 0)`,
        totalCost: sql<number>`coalesce(sum(${projects.actualCost}), 0)`,
      })
      .from(projects);

    return c.json(stats);
  } catch (error) {
    console.error(error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.get("/:id", async (c) => {
  try {
    const { id } = c.req.param();

    const [project] = await db
      .select({
        project: projects,
        customer: customers,
        manager: users,
      })
      .from(projects)
      .leftJoin(customers, eq(projects.customerId, customers.id))
      .leftJoin(users, eq(projects.managerId, users.id))
      .where(eq(projects.id, id));

    if (!project) return c.json({ error: "Project not found" }, 404);

    const tasks = await db.select().from(projectTasks).where(eq(projectTasks.projectId, id)).orderBy(projectTasks.sortOrder);

    return c.json({
      ...project.project,
      customer: project.customer,
      manager: project.manager,
      tasks,
    });
  } catch (error) {
    console.error(error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const id = crypto.randomUUID();
    const code = `PRJ-${Date.now().toString(36).toUpperCase()}`;

    await db.insert(projects).values({
      id,
      code,
      name: body.name,
      nameAr: body.nameAr,
      description: body.description,
      customerId: body.customerId,
      managerId: body.managerId,
      status: "planning",
      priority: body.priority || "normal",
      projectType: body.projectType,
      startDate: body.startDate,
      endDate: body.endDate,
      estimatedBudget: body.estimatedBudget,
      isBillable: body.isBillable ?? 1,
      hourlyRate: body.hourlyRate,
      notes: body.notes,
      createdBy: body.createdBy,
    });

    return c.json({ id, code }, 201);
  } catch (error) {
    console.error(error);
    return c.json({ error: "فشل في إنشاء المشروع" }, 500);
  }
});

app.post("/tasks", async (c) => {
  try {
    const body = await c.req.json();
    const id = crypto.randomUUID();
    const code = `TSK-${Date.now().toString(36).toUpperCase()}`;

    await db.insert(projectTasks).values({
      id,
      code,
      projectId: body.projectId,
      parentTaskId: body.parentTaskId,
      name: body.name,
      description: body.description,
      assigneeId: body.assigneeId,
      status: "todo",
      priority: body.priority || "normal",
      startDate: body.startDate,
      dueDate: body.dueDate,
      estimatedHours: body.estimatedHours,
      sortOrder: body.sortOrder || 0,
      createdBy: body.createdBy,
    });

    await db
      .update(projects)
      .set({ totalTasks: sql`${projects.totalTasks} + 1`, updatedAt: new Date() })
      .where(eq(projects.id, body.projectId));

    return c.json({ id, code }, 201);
  } catch (error) {
    console.error(error);
    return c.json({ error: "فشل في إنشاء المشروع" }, 500);
  }
});

app.put("/tasks/:id/status", async (c) => {
  try {
    const { id } = c.req.param();
    const body = await c.req.json();

    const [task] = await db.select().from(projectTasks).where(eq(projectTasks.id, id));
    if (!task) return c.json({ error: "Task not found" }, 404);

    const wasCompleted = task.status === "done";
    const isNowCompleted = body.status === "done";

    await db
      .update(projectTasks)
      .set({
        status: body.status,
        completedAt: isNowCompleted ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(projectTasks.id, id));

    if (!wasCompleted && isNowCompleted) {
      await db
        .update(projects)
        .set({ completedTasks: sql`${projects.completedTasks} + 1`, updatedAt: new Date() })
        .where(eq(projects.id, task.projectId || ""));
    } else if (wasCompleted && !isNowCompleted) {
      await db
        .update(projects)
        .set({ completedTasks: sql`${projects.completedTasks} - 1`, updatedAt: new Date() })
        .where(eq(projects.id, task.projectId || ""));
    }

    return c.json({ success: true });
  } catch (error) {
    console.error(error);
    return c.json({ error: "فشل في تحديث المشروع" }, 500);
  }
});

export default app;

/**
 * API Routes - نظام إدارة المهام
 */
import { Hono } from "hono";
import {
  db, tasks, taskChecklists, taskComments, taskActivities, taskReminders,
  taskTemplates, taskTimeEntries, users, departments
} from "@bi-management/database";
import { eq, and, or, desc, asc, count, sql, like, gte, lte, inArray, isNull } from "drizzle-orm";
import { nanoid } from "nanoid";
import { authMiddleware } from "../lib/auth.js";

const app = new Hono();


// توليد رقم المهمة
async function generateTaskNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `TSK-${year}-`;
  
  const [last] = await db.select({ taskNumber: tasks.taskNumber })
    .from(tasks).where(like(tasks.taskNumber, `${prefix}%`))
    .orderBy(desc(tasks.taskNumber)).limit(1);
  
  let nextNum = 1;
  if (last?.taskNumber) {
    const num = parseInt(last.taskNumber.replace(prefix, ""), 10);
    if (!isNaN(num)) nextNum = num + 1;
  }
  return `${prefix}${String(nextNum).padStart(6, "0")}`;
}

// ========== المهام ==========

/**
 * جلب المهام
 */
app.get("/", async (c) => {
  try {
    const { status, priority, assignedTo, departmentId, dueDate, search, page = "1", limit = "20" } = c.req.query();
    const conditions = [];

    if (status) conditions.push(inArray(tasks.status, status.split(",")));
    if (priority) conditions.push(inArray(tasks.priority, priority.split(",")));
    if (assignedTo) conditions.push(eq(tasks.assignedTo, assignedTo));
    if (departmentId) conditions.push(eq(tasks.departmentId, departmentId));
    if (dueDate === "overdue") {
      conditions.push(lte(tasks.dueDate, new Date()));
      conditions.push(or(eq(tasks.status, "pending"), eq(tasks.status, "in_progress")));
    }
    if (dueDate === "today") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      conditions.push(gte(tasks.dueDate, today));
      conditions.push(lte(tasks.dueDate, tomorrow));
    }
    if (search) {
      conditions.push(or(
        like(tasks.title, `%${search}%`),
        like(tasks.taskNumber, `%${search}%`)
      ));
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    const result = await db.select({
      task: tasks,
      assignee: { id: users.id, fullName: users.fullName },
    }).from(tasks)
      .leftJoin(users, eq(tasks.assignedTo, users.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(tasks.createdAt))
      .limit(limitNum).offset((pageNum - 1) * limitNum);

    const [total] = await db.select({ count: count() }).from(tasks)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    return c.json({
      tasks: result.map(r => ({ ...r.task, assignee: r.assignee })),
      pagination: { page: pageNum, limit: limitNum, total: total?.count || 0 },
    });
  } catch (error) {
    console.error("Tasks error:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

/**
 * إحصائيات المهام
 */
app.get("/stats", async (c) => {
  try {
    const { userId } = c.req.query();
    const conditions = userId ? [eq(tasks.assignedTo, userId)] : [];

    const stats = await db.select({
      status: tasks.status,
      count: count(),
    }).from(tasks)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .groupBy(tasks.status);

    const [overdue] = await db.select({ count: count() }).from(tasks)
      .where(and(
        lte(tasks.dueDate, new Date()),
        or(eq(tasks.status, "pending"), eq(tasks.status, "in_progress")),
        ...(userId ? [eq(tasks.assignedTo, userId)] : [])
      ));

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [dueToday] = await db.select({ count: count() }).from(tasks)
      .where(and(
        gte(tasks.dueDate, today),
        lte(tasks.dueDate, tomorrow),
        or(eq(tasks.status, "pending"), eq(tasks.status, "in_progress")),
        ...(userId ? [eq(tasks.assignedTo, userId)] : [])
      ));

    return c.json({
      byStatus: stats.reduce((acc, s) => ({ ...acc, [s.status || "unknown"]: s.count }), {}),
      overdue: overdue?.count || 0,
      dueToday: dueToday?.count || 0,
    });
  } catch (error) {
    console.error("Tasks stats error:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

/**
 * مهامي (للمستخدم الحالي)
 */
app.get("/my-tasks", async (c) => {
  try {
    const userId = c.req.query("userId");
    if (!userId) return c.json({ error: "userId مطلوب" }, 400);

    const myTasks = await db.select().from(tasks)
      .where(and(
        eq(tasks.assignedTo, userId),
        or(eq(tasks.status, "pending"), eq(tasks.status, "in_progress"))
      ))
      .orderBy(asc(tasks.dueDate), desc(tasks.priority));

    return c.json(myTasks);
  } catch (error) {
    console.error("My tasks error:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

/**
 * تفاصيل مهمة
 */
app.get("/:id", async (c) => {
  try {
    const { id } = c.req.param();
    
    const [task] = await db.select({
      task: tasks,
      assignee: { id: users.id, fullName: users.fullName },
    }).from(tasks)
      .leftJoin(users, eq(tasks.assignedTo, users.id))
      .where(eq(tasks.id, id));

    if (!task) return c.json({ error: "المهمة غير موجودة" }, 404);

    const [checklist, comments, activities, timeEntries] = await Promise.all([
      db.select().from(taskChecklists).where(eq(taskChecklists.taskId, id)).orderBy(taskChecklists.sortOrder),
      db.select().from(taskComments).where(eq(taskComments.taskId, id)).orderBy(desc(taskComments.createdAt)),
      db.select().from(taskActivities).where(eq(taskActivities.taskId, id)).orderBy(desc(taskActivities.createdAt)).limit(30),
      db.select().from(taskTimeEntries).where(eq(taskTimeEntries.taskId, id)).orderBy(desc(taskTimeEntries.startTime)),
    ]);

    const totalTime = timeEntries.reduce((sum, e) => sum + (e.durationMinutes || 0), 0);

    return c.json({
      ...task.task,
      assignee: task.assignee,
      checklist,
      comments,
      activities,
      timeEntries,
      totalTimeSpent: totalTime,
    });
  } catch (error) {
    console.error("Get task error:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

/**
 * إنشاء مهمة
 */
app.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const id = `task_${nanoid(12)}`;
    const taskNumber = await generateTaskNumber();

    await db.insert(tasks).values({
      id,
      taskNumber,
      title: body.title,
      description: body.description || null,
      taskType: body.taskType || "general",
      category: body.category || null,
      tags: body.tags || null,
      priority: body.priority || "medium",
      status: "pending",
      assignedTo: body.assignedTo || null,
      assignedBy: body.assignedBy || null,
      departmentId: body.departmentId || null,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      startDate: body.startDate ? new Date(body.startDate) : null,
      estimatedMinutes: body.estimatedMinutes || null,
      relatedType: body.relatedType || null,
      relatedId: body.relatedId || null,
      relatedTitle: body.relatedTitle || null,
      isRecurring: body.isRecurring || false,
      recurringPattern: body.recurringPattern || null,
      notes: body.notes || null,
      createdBy: body.createdBy || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // إضافة قائمة المراجعة
    if (body.checklist?.length > 0) {
      const checklistItems = body.checklist.map((item: string, idx: number) => ({
        id: `tcl_${nanoid(12)}`,
        taskId: id,
        title: item,
        isCompleted: false,
        sortOrder: idx,
        createdAt: new Date(),
      }));
      await db.insert(taskChecklists).values(checklistItems);
    }

    // تسجيل النشاط
    await db.insert(taskActivities).values({
      id: `ta_${nanoid(12)}`,
      taskId: id,
      activityType: "created",
      description: `تم إنشاء المهمة ${taskNumber}`,
      performedBy: body.createdBy || null,
      createdAt: new Date(),
    });

    // إضافة تذكير
    if (body.reminderAt) {
      await db.insert(taskReminders).values({
        id: `tr_${nanoid(12)}`,
        taskId: id,
        userId: body.assignedTo || body.createdBy,
        reminderAt: new Date(body.reminderAt),
        message: `تذكير: ${body.title}`,
        isSent: false,
        createdAt: new Date(),
      });
    }

    return c.json({ id, taskNumber }, 201);
  } catch (error) {
    console.error("Create task error:", error);
    return c.json({ error: "فشل في إنشاء المهمة" }, 500);
  }
});

/**
 * تحديث مهمة
 */
app.patch("/:id", async (c) => {
  try {
    const { id } = c.req.param();
    const body = await c.req.json();

    const [existing] = await db.select().from(tasks).where(eq(tasks.id, id));
    if (!existing) return c.json({ error: "المهمة غير موجودة" }, 404);

    const updates: any = { updatedAt: new Date() };
    const fields = ["title", "description", "taskType", "category", "priority", "notes", "estimatedMinutes", "progressPercentage"];
    fields.forEach(f => { if (body[f] !== undefined) updates[f] = body[f]; });
    if (body.dueDate) updates.dueDate = new Date(body.dueDate);
    if (body.assignedTo !== undefined) updates.assignedTo = body.assignedTo;

    await db.update(tasks).set(updates).where(eq(tasks.id, id));

    // تسجيل تغيير التعيين
    if (body.assignedTo && body.assignedTo !== existing.assignedTo) {
      await db.insert(taskActivities).values({
        id: `ta_${nanoid(12)}`,
        taskId: id,
        activityType: "assigned",
        description: "تم تغيير المسؤول",
        oldValue: existing.assignedTo,
        newValue: body.assignedTo,
        performedBy: body.performedBy || null,
        createdAt: new Date(),
      });
    }

    return c.json({ success: true });
  } catch (error) {
    console.error("Update task error:", error);
    return c.json({ error: "فشل في تحديث المهمة" }, 500);
  }
});

/**
 * تغيير حالة المهمة
 */
app.post("/:id/status", async (c) => {
  try {
    const { id } = c.req.param();
    const { status, performedBy } = await c.req.json();

    const [existing] = await db.select().from(tasks).where(eq(tasks.id, id));
    if (!existing) return c.json({ error: "المهمة غير موجودة" }, 404);

    const updates: any = { status, updatedAt: new Date() };
    if (status === "completed") {
      updates.completedAt = new Date();
      updates.progressPercentage = 100;
    }
    if (status === "in_progress" && existing.status === "pending") {
      updates.startDate = new Date();
    }

    await db.update(tasks).set(updates).where(eq(tasks.id, id));

    await db.insert(taskActivities).values({
      id: `ta_${nanoid(12)}`,
      taskId: id,
      activityType: "status_changed",
      description: `تم تغيير الحالة`,
      oldValue: existing.status,
      newValue: status,
      performedBy,
      createdAt: new Date(),
    });

    return c.json({ success: true });
  } catch (error) {
    console.error("Change task status error:", error);
    return c.json({ error: "فشل في تحديث المهمة" }, 500);
  }
});

// ========== قائمة المراجعة ==========

app.post("/:taskId/checklist", async (c) => {
  try {
    const { taskId } = c.req.param();
    const { title } = await c.req.json();
    const id = `tcl_${nanoid(12)}`;

    const [maxOrder] = await db.select({ max: sql<number>`MAX(${taskChecklists.sortOrder})` })
      .from(taskChecklists).where(eq(taskChecklists.taskId, taskId));

    await db.insert(taskChecklists).values({
      id, taskId, title, isCompleted: false,
      sortOrder: (maxOrder?.max || 0) + 1,
      createdAt: new Date(),
    });

    return c.json({ id }, 201);
  } catch (error) {
    console.error("Add checklist item error:", error);
    return c.json({ error: "فشل في إنشاء المهمة" }, 500);
  }
});

app.patch("/checklist/:checklistId", async (c) => {
  try {
    const { checklistId } = c.req.param();
    const { isCompleted, completedBy } = await c.req.json();

    await db.update(taskChecklists).set({
      isCompleted,
      completedAt: isCompleted ? new Date() : null,
      completedBy: isCompleted ? completedBy : null,
    }).where(eq(taskChecklists.id, checklistId));

    return c.json({ success: true });
  } catch (error) {
    console.error("Update checklist item error:", error);
    return c.json({ error: "فشل في تحديث المهمة" }, 500);
  }
});

// ========== التعليقات ==========

app.post("/:taskId/comments", async (c) => {
  try {
    const { taskId } = c.req.param();
    const body = await c.req.json();
    const id = `tc_${nanoid(12)}`;

    await db.insert(taskComments).values({
      id, taskId,
      userId: body.userId || null,
      userName: body.userName || null,
      content: body.content,
      isInternal: body.isInternal || false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await db.insert(taskActivities).values({
      id: `ta_${nanoid(12)}`,
      taskId,
      activityType: "comment_added",
      description: "تم إضافة تعليق",
      performedBy: body.userId,
      createdAt: new Date(),
    });

    return c.json({ id }, 201);
  } catch (error) {
    console.error("Add comment error:", error);
    return c.json({ error: "فشل في إنشاء المهمة" }, 500);
  }
});

// ========== تتبع الوقت ==========

app.post("/:taskId/time/start", async (c) => {
  try {
    const { taskId } = c.req.param();
    const { userId } = await c.req.json();
    const id = `tte_${nanoid(12)}`;

    await db.insert(taskTimeEntries).values({
      id, taskId, userId,
      startTime: new Date(),
      createdAt: new Date(),
    });

    return c.json({ id }, 201);
  } catch (error) {
    console.error("Start time tracking error:", error);
    return c.json({ error: "فشل في إنشاء المهمة" }, 500);
  }
});

app.post("/time/:entryId/stop", async (c) => {
  try {
    const { entryId } = c.req.param();
    const { description } = await c.req.json();

    const [entry] = await db.select().from(taskTimeEntries).where(eq(taskTimeEntries.id, entryId));
    if (!entry) return c.json({ error: "السجل غير موجود" }, 404);

    const endTime = new Date();
    const durationMinutes = Math.round((endTime.getTime() - new Date(entry.startTime).getTime()) / 60000);

    await db.update(taskTimeEntries).set({
      endTime,
      durationMinutes,
      description,
    }).where(eq(taskTimeEntries.id, entryId));

    // تحديث الوقت الفعلي للمهمة
    const [totalTime] = await db.select({ sum: sql<number>`SUM(${taskTimeEntries.durationMinutes})` })
      .from(taskTimeEntries).where(eq(taskTimeEntries.taskId, entry.taskId));

    await db.update(tasks).set({
      actualMinutes: totalTime?.sum || 0,
      updatedAt: new Date(),
    }).where(eq(tasks.id, entry.taskId));

    return c.json({ durationMinutes });
  } catch (error) {
    console.error("Stop time tracking error:", error);
    return c.json({ error: "فشل في تحديث المهمة" }, 500);
  }
});

// ========== القوالب ==========

app.get("/templates/list", async (c) => {
  try {
    const templates = await db.select().from(taskTemplates)
      .where(eq(taskTemplates.isActive, true))
      .orderBy(desc(taskTemplates.usageCount));
    return c.json(templates);
  } catch (error) {
    console.error("Get templates error:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.post("/templates", async (c) => {
  try {
    const body = await c.req.json();
    const id = `tt_${nanoid(12)}`;

    await db.insert(taskTemplates).values({
      id,
      name: body.name,
      description: body.description || null,
      defaultTitle: body.defaultTitle || null,
      defaultDescription: body.defaultDescription || null,
      defaultTaskType: body.defaultTaskType || null,
      defaultPriority: body.defaultPriority || null,
      defaultEstimatedMinutes: body.defaultEstimatedMinutes || null,
      defaultChecklist: body.defaultChecklist || null,
      defaultAssignTo: body.defaultAssignTo || null,
      defaultDepartmentId: body.defaultDepartmentId || null,
      isActive: true,
      createdBy: body.createdBy || null,
      createdAt: new Date(),
    });

    return c.json({ id }, 201);
  } catch (error) {
    console.error("Create template error:", error);
    return c.json({ error: "فشل في إنشاء المهمة" }, 500);
  }
});

export default app;

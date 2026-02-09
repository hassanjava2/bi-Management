import { Hono } from "hono";
import { db, workflowTemplates, workflowInstances, workflowApprovals, users } from "@bi-management/database";
import { eq, desc, like, sql, and, or } from "drizzle-orm";
import { authMiddleware } from "../lib/auth.js";

const app = new Hono();

// ==================== TEMPLATES ====================

// GET /workflows/templates - List all workflow templates
app.get("/templates", async (c) => {
  const { search, entityType, active } = c.req.query();

  let query = db.select().from(workflowTemplates);

  const conditions = [];
  if (search) {
    conditions.push(or(like(workflowTemplates.name, `%${search}%`), like(workflowTemplates.nameAr, `%${search}%`)));
  }
  if (entityType) conditions.push(eq(workflowTemplates.entityType, entityType));
  if (active !== undefined) conditions.push(eq(workflowTemplates.isActive, parseInt(active)));

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as typeof query;
  }

  const items = await query.orderBy(desc(workflowTemplates.createdAt));
  return c.json({ items, total: items.length });
});

// GET /workflows/templates/:id - Get template by ID
app.get("/templates/:id", async (c) => {
  const { id } = c.req.param();
  const [template] = await db.select().from(workflowTemplates).where(eq(workflowTemplates.id, id));

  if (!template) return c.json({ error: "Template not found" }, 404);
  return c.json(template);
});

// POST /workflows/templates - Create new template
app.post("/templates", async (c) => {
  const body = await c.req.json();
  const id = crypto.randomUUID();
  const code = `WFT-${Date.now().toString(36).toUpperCase()}`;

  await db.insert(workflowTemplates).values({
    id,
    code,
    name: body.name,
    nameAr: body.nameAr,
    description: body.description,
    entityType: body.entityType,
    steps: body.steps || [],
    isActive: 1,
    createdBy: body.createdBy,
  });

  return c.json({ id, code }, 201);
});

// PUT /workflows/templates/:id - Update template
app.put("/templates/:id", async (c) => {
  const { id } = c.req.param();
  const body = await c.req.json();

  await db
    .update(workflowTemplates)
    .set({
      name: body.name,
      nameAr: body.nameAr,
      description: body.description,
      steps: body.steps,
      isActive: body.isActive,
      updatedAt: new Date(),
    })
    .where(eq(workflowTemplates.id, id));

  return c.json({ success: true });
});

// DELETE /workflows/templates/:id - Delete template
app.delete("/templates/:id", async (c) => {
  const { id } = c.req.param();
  await db.delete(workflowTemplates).where(eq(workflowTemplates.id, id));
  return c.json({ success: true });
});

// ==================== INSTANCES ====================

// GET /workflows/instances - List workflow instances
app.get("/instances", async (c) => {
  const { status, entityType, requestedBy, limit = "50", offset = "0" } = c.req.query();

  let query = db
    .select({
      instance: workflowInstances,
      template: workflowTemplates,
      requester: users,
    })
    .from(workflowInstances)
    .leftJoin(workflowTemplates, eq(workflowInstances.templateId, workflowTemplates.id))
    .leftJoin(users, eq(workflowInstances.requestedBy, users.id));

  const conditions = [];
  if (status) conditions.push(eq(workflowInstances.status, status));
  if (entityType) conditions.push(eq(workflowInstances.entityType, entityType));
  if (requestedBy) conditions.push(eq(workflowInstances.requestedBy, requestedBy));

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as typeof query;
  }

  const items = await query.orderBy(desc(workflowInstances.createdAt)).limit(parseInt(limit)).offset(parseInt(offset));

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(workflowInstances)
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  return c.json({
    items: items.map((row) => ({
      ...row.instance,
      template: row.template,
      requester: row.requester ? { id: row.requester.id, name: row.requester.name } : null,
    })),
    total: Number(count),
  });
});

// GET /workflows/instances/stats - Get workflow stats
app.get("/instances/stats", async (c) => {
  const [stats] = await db
    .select({
      total: sql<number>`count(*)`,
      pending: sql<number>`count(*) filter (where ${workflowInstances.status} = 'pending')`,
      approved: sql<number>`count(*) filter (where ${workflowInstances.status} = 'approved')`,
      rejected: sql<number>`count(*) filter (where ${workflowInstances.status} = 'rejected')`,
    })
    .from(workflowInstances);

  return c.json(stats);
});

// GET /workflows/instances/:id - Get instance by ID
app.get("/instances/:id", async (c) => {
  try {
    const { id } = c.req.param();

    const [instance] = await db
      .select({
        instance: workflowInstances,
        template: workflowTemplates,
        requester: users,
      })
      .from(workflowInstances)
      .leftJoin(workflowTemplates, eq(workflowInstances.templateId, workflowTemplates.id))
      .leftJoin(users, eq(workflowInstances.requestedBy, users.id))
      .where(eq(workflowInstances.id, id));

    if (!instance) return c.json({ error: "Instance not found" }, 404);

    // Get approvals
    const approvals = await db
      .select({
        approval: workflowApprovals,
        assignee: users,
      })
      .from(workflowApprovals)
      .leftJoin(users, eq(workflowApprovals.assignedTo, users.id))
      .where(eq(workflowApprovals.instanceId, id))
      .orderBy(workflowApprovals.stepIndex);

    return c.json({
      ...instance.instance,
      template: instance.template,
      requester: instance.requester ? { id: instance.requester.id, name: instance.requester.name } : null,
      approvals: approvals.map((a) => ({
        ...a.approval,
        assignee: a.assignee ? { id: a.assignee.id, name: a.assignee.name } : null,
      })),
    });
  } catch (error) {
    console.error(error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

// POST /workflows/instances - Create new workflow instance (start workflow)
app.post("/instances", async (c) => {
  try {
    const body = await c.req.json();
    const id = crypto.randomUUID();
    const code = `WF-${Date.now().toString(36).toUpperCase()}`;

    // Get template
    const [template] = await db.select().from(workflowTemplates).where(eq(workflowTemplates.id, body.templateId));

    await db.insert(workflowInstances).values({
      id,
      code,
      templateId: body.templateId,
      entityType: body.entityType || template?.entityType || "general",
      entityId: body.entityId,
      currentStep: 0,
      status: "pending",
      priority: body.priority || "normal",
      requestedBy: body.requestedBy,
      requestedAt: new Date(),
      metadata: body.metadata,
      notes: body.notes,
    });

    // Create first approval step
    const steps = (template?.steps as any[]) || [];
    if (steps.length > 0) {
      const firstStep = steps[0];
      await db.insert(workflowApprovals).values({
        id: crypto.randomUUID(),
        instanceId: id,
        stepIndex: 0,
        stepName: firstStep.name,
        assignedTo: firstStep.assigneeId,
        assignedRole: firstStep.assigneeType === "role" ? firstStep.assigneeId : null,
        status: "pending",
      });
    }

    return c.json({ id, code }, 201);
  } catch (error) {
    console.error(error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

// POST /workflows/instances/:id/approve - Approve current step
app.post("/instances/:id/approve", async (c) => {
  try {
    const { id } = c.req.param();
    const body = await c.req.json();

    // Get instance
    const [instance] = await db.select().from(workflowInstances).where(eq(workflowInstances.id, id));
    if (!instance) return c.json({ error: "Instance not found" }, 404);

    const [template] = await db.select().from(workflowTemplates).where(eq(workflowTemplates.id, instance.templateId || ""));
    const steps = (template?.steps as any[]) || [];
    const currentStep = instance.currentStep || 0;

    // Update current approval
    await db
      .update(workflowApprovals)
      .set({
        status: "approved",
        actionBy: body.userId,
        actionAt: new Date(),
        comments: body.comments,
      })
      .where(and(eq(workflowApprovals.instanceId, id), eq(workflowApprovals.stepIndex, currentStep)));

    // Check if more steps
    if (currentStep + 1 < steps.length) {
      // Move to next step
      const nextStep = steps[currentStep + 1];
      await db.insert(workflowApprovals).values({
        id: crypto.randomUUID(),
        instanceId: id,
        stepIndex: currentStep + 1,
        stepName: nextStep.name,
        assignedTo: nextStep.assigneeId,
        assignedRole: nextStep.assigneeType === "role" ? nextStep.assigneeId : null,
        status: "pending",
      });

      await db.update(workflowInstances).set({ currentStep: currentStep + 1, updatedAt: new Date() }).where(eq(workflowInstances.id, id));
    } else {
      // Workflow complete
      await db
        .update(workflowInstances)
        .set({
          status: "approved",
          completedAt: new Date(),
          completedBy: body.userId,
          updatedAt: new Date(),
        })
        .where(eq(workflowInstances.id, id));
    }

    return c.json({ success: true });
  } catch (error) {
    console.error(error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

// POST /workflows/instances/:id/reject - Reject workflow
app.post("/instances/:id/reject", async (c) => {
  try {
    const { id } = c.req.param();
    const body = await c.req.json();

    const [instance] = await db.select().from(workflowInstances).where(eq(workflowInstances.id, id));
    if (!instance) return c.json({ error: "Instance not found" }, 404);

    // Update current approval
    await db
      .update(workflowApprovals)
      .set({
        status: "rejected",
        actionBy: body.userId,
        actionAt: new Date(),
        comments: body.comments,
      })
      .where(and(eq(workflowApprovals.instanceId, id), eq(workflowApprovals.stepIndex, instance.currentStep || 0)));

    // Reject instance
    await db
      .update(workflowInstances)
      .set({
        status: "rejected",
        completedAt: new Date(),
        completedBy: body.userId,
        updatedAt: new Date(),
      })
      .where(eq(workflowInstances.id, id));

    return c.json({ success: true });
  } catch (error) {
    console.error(error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

// GET /workflows/pending - Get pending approvals for user
app.get("/pending", async (c) => {
  try {
    const { userId } = c.req.query();

    if (!userId) return c.json({ error: "userId required" }, 400);

    const items = await db
      .select({
        approval: workflowApprovals,
        instance: workflowInstances,
        template: workflowTemplates,
      })
      .from(workflowApprovals)
      .leftJoin(workflowInstances, eq(workflowApprovals.instanceId, workflowInstances.id))
      .leftJoin(workflowTemplates, eq(workflowInstances.templateId, workflowTemplates.id))
      .where(and(eq(workflowApprovals.assignedTo, userId), eq(workflowApprovals.status, "pending")))
      .orderBy(desc(workflowApprovals.createdAt));

    return c.json({
      items: items.map((row) => ({
        ...row.approval,
        instance: row.instance,
        template: row.template,
      })),
      total: items.length,
    });
  } catch (error) {
    console.error(error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

export default app;

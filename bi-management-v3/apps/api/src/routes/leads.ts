import { Hono } from "hono";
import { db, leads, leadActivities, customers, users } from "@bi-management/database";
import { eq, desc, like, or, sql, and } from "drizzle-orm";
import { authMiddleware } from "../lib/auth.js";

const app = new Hono();

// GET /leads - List all leads
app.get("/", async (c) => {
  try {
    const { page = "1", limit = "50", search, status, source, assignedTo } = c.req.query();
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const conditions: any[] = [];

    if (search) {
      conditions.push(
        or(
          like(leads.name, `%${search}%`),
          like(leads.company, `%${search}%`),
          like(leads.email, `%${search}%`),
          like(leads.phone, `%${search}%`)
        )
      );
    }

    if (status) {
      conditions.push(eq(leads.status, status));
    }

    if (source) {
      conditions.push(eq(leads.source, source));
    }

    if (assignedTo) {
      conditions.push(eq(leads.assignedTo, assignedTo));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [items, countResult] = await Promise.all([
      whereClause
        ? db.select().from(leads).where(whereClause).orderBy(desc(leads.createdAt)).limit(parseInt(limit)).offset(offset)
        : db.select().from(leads).orderBy(desc(leads.createdAt)).limit(parseInt(limit)).offset(offset),
      whereClause
        ? db.select({ count: sql<number>`count(*)` }).from(leads).where(whereClause)
        : db.select({ count: sql<number>`count(*)` }).from(leads),
    ]);

    // Get assigned user info
    const leadsWithUser = await Promise.all(
      items.map(async (lead) => {
        let assignedUser = null;
        if (lead.assignedTo) {
          const [user] = await db.select({ id: users.id, fullName: users.fullName }).from(users).where(eq(users.id, lead.assignedTo));
          assignedUser = user;
        }
        return { ...lead, assignedUser };
      })
    );

    return c.json({
      items: leadsWithUser,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: Number(countResult[0]?.count || 0),
      },
    });
  } catch (error) {
    console.error("Error fetching leads:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

// GET /leads/stats - Get lead statistics
app.get("/stats", async (c) => {
  try {
    const [totalLeads, newLeads, qualifiedLeads, convertedLeads, lostLeads] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(leads),
      db.select({ count: sql<number>`count(*)` }).from(leads).where(eq(leads.status, 'new')),
      db.select({ count: sql<number>`count(*)` }).from(leads).where(eq(leads.status, 'qualified')),
      db.select({ count: sql<number>`count(*)` }).from(leads).where(eq(leads.status, 'converted')),
      db.select({ count: sql<number>`count(*)` }).from(leads).where(eq(leads.status, 'lost')),
    ]);

    return c.json({
      total: Number(totalLeads[0]?.count || 0),
      new: Number(newLeads[0]?.count || 0),
      qualified: Number(qualifiedLeads[0]?.count || 0),
      converted: Number(convertedLeads[0]?.count || 0),
      lost: Number(lostLeads[0]?.count || 0),
    });
  } catch (error) {
    console.error("Error fetching lead stats:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

// GET /leads/:id - Get single lead
app.get("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const [lead] = await db.select().from(leads).where(eq(leads.id, id));

    if (!lead) {
      return c.json({ error: "فشل في جلب البيانات" }, 404);
    }

    // Get activities
    const activities = await db.select().from(leadActivities).where(eq(leadActivities.leadId, id)).orderBy(desc(leadActivities.createdAt)).limit(20);

    let assignedUser = null;
    if (lead.assignedTo) {
      const [user] = await db.select().from(users).where(eq(users.id, lead.assignedTo));
      assignedUser = user;
    }

    let convertedCustomer = null;
    if (lead.convertedCustomerId) {
      const [customer] = await db.select().from(customers).where(eq(customers.id, lead.convertedCustomerId));
      convertedCustomer = customer;
    }

    return c.json({ ...lead, assignedUser, convertedCustomer, activities });
  } catch (error) {
    console.error("Error fetching lead:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

// POST /leads - Create lead
app.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const id = crypto.randomUUID();

    // Generate code
    const [lastLead] = await db.select({ code: leads.code }).from(leads).orderBy(desc(leads.createdAt)).limit(1);
    const lastNum = lastLead?.code ? parseInt(lastLead.code.replace("LEAD-", "")) || 0 : 0;
    const code = `LEAD-${String(lastNum + 1).padStart(5, "0")}`;

    await db.insert(leads).values({
      id,
      code,
      name: body.name,
      company: body.company,
      email: body.email,
      phone: body.phone,
      source: body.source,
      status: body.status || 'new',
      priority: body.priority || 'medium',
      estimatedValue: body.estimatedValue,
      notes: body.notes,
      assignedTo: body.assignedTo,
      nextFollowUp: body.nextFollowUp ? new Date(body.nextFollowUp) : null,
      createdBy: body.createdBy,
    });

    const [created] = await db.select().from(leads).where(eq(leads.id, id));
    return c.json(created, 201);
  } catch (error) {
    console.error("Error creating lead:", error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

// PUT /leads/:id - Update lead
app.put("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();

    await db.update(leads).set({
      name: body.name,
      company: body.company,
      email: body.email,
      phone: body.phone,
      source: body.source,
      status: body.status,
      priority: body.priority,
      estimatedValue: body.estimatedValue,
      notes: body.notes,
      assignedTo: body.assignedTo,
      nextFollowUp: body.nextFollowUp ? new Date(body.nextFollowUp) : null,
      lastContactDate: body.lastContactDate ? new Date(body.lastContactDate) : null,
      updatedAt: new Date(),
    }).where(eq(leads.id, id));

    const [updated] = await db.select().from(leads).where(eq(leads.id, id));
    return c.json(updated);
  } catch (error) {
    console.error("Error updating lead:", error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

// POST /leads/:id/convert - Convert lead to customer
app.post("/:id/convert", async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();

    const [lead] = await db.select().from(leads).where(eq(leads.id, id));
    if (!lead) {
      return c.json({ error: "فشل في جلب البيانات" }, 404);
    }

    // Create customer
    const customerId = crypto.randomUUID();
    const [lastCustomer] = await db.select({ code: customers.code }).from(customers).orderBy(desc(customers.createdAt)).limit(1);
    const lastNum = lastCustomer?.code ? parseInt(lastCustomer.code.replace("CUST-", "")) || 0 : 0;
    const customerCode = `CUST-${String(lastNum + 1).padStart(5, "0")}`;

    await db.insert(customers).values({
      id: customerId,
      code: customerCode,
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      notes: lead.notes,
    });

    // Update lead
    await db.update(leads).set({
      status: 'converted',
      convertedCustomerId: customerId,
      convertedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(leads.id, id));

    const [updated] = await db.select().from(leads).where(eq(leads.id, id));
    const [customer] = await db.select().from(customers).where(eq(customers.id, customerId));

    return c.json({ lead: updated, customer });
  } catch (error) {
    console.error("Error converting lead:", error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

// POST /leads/:id/activities - Add activity
app.post("/:id/activities", async (c) => {
  try {
    const leadId = c.req.param("id");
    const body = await c.req.json();
    const id = crypto.randomUUID();

    await db.insert(leadActivities).values({
      id,
      leadId,
      type: body.type,
      subject: body.subject,
      description: body.description,
      outcome: body.outcome,
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
      completedAt: body.completedAt ? new Date(body.completedAt) : null,
      createdBy: body.createdBy,
    });

    // Update last contact date
    await db.update(leads).set({
      lastContactDate: new Date(),
      updatedAt: new Date(),
    }).where(eq(leads.id, leadId));

    const [created] = await db.select().from(leadActivities).where(eq(leadActivities.id, id));
    return c.json(created, 201);
  } catch (error) {
    console.error("Error creating activity:", error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

// DELETE /leads/:id - Delete lead
app.delete("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    await db.delete(leadActivities).where(eq(leadActivities.leadId, id));
    await db.delete(leads).where(eq(leads.id, id));
    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting lead:", error);
    return c.json({ error: "فشل في حذف السجل" }, 500);
  }
});

export default app;

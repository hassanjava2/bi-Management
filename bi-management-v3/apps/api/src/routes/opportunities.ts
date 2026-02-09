import { Hono } from "hono";
import { db, opportunities, opportunityActivities, customers, leads, users } from "@bi-management/database";
import { eq, desc, like, sql, and, sum } from "drizzle-orm";
import { authMiddleware } from "../lib/auth.js";

const app = new Hono();

// GET /opportunities - List all opportunities
app.get("/", async (c) => {
  try {
    const { page = "1", limit = "50", search, stage, assignedTo, customerId } = c.req.query();
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const conditions: any[] = [];

    if (search) {
      conditions.push(like(opportunities.title, `%${search}%`));
    }

    if (stage) {
      conditions.push(eq(opportunities.stage, stage));
    }

    if (assignedTo) {
      conditions.push(eq(opportunities.assignedTo, assignedTo));
    }

    if (customerId) {
      conditions.push(eq(opportunities.customerId, customerId));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [items, countResult] = await Promise.all([
      whereClause
        ? db.select().from(opportunities).where(whereClause).orderBy(desc(opportunities.createdAt)).limit(parseInt(limit)).offset(offset)
        : db.select().from(opportunities).orderBy(desc(opportunities.createdAt)).limit(parseInt(limit)).offset(offset),
      whereClause
        ? db.select({ count: sql<number>`count(*)` }).from(opportunities).where(whereClause)
        : db.select({ count: sql<number>`count(*)` }).from(opportunities),
    ]);

    const oppsWithRelated = await Promise.all(
      items.map(async (opp) => {
        let customer = null;
        let assignedUser = null;

        if (opp.customerId) {
          const [cust] = await db.select({ id: customers.id, name: customers.name }).from(customers).where(eq(customers.id, opp.customerId));
          customer = cust;
        }

        if (opp.assignedTo) {
          const [user] = await db.select({ id: users.id, fullName: users.fullName }).from(users).where(eq(users.id, opp.assignedTo));
          assignedUser = user;
        }

        return { ...opp, customer, assignedUser };
      })
    );

    return c.json({
      items: oppsWithRelated,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: Number(countResult[0]?.count || 0),
      },
    });
  } catch (error) {
    console.error("Error fetching opportunities:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

// GET /opportunities/stats
app.get("/stats", async (c) => {
  try {
    const [totalOpps, prospecting, proposal, negotiation, closedWon, closedLost, totalValue, wonValue] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(opportunities),
      db.select({ count: sql<number>`count(*)` }).from(opportunities).where(eq(opportunities.stage, 'prospecting')),
      db.select({ count: sql<number>`count(*)` }).from(opportunities).where(eq(opportunities.stage, 'proposal')),
      db.select({ count: sql<number>`count(*)` }).from(opportunities).where(eq(opportunities.stage, 'negotiation')),
      db.select({ count: sql<number>`count(*)` }).from(opportunities).where(eq(opportunities.stage, 'closed_won')),
      db.select({ count: sql<number>`count(*)` }).from(opportunities).where(eq(opportunities.stage, 'closed_lost')),
      db.select({ total: sum(opportunities.expectedValue) }).from(opportunities),
      db.select({ total: sum(opportunities.actualValue) }).from(opportunities).where(eq(opportunities.stage, 'closed_won')),
    ]);

    return c.json({
      total: Number(totalOpps[0]?.count || 0),
      byStage: {
        prospecting: Number(prospecting[0]?.count || 0),
        proposal: Number(proposal[0]?.count || 0),
        negotiation: Number(negotiation[0]?.count || 0),
        closedWon: Number(closedWon[0]?.count || 0),
        closedLost: Number(closedLost[0]?.count || 0),
      },
      totalValue: Number(totalValue[0]?.total || 0),
      wonValue: Number(wonValue[0]?.total || 0),
    });
  } catch (error) {
    console.error("Error fetching opportunity stats:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

// GET /opportunities/:id
app.get("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const [opp] = await db.select().from(opportunities).where(eq(opportunities.id, id));

    if (!opp) {
      return c.json({ error: "Opportunity not found" }, 404);
    }

    const activities = await db.select().from(opportunityActivities).where(eq(opportunityActivities.opportunityId, id)).orderBy(desc(opportunityActivities.createdAt)).limit(20);

    let customer = null;
    let assignedUser = null;

    if (opp.customerId) {
      const [cust] = await db.select().from(customers).where(eq(customers.id, opp.customerId));
      customer = cust;
    }

    if (opp.assignedTo) {
      const [user] = await db.select().from(users).where(eq(users.id, opp.assignedTo));
      assignedUser = user;
    }

    return c.json({ ...opp, customer, assignedUser, activities });
  } catch (error) {
    console.error("Error fetching opportunity:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

// POST /opportunities
app.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const id = crypto.randomUUID();

    const [lastOpp] = await db.select({ code: opportunities.code }).from(opportunities).orderBy(desc(opportunities.createdAt)).limit(1);
    const lastNum = lastOpp?.code ? parseInt(lastOpp.code.replace("OPP-", "")) || 0 : 0;
    const code = `OPP-${String(lastNum + 1).padStart(5, "0")}`;

    await db.insert(opportunities).values({
      id,
      code,
      title: body.title,
      customerId: body.customerId || null,
      leadId: body.leadId || null,
      stage: body.stage || 'prospecting',
      probability: body.probability || 10,
      expectedValue: body.expectedValue,
      expectedCloseDate: body.expectedCloseDate,
      source: body.source,
      description: body.description,
      assignedTo: body.assignedTo,
      createdBy: body.createdBy,
    });

    const [created] = await db.select().from(opportunities).where(eq(opportunities.id, id));
    return c.json(created, 201);
  } catch (error) {
    console.error("Error creating opportunity:", error);
    return c.json({ error: "فشل في إنشاء الفرصة" }, 500);
  }
});

// PUT /opportunities/:id
app.put("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();

    await db.update(opportunities).set({
      title: body.title,
      customerId: body.customerId || null,
      stage: body.stage,
      probability: body.probability,
      expectedValue: body.expectedValue,
      actualValue: body.actualValue,
      expectedCloseDate: body.expectedCloseDate,
      actualCloseDate: body.actualCloseDate,
      source: body.source,
      description: body.description,
      lostReason: body.lostReason,
      assignedTo: body.assignedTo,
      updatedAt: new Date(),
    }).where(eq(opportunities.id, id));

    const [updated] = await db.select().from(opportunities).where(eq(opportunities.id, id));
    return c.json(updated);
  } catch (error) {
    console.error("Error updating opportunity:", error);
    return c.json({ error: "فشل في تحديث الفرصة" }, 500);
  }
});

// DELETE /opportunities/:id
app.delete("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    await db.delete(opportunityActivities).where(eq(opportunityActivities.opportunityId, id));
    await db.delete(opportunities).where(eq(opportunities.id, id));
    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting opportunity:", error);
    return c.json({ error: "فشل في حذف الفرصة" }, 500);
  }
});

export default app;

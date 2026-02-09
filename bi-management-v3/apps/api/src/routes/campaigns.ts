import { Hono } from "hono";
import { db, campaigns, campaignMembers, leads, customers, users } from "@bi-management/database";
import { eq, desc, like, sql, and, sum } from "drizzle-orm";
import { authMiddleware } from "../lib/auth.js";

const app = new Hono();

// GET /campaigns - List all campaigns
app.get("/", async (c) => {
  try {
    const { page = "1", limit = "50", search, status, type } = c.req.query();
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const conditions: any[] = [];

    if (search) {
      conditions.push(like(campaigns.name, `%${search}%`));
    }

    if (status) {
      conditions.push(eq(campaigns.status, status));
    }

    if (type) {
      conditions.push(eq(campaigns.type, type));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [items, countResult] = await Promise.all([
      whereClause
        ? db.select().from(campaigns).where(whereClause).orderBy(desc(campaigns.createdAt)).limit(parseInt(limit)).offset(offset)
        : db.select().from(campaigns).orderBy(desc(campaigns.createdAt)).limit(parseInt(limit)).offset(offset),
      whereClause
        ? db.select({ count: sql<number>`count(*)` }).from(campaigns).where(whereClause)
        : db.select({ count: sql<number>`count(*)` }).from(campaigns),
    ]);

    // Get member counts
    const campaignsWithCounts = await Promise.all(
      items.map(async (campaign) => {
        const [memberCount] = await db.select({ count: sql<number>`count(*)` }).from(campaignMembers).where(eq(campaignMembers.campaignId, campaign.id));
        return { ...campaign, memberCount: Number(memberCount?.count || 0) };
      })
    );

    return c.json({
      items: campaignsWithCounts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: Number(countResult[0]?.count || 0),
      },
    });
  } catch (error) {
    console.error("Error fetching campaigns:", error);
    return c.json({ error: "Failed to fetch campaigns" }, 500);
  }
});

// GET /campaigns/stats - Get campaign statistics
app.get("/stats", async (c) => {
  try {
    const [
      totalCampaigns,
      activeCampaigns,
      totalBudget,
      totalRevenue,
      totalLeads,
      totalConversions,
    ] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(campaigns),
      db.select({ count: sql<number>`count(*)` }).from(campaigns).where(eq(campaigns.status, 'active')),
      db.select({ total: sum(campaigns.budget) }).from(campaigns),
      db.select({ total: sum(campaigns.revenue) }).from(campaigns),
      db.select({ total: sum(campaigns.leadsGenerated) }).from(campaigns),
      db.select({ total: sum(campaigns.conversions) }).from(campaigns),
    ]);

    return c.json({
      totalCampaigns: Number(totalCampaigns[0]?.count || 0),
      activeCampaigns: Number(activeCampaigns[0]?.count || 0),
      totalBudget: Number(totalBudget[0]?.total || 0),
      totalRevenue: Number(totalRevenue[0]?.total || 0),
      totalLeads: Number(totalLeads[0]?.total || 0),
      totalConversions: Number(totalConversions[0]?.total || 0),
      roi: totalBudget[0]?.total ? ((Number(totalRevenue[0]?.total || 0) - Number(totalBudget[0]?.total || 0)) / Number(totalBudget[0]?.total) * 100).toFixed(1) : 0,
    });
  } catch (error) {
    console.error("Error fetching campaign stats:", error);
    return c.json({ error: "Failed to fetch stats" }, 500);
  }
});

// GET /campaigns/:id - Get single campaign
app.get("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, id));

    if (!campaign) {
      return c.json({ error: "Campaign not found" }, 404);
    }

    // Get members
    const members = await db.select().from(campaignMembers).where(eq(campaignMembers.campaignId, id)).limit(100);

    // Get member details
    const membersWithDetails = await Promise.all(
      members.map(async (member) => {
        let lead = null;
        let customer = null;

        if (member.leadId) {
          const [l] = await db.select({ id: leads.id, name: leads.name, email: leads.email }).from(leads).where(eq(leads.id, member.leadId));
          lead = l;
        }

        if (member.customerId) {
          const [c] = await db.select({ id: customers.id, name: customers.name, email: customers.email }).from(customers).where(eq(customers.id, member.customerId));
          customer = c;
        }

        return { ...member, lead, customer };
      })
    );

    return c.json({ ...campaign, members: membersWithDetails });
  } catch (error) {
    console.error("Error fetching campaign:", error);
    return c.json({ error: "Failed to fetch campaign" }, 500);
  }
});

// POST /campaigns - Create campaign
app.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const id = crypto.randomUUID();

    // Generate code
    const [lastCampaign] = await db.select({ code: campaigns.code }).from(campaigns).orderBy(desc(campaigns.createdAt)).limit(1);
    const lastNum = lastCampaign?.code ? parseInt(lastCampaign.code.replace("CAMP-", "")) || 0 : 0;
    const code = `CAMP-${String(lastNum + 1).padStart(5, "0")}`;

    await db.insert(campaigns).values({
      id,
      code,
      name: body.name,
      type: body.type,
      status: body.status || 'draft',
      budget: body.budget,
      startDate: body.startDate,
      endDate: body.endDate,
      targetAudience: body.targetAudience,
      description: body.description,
      goals: body.goals,
      createdBy: body.createdBy,
    });

    const [created] = await db.select().from(campaigns).where(eq(campaigns.id, id));
    return c.json(created, 201);
  } catch (error) {
    console.error("Error creating campaign:", error);
    return c.json({ error: "Failed to create campaign" }, 500);
  }
});

// PUT /campaigns/:id - Update campaign
app.put("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();

    await db.update(campaigns).set({
      name: body.name,
      type: body.type,
      status: body.status,
      budget: body.budget,
      actualCost: body.actualCost,
      startDate: body.startDate,
      endDate: body.endDate,
      targetAudience: body.targetAudience,
      description: body.description,
      goals: body.goals,
      leadsGenerated: body.leadsGenerated,
      conversions: body.conversions,
      revenue: body.revenue,
      updatedAt: new Date(),
    }).where(eq(campaigns.id, id));

    const [updated] = await db.select().from(campaigns).where(eq(campaigns.id, id));
    return c.json(updated);
  } catch (error) {
    console.error("Error updating campaign:", error);
    return c.json({ error: "Failed to update campaign" }, 500);
  }
});

// POST /campaigns/:id/members - Add members to campaign
app.post("/:id/members", async (c) => {
  try {
    const campaignId = c.req.param("id");
    const body = await c.req.json();

    const members = body.members || [];
    const createdMembers = [];

    for (const member of members) {
      const id = crypto.randomUUID();
      await db.insert(campaignMembers).values({
        id,
        campaignId,
        leadId: member.leadId || null,
        customerId: member.customerId || null,
        status: 'sent',
      });
      createdMembers.push(id);
    }

    return c.json({ success: true, count: createdMembers.length });
  } catch (error) {
    console.error("Error adding members:", error);
    return c.json({ error: "Failed to add members" }, 500);
  }
});

// PUT /campaigns/:id/status - Update campaign status
app.put("/:id/status", async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();

    await db.update(campaigns).set({
      status: body.status,
      updatedAt: new Date(),
    }).where(eq(campaigns.id, id));

    const [updated] = await db.select().from(campaigns).where(eq(campaigns.id, id));
    return c.json(updated);
  } catch (error) {
    console.error("Error updating campaign status:", error);
    return c.json({ error: "Failed to update status" }, 500);
  }
});

// DELETE /campaigns/:id - Delete campaign
app.delete("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    await db.delete(campaignMembers).where(eq(campaignMembers.campaignId, id));
    await db.delete(campaigns).where(eq(campaigns.id, id));
    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting campaign:", error);
    return c.json({ error: "Failed to delete campaign" }, 500);
  }
});

export default app;

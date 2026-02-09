import { Hono } from "hono";
import { db, departments } from "@bi-management/database";
import { eq, desc, like, or, isNull, sql } from "drizzle-orm";
import { authMiddleware } from "../lib/auth.js";

const app = new Hono();

// GET /departments - List all departments
app.get("/", async (c) => {
  try {
    const { page = "1", limit = "50", search, parentId } = c.req.query();
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = db.select().from(departments);
    const conditions: any[] = [];

    if (search) {
      conditions.push(
        or(
          like(departments.name, `%${search}%`),
          like(departments.nameAr, `%${search}%`),
          like(departments.code, `%${search}%`)
        )
      );
    }

    if (parentId === "null") {
      conditions.push(isNull(departments.parentId));
    } else if (parentId) {
      conditions.push(eq(departments.parentId, parentId));
    }

    const whereClause = conditions.length > 0 ? sql`${sql.join(conditions, sql` AND `)}` : undefined;

    const [items, countResult] = await Promise.all([
      whereClause
        ? db.select().from(departments).where(whereClause).orderBy(desc(departments.createdAt)).limit(parseInt(limit)).offset(offset)
        : db.select().from(departments).orderBy(desc(departments.createdAt)).limit(parseInt(limit)).offset(offset),
      db.select({ count: sql<number>`count(*)` }).from(departments),
    ]);

    return c.json({
      items,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: Number(countResult[0]?.count || 0),
      },
    });
  } catch (error) {
    console.error("Error fetching departments:", error);
    return c.json({ error: "Failed to fetch departments" }, 500);
  }
});

// GET /departments/:id - Get single department
app.get("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const [department] = await db
      .select()
      .from(departments)
      .where(eq(departments.id, id));

    if (!department) {
      return c.json({ error: "Department not found" }, 404);
    }

    // Get children count
    const [childrenCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(departments)
      .where(eq(departments.parentId, id));

    return c.json({ 
      ...department, 
      childrenCount: Number(childrenCount?.count || 0) 
    });
  } catch (error) {
    console.error("Error fetching department:", error);
    return c.json({ error: "Failed to fetch department" }, 500);
  }
});

// POST /departments - Create department
app.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const id = crypto.randomUUID();

    await db.insert(departments).values({
      id,
      code: body.code,
      name: body.name,
      nameAr: body.nameAr,
      parentId: body.parentId || null,
      managerId: body.managerId || null,
      isActive: body.isActive ?? 1,
    });

    const [created] = await db
      .select()
      .from(departments)
      .where(eq(departments.id, id));

    return c.json(created, 201);
  } catch (error) {
    console.error("Error creating department:", error);
    return c.json({ error: "Failed to create department" }, 500);
  }
});

// PUT /departments/:id - Update department
app.put("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();

    await db
      .update(departments)
      .set({
        code: body.code,
        name: body.name,
        nameAr: body.nameAr,
        parentId: body.parentId || null,
        managerId: body.managerId || null,
        isActive: body.isActive,
      })
      .where(eq(departments.id, id));

    const [updated] = await db
      .select()
      .from(departments)
      .where(eq(departments.id, id));

    return c.json(updated);
  } catch (error) {
    console.error("Error updating department:", error);
    return c.json({ error: "Failed to update department" }, 500);
  }
});

// DELETE /departments/:id - Delete department
app.delete("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    await db.delete(departments).where(eq(departments.id, id));
    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting department:", error);
    return c.json({ error: "Failed to delete department" }, 500);
  }
});

export default app;

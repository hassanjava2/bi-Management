import { Hono } from "hono";
import { db, positions, departments } from "@bi-management/database";
import { eq, desc, like, or, sql } from "drizzle-orm";
import { authMiddleware } from "../lib/auth.js";

const app = new Hono();

// GET /positions - List all positions
app.get("/", async (c) => {
  try {
    const { page = "1", limit = "50", search, departmentId } = c.req.query();
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const conditions: any[] = [];

    if (search) {
      conditions.push(
        or(
          like(positions.name, `%${search}%`),
          like(positions.nameAr, `%${search}%`),
          like(positions.code, `%${search}%`)
        )
      );
    }

    if (departmentId) {
      conditions.push(eq(positions.departmentId, departmentId));
    }

    const whereClause = conditions.length > 0 ? sql`${sql.join(conditions, sql` AND `)}` : undefined;

    const [items, countResult] = await Promise.all([
      whereClause
        ? db.select().from(positions).where(whereClause).orderBy(desc(positions.createdAt)).limit(parseInt(limit)).offset(offset)
        : db.select().from(positions).orderBy(desc(positions.createdAt)).limit(parseInt(limit)).offset(offset),
      db.select({ count: sql<number>`count(*)` }).from(positions),
    ]);

    // Get department info for each position
    const positionsWithDept = await Promise.all(
      items.map(async (pos) => {
        if (pos.departmentId) {
          const [dept] = await db
            .select({ id: departments.id, name: departments.name })
            .from(departments)
            .where(eq(departments.id, pos.departmentId));
          return { ...pos, department: dept || null };
        }
        return { ...pos, department: null };
      })
    );

    return c.json({
      items: positionsWithDept,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: Number(countResult[0]?.count || 0),
      },
    });
  } catch (error) {
    console.error("Error fetching positions:", error);
    return c.json({ error: "Failed to fetch positions" }, 500);
  }
});

// GET /positions/:id - Get single position
app.get("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const [position] = await db
      .select()
      .from(positions)
      .where(eq(positions.id, id));

    if (!position) {
      return c.json({ error: "Position not found" }, 404);
    }

    let department = null;
    if (position.departmentId) {
      const [dept] = await db
        .select()
        .from(departments)
        .where(eq(departments.id, position.departmentId));
      department = dept || null;
    }

    return c.json({ ...position, department });
  } catch (error) {
    console.error("Error fetching position:", error);
    return c.json({ error: "Failed to fetch position" }, 500);
  }
});

// POST /positions - Create position
app.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const id = crypto.randomUUID();

    await db.insert(positions).values({
      id,
      code: body.code,
      name: body.name,
      nameAr: body.nameAr,
      departmentId: body.departmentId || null,
      level: body.level || 1,
      isActive: body.isActive ?? 1,
    });

    const [created] = await db
      .select()
      .from(positions)
      .where(eq(positions.id, id));

    return c.json(created, 201);
  } catch (error) {
    console.error("Error creating position:", error);
    return c.json({ error: "Failed to create position" }, 500);
  }
});

// PUT /positions/:id - Update position
app.put("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();

    await db
      .update(positions)
      .set({
        code: body.code,
        name: body.name,
        nameAr: body.nameAr,
        departmentId: body.departmentId || null,
        level: body.level,
        isActive: body.isActive,
      })
      .where(eq(positions.id, id));

    const [updated] = await db
      .select()
      .from(positions)
      .where(eq(positions.id, id));

    return c.json(updated);
  } catch (error) {
    console.error("Error updating position:", error);
    return c.json({ error: "Failed to update position" }, 500);
  }
});

// DELETE /positions/:id - Delete position
app.delete("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    await db.delete(positions).where(eq(positions.id, id));
    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting position:", error);
    return c.json({ error: "Failed to delete position" }, 500);
  }
});

export default app;

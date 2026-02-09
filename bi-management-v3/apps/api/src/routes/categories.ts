import { Hono } from "hono";
import { db, categories as categoriesTable } from "@bi-management/database";
import { authMiddleware } from "../lib/auth.js";
import { eq } from "drizzle-orm";

const app = new Hono();

app.get("/", authMiddleware, async (c) => {
  try {
    const page = Math.max(1, Number(c.req.query("page")) || 1);
    const limit = Math.min(100, Math.max(1, Number(c.req.query("limit")) || 20));
    const offset = (page - 1) * limit;

    const rows = await db.query.categories.findMany({
      columns: {
        id: true,
        code: true,
        name: true,
        nameAr: true,
        parentId: true,
        sortOrder: true,
        isActive: true,
      },
      where: (cat, { eq }) => eq(cat.isActive, 1),
      limit,
      offset,
    });

    return c.json({
      data: rows,
      page,
      limit,
    });
  } catch (e) {
    console.error("Error fetching categories:", e);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.get("/:id", authMiddleware, async (c) => {
  try {
    const id = c.req.param("id");
    const [row] = await db.query.categories.findMany({
      where: (cat, { eq }) => eq(cat.id, id),
    });
    if (!row) return c.json({ error: "Category not found" }, 404);
    return c.json(row);
  } catch (e) {
    console.error("Error fetching category:", e);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.post("/", authMiddleware, async (c) => {
  try {
    const body = await c.req.json<{
      code?: string;
      name: string;
      nameAr?: string;
      parentId?: string;
      sortOrder?: number;
      description?: string;
    }>();
    if (!body.name?.trim()) return c.json({ error: "name required" }, 400);
    const id = `cat_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
    await db.insert(categoriesTable).values({
      id,
      code: body.code?.trim() || null,
      name: body.name.trim(),
      nameAr: body.nameAr?.trim() || null,
      parentId: body.parentId || null,
      sortOrder: body.sortOrder ?? 0,
      description: body.description?.trim() || null,
      isActive: 1,
    });
    const [row] = await db.query.categories.findMany({
      where: (cat, { eq }) => eq(cat.id, id),
    });
    return c.json(row, 201);
  } catch (e) {
    console.error("Error creating category:", e);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

app.put("/:id", authMiddleware, async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json<{
      code?: string;
      name?: string;
      nameAr?: string;
      parentId?: string;
      sortOrder?: number;
      description?: string;
      isActive?: number;
    }>();
    const [existing] = await db.query.categories.findMany({
      where: (cat, { eq }) => eq(cat.id, id),
    });
    if (!existing) return c.json({ error: "Category not found" }, 404);
    await db
      .update(categoriesTable)
      .set({
        ...(body.code !== undefined && { code: body.code?.trim() || null }),
        ...(body.name !== undefined && { name: body.name?.trim() ?? existing.name }),
        ...(body.nameAr !== undefined && { nameAr: body.nameAr?.trim() || null }),
        ...(body.parentId !== undefined && { parentId: body.parentId || null }),
        ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
        ...(body.description !== undefined && { description: body.description?.trim() || null }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
      })
      .where(eq(categoriesTable.id, id));
    const [row] = await db.query.categories.findMany({
      where: (cat, { eq }) => eq(cat.id, id),
    });
    return c.json(row);
  } catch (e) {
    console.error("Error updating category:", e);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

app.delete("/:id", authMiddleware, async (c) => {
  try {
    const id = c.req.param("id");
    const [existing] = await db.query.categories.findMany({
      where: (cat, { eq }) => eq(cat.id, id),
    });
    if (!existing) return c.json({ error: "Category not found" }, 404);
    await db.update(categoriesTable).set({ isActive: 0 }).where(eq(categoriesTable.id, id));
    return c.json({ success: true });
  } catch (e) {
    console.error("Error deleting category:", e);
    return c.json({ error: "فشل في حذف السجل" }, 500);
  }
});

export default app;

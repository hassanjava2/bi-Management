import { Hono } from "hono";
import { db, products as productsTable } from "@bi-management/database";
import { authMiddleware } from "../lib/auth.js";
import { eq, count } from "drizzle-orm";

const app = new Hono();

app.get("/", authMiddleware, async (c) => {
  try {
    const page = Math.max(1, Number(c.req.query("page")) || 1);
    const limit = Math.min(100, Math.max(1, Number(c.req.query("limit")) || 20));
    const offset = (page - 1) * limit;

    const [totalResult] = await db
      .select({ count: count() })
      .from(productsTable)
      .where(eq(productsTable.isDeleted, 0));
    const total = Number(totalResult?.count ?? 0);

    const rows = await db.query.products.findMany({
      columns: {
        id: true,
        code: true,
        name: true,
        nameAr: true,
        categoryId: true,
        unit: true,
        sellingPrice: true,
        quantity: true,
        trackBySerial: true,
        isActive: true,
      },
      where: (p, { eq }) => eq(p.isDeleted, 0),
      limit,
      offset,
    });

    return c.json({
      data: rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (e) {
    console.error("Error fetching products:", e);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.get("/:id", authMiddleware, async (c) => {
  try {
    const id = c.req.param("id");
    const [row] = await db.query.products.findMany({
      where: (p, { eq }) => eq(p.id, id),
    });
    if (!row) return c.json({ error: "Product not found" }, 404);
    return c.json(row);
  } catch (e) {
    console.error("Error fetching product by id:", e);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.post("/", authMiddleware, async (c) => {
  try {
    const body = await c.req.json<{
      code?: string;
      name: string;
      nameAr?: string;
      categoryId?: string;
      unit?: string;
      sellingPrice?: number;
      quantity?: number;
    }>();
    if (!body.name?.trim()) return c.json({ error: "name required" }, 400);
    const id = `prod_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
    await db.insert(productsTable).values({
      id,
      code: body.code?.trim() || null,
      name: body.name.trim(),
      nameAr: body.nameAr?.trim() || null,
      categoryId: body.categoryId || null,
      unit: body.unit?.trim() || "piece",
      sellingPrice: body.sellingPrice ?? null,
      quantity: body.quantity ?? 0,
      isActive: 1,
      isDeleted: 0,
    });
    const [row] = await db.query.products.findMany({
      where: (p, { eq }) => eq(p.id, id),
    });
    return c.json(row, 201);
  } catch (e) {
    console.error("Error creating product:", e);
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
      categoryId?: string;
      unit?: string;
      sellingPrice?: number;
      quantity?: number;
      isActive?: number;
    }>();
    const [existing] = await db.query.products.findMany({
      where: (p, { eq }) => eq(p.id, id),
    });
    if (!existing) return c.json({ error: "Product not found" }, 404);
    await db
      .update(productsTable)
      .set({
        ...(body.code !== undefined && { code: body.code?.trim() || null }),
        ...(body.name !== undefined && { name: body.name?.trim() ?? existing.name }),
        ...(body.nameAr !== undefined && { nameAr: body.nameAr?.trim() || null }),
        ...(body.categoryId !== undefined && { categoryId: body.categoryId || null }),
        ...(body.unit !== undefined && { unit: body.unit?.trim() || "piece" }),
        ...(body.sellingPrice !== undefined && { sellingPrice: body.sellingPrice }),
        ...(body.quantity !== undefined && { quantity: body.quantity }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
        updatedAt: new Date(),
      })
      .where(eq(productsTable.id, id));
    const [row] = await db.query.products.findMany({
      where: (p, { eq }) => eq(p.id, id),
    });
    return c.json(row);
  } catch (e) {
    console.error("Error updating product:", e);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

app.delete("/:id", authMiddleware, async (c) => {
  try {
    const id = c.req.param("id");
    const [existing] = await db.query.products.findMany({
      where: (p, { eq }) => eq(p.id, id),
    });
    if (!existing) return c.json({ error: "Product not found" }, 404);
    await db
      .update(productsTable)
      .set({ isDeleted: 1, deletedAt: new Date() })
      .where(eq(productsTable.id, id));
    return c.json({ success: true });
  } catch (e) {
    console.error("Error deleting product:", e);
    return c.json({ error: "فشل في حذف السجل" }, 500);
  }
});

export default app;

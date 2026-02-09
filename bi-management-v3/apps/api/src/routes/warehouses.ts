import { Hono } from "hono";
import { db, warehouses as warehousesTable } from "@bi-management/database";
import { authMiddleware } from "../lib/auth.js";
import { eq } from "drizzle-orm";

const app = new Hono();
app.get("/", async (c) => {
  try {
    const page = Math.max(1, Number(c.req.query("page")) || 1);
    const limit = Math.min(100, Math.max(1, Number(c.req.query("limit")) || 20));
    const offset = (page - 1) * limit;

    const rows = await db.query.warehouses.findMany({
      columns: {
        id: true,
        code: true,
        name: true,
        nameAr: true,
        branchId: true,
        type: true,
        isActive: true,
      },
      where: (w, { eq }) => eq(w.isActive, 1),
      limit,
      offset,
    });

    return c.json({
      data: rows,
      page,
      limit,
    });
  } catch (e) {
    console.error("Error fetching warehouses:", e);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.get("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const [row] = await db.query.warehouses.findMany({
      where: (w, { eq }) => eq(w.id, id),
    });
    if (!row) return c.json({ error: "Warehouse not found" }, 404);
    return c.json(row);
  } catch (e) {
    console.error("Error fetching warehouse:", e);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.post("/", async (c) => {
  try {
    const body = await c.req.json<{
      code: string;
      name: string;
      nameAr?: string;
      branchId?: string;
      type?: string;
    }>();
    if (!body.code?.trim() || !body.name?.trim()) return c.json({ error: "code and name required" }, 400);
    const id = `wh_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
    await db.insert(warehousesTable).values({
      id,
      code: body.code.trim(),
      name: body.name.trim(),
      nameAr: body.nameAr?.trim() || null,
      branchId: body.branchId?.trim() || null,
      type: body.type?.trim() || "main",
      isActive: 1,
    });
    const [row] = await db.query.warehouses.findMany({
      where: (w, { eq }) => eq(w.id, id),
    });
    return c.json(row, 201);
  } catch (e) {
    console.error("Error creating warehouse:", e);
    return c.json({ error: "فشل في إنشاء المخزن" }, 500);
  }
});

app.put("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json<{
      code?: string;
      name?: string;
      nameAr?: string;
      branchId?: string;
      type?: string;
      isActive?: number;
    }>();
    const [existing] = await db.query.warehouses.findMany({
      where: (w, { eq }) => eq(w.id, id),
    });
    if (!existing) return c.json({ error: "Warehouse not found" }, 404);
    await db
      .update(warehousesTable)
      .set({
        ...(body.code !== undefined && { code: body.code?.trim() ?? existing.code }),
        ...(body.name !== undefined && { name: body.name?.trim() ?? existing.name }),
        ...(body.nameAr !== undefined && { nameAr: body.nameAr?.trim() || null }),
        ...(body.branchId !== undefined && { branchId: body.branchId?.trim() || null }),
        ...(body.type !== undefined && { type: body.type?.trim() || existing.type }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
        updatedAt: new Date(),
      })
      .where(eq(warehousesTable.id, id));
    const [row] = await db.query.warehouses.findMany({
      where: (w, { eq }) => eq(w.id, id),
    });
    return c.json(row);
  } catch (e) {
    console.error("Error updating warehouse:", e);
    return c.json({ error: "فشل في تحديث المخزن" }, 500);
  }
});

app.delete("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const [existing] = await db.query.warehouses.findMany({
      where: (w, { eq }) => eq(w.id, id),
    });
    if (!existing) return c.json({ error: "Warehouse not found" }, 404);
    await db.update(warehousesTable).set({ isActive: 0, updatedAt: new Date() }).where(eq(warehousesTable.id, id));
    return c.json({ success: true });
  } catch (e) {
    console.error("Error deleting warehouse:", e);
    return c.json({ error: "فشل في حذف المخزن" }, 500);
  }
});

export default app;

import { Hono } from "hono";
import { db, branches as branchesTable } from "@bi-management/database";
import { authMiddleware } from "../lib/auth.js";
import { eq } from "drizzle-orm";

const app = new Hono();

app.get("/", authMiddleware, async (c) => {
  try {
    const page = Math.max(1, Number(c.req.query("page")) || 1);
    const limit = Math.min(100, Math.max(1, Number(c.req.query("limit")) || 20));
    const offset = (page - 1) * limit;

    const rows = await db.query.branches.findMany({
      columns: {
        id: true,
        code: true,
        name: true,
        nameAr: true,
        address: true,
        city: true,
        phone: true,
        isMain: true,
        isActive: true,
      },
      where: (b, { eq }) => eq(b.isActive, 1),
      limit,
      offset,
    });

    return c.json({
      data: rows,
      page,
      limit,
    });
  } catch (e) {
    console.error("Error fetching branches:", e);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.get("/:id", authMiddleware, async (c) => {
  try {
    const id = c.req.param("id");
    const [row] = await db.query.branches.findMany({
      where: (b, { eq }) => eq(b.id, id),
    });
    if (!row) return c.json({ error: "Branch not found" }, 404);
    return c.json(row);
  } catch (e) {
    console.error("Error fetching branch:", e);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.post("/", authMiddleware, async (c) => {
  try {
    const body = await c.req.json<{
      code: string;
      name: string;
      nameAr?: string;
      address?: string;
      city?: string;
      phone?: string;
      email?: string;
      isMain?: number;
    }>();
    if (!body.code?.trim() || !body.name?.trim()) return c.json({ error: "code and name required" }, 400);
    const id = `branch_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
    await db.insert(branchesTable).values({
      id,
      code: body.code.trim(),
      name: body.name.trim(),
      nameAr: body.nameAr?.trim() || null,
      address: body.address?.trim() || null,
      city: body.city?.trim() || null,
      phone: body.phone?.trim() || null,
      email: body.email?.trim() || null,
      isMain: body.isMain ?? 0,
      isActive: 1,
    });
    const [row] = await db.query.branches.findMany({
      where: (b, { eq }) => eq(b.id, id),
    });
    return c.json(row, 201);
  } catch (e) {
    console.error("Error creating branch:", e);
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
      address?: string;
      city?: string;
      phone?: string;
      email?: string;
      isMain?: number;
      isActive?: number;
    }>();
    const [existing] = await db.query.branches.findMany({
      where: (b, { eq }) => eq(b.id, id),
    });
    if (!existing) return c.json({ error: "Branch not found" }, 404);
    await db
      .update(branchesTable)
      .set({
        ...(body.code !== undefined && { code: body.code?.trim() ?? existing.code }),
        ...(body.name !== undefined && { name: body.name?.trim() ?? existing.name }),
        ...(body.nameAr !== undefined && { nameAr: body.nameAr?.trim() || null }),
        ...(body.address !== undefined && { address: body.address?.trim() || null }),
        ...(body.city !== undefined && { city: body.city?.trim() || null }),
        ...(body.phone !== undefined && { phone: body.phone?.trim() || null }),
        ...(body.email !== undefined && { email: body.email?.trim() || null }),
        ...(body.isMain !== undefined && { isMain: body.isMain }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
      })
      .where(eq(branchesTable.id, id));
    const [row] = await db.query.branches.findMany({
      where: (b, { eq }) => eq(b.id, id),
    });
    return c.json(row);
  } catch (e) {
    console.error("Error updating branch:", e);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

app.delete("/:id", authMiddleware, async (c) => {
  try {
    const id = c.req.param("id");
    const [existing] = await db.query.branches.findMany({
      where: (b, { eq }) => eq(b.id, id),
    });
    if (!existing) return c.json({ error: "Branch not found" }, 404);
    await db.update(branchesTable).set({ isActive: 0 }).where(eq(branchesTable.id, id));
    return c.json({ success: true });
  } catch (e) {
    console.error("Error deleting branch:", e);
    return c.json({ error: "فشل في حذف السجل" }, 500);
  }
});

export default app;

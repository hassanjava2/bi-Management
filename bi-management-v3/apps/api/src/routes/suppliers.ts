import { Hono } from "hono";
import { db, suppliers as suppliersTable } from "@bi-management/database";
import { authMiddleware } from "../lib/auth.js";
import { eq } from "drizzle-orm";

const app = new Hono();

app.get("/", authMiddleware, async (c) => {
  try {
    const page = Math.max(1, Number(c.req.query("page")) || 1);
    const limit = Math.min(100, Math.max(1, Number(c.req.query("limit")) || 20));
    const offset = (page - 1) * limit;

    const rows = await db.query.suppliers.findMany({
      columns: {
        id: true,
        code: true,
        name: true,
        nameAr: true,
        phone: true,
        email: true,
        balance: true,
        isActive: true,
      },
      where: (s, { eq, and }) =>
        and(eq(s.isActive, 1), eq(s.isDeleted, 0)),
      limit,
      offset,
    });

    return c.json({
      data: rows,
      page,
      limit,
    });
  } catch (e) {
    console.error("Error fetching suppliers:", e);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.get("/:id", authMiddleware, async (c) => {
  try {
    const id = c.req.param("id");
    const [row] = await db.query.suppliers.findMany({
      where: (s, { eq }) => eq(s.id, id),
    });
    if (!row) return c.json({ error: "Supplier not found" }, 404);
    return c.json(row);
  } catch (e) {
    console.error("Error fetching supplier:", e);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.post("/", authMiddleware, async (c) => {
  try {
    const body = await c.req.json<{
      code?: string;
      name: string;
      nameAr?: string;
      type?: string;
      contactPerson?: string;
      phone?: string;
      phone2?: string;
      email?: string;
      website?: string;
      address?: string;
      city?: string;
      country?: string;
    }>();
    if (!body.name?.trim()) return c.json({ error: "name required" }, 400);
    const id = `sup_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
    await db.insert(suppliersTable).values({
      id,
      code: body.code?.trim() || null,
      name: body.name.trim(),
      nameAr: body.nameAr?.trim() || null,
      type: body.type?.trim() || "company",
      contactPerson: body.contactPerson?.trim() || null,
      phone: body.phone?.trim() || null,
      phone2: body.phone2?.trim() || null,
      email: body.email?.trim() || null,
      website: body.website?.trim() || null,
      address: body.address?.trim() || null,
      city: body.city?.trim() || null,
      country: body.country?.trim() || null,
      isActive: 1,
      isDeleted: 0,
    });
    const [row] = await db.query.suppliers.findMany({
      where: (s, { eq }) => eq(s.id, id),
    });
    return c.json(row, 201);
  } catch (e) {
    console.error("Error creating supplier:", e);
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
      type?: string;
      contactPerson?: string;
      phone?: string;
      phone2?: string;
      email?: string;
      website?: string;
      address?: string;
      city?: string;
      country?: string;
      isActive?: number;
    }>();
    const [existing] = await db.query.suppliers.findMany({
      where: (s, { eq }) => eq(s.id, id),
    });
    if (!existing) return c.json({ error: "Supplier not found" }, 404);
    await db
      .update(suppliersTable)
      .set({
        ...(body.code !== undefined && { code: body.code?.trim() || null }),
        ...(body.name !== undefined && { name: body.name?.trim() ?? existing.name }),
        ...(body.nameAr !== undefined && { nameAr: body.nameAr?.trim() || null }),
        ...(body.type !== undefined && { type: body.type?.trim() || "company" }),
        ...(body.contactPerson !== undefined && { contactPerson: body.contactPerson?.trim() || null }),
        ...(body.phone !== undefined && { phone: body.phone?.trim() || null }),
        ...(body.phone2 !== undefined && { phone2: body.phone2?.trim() || null }),
        ...(body.email !== undefined && { email: body.email?.trim() || null }),
        ...(body.website !== undefined && { website: body.website?.trim() || null }),
        ...(body.address !== undefined && { address: body.address?.trim() || null }),
        ...(body.city !== undefined && { city: body.city?.trim() || null }),
        ...(body.country !== undefined && { country: body.country?.trim() || null }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
        updatedAt: new Date(),
      })
      .where(eq(suppliersTable.id, id));
    const [row] = await db.query.suppliers.findMany({
      where: (s, { eq }) => eq(s.id, id),
    });
    return c.json(row);
  } catch (e) {
    console.error("Error updating supplier:", e);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

app.delete("/:id", authMiddleware, async (c) => {
  try {
    const id = c.req.param("id");
    const [existing] = await db.query.suppliers.findMany({
      where: (s, { eq }) => eq(s.id, id),
    });
    if (!existing) return c.json({ error: "Supplier not found" }, 404);
    await db
      .update(suppliersTable)
      .set({ isDeleted: 1, deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(suppliersTable.id, id));
    return c.json({ success: true });
  } catch (e) {
    console.error("Error deleting supplier:", e);
    return c.json({ error: "فشل في حذف السجل" }, 500);
  }
});

export default app;

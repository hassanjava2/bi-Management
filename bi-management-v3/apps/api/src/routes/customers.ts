import { Hono } from "hono";
import { db, customers as customersTable } from "@bi-management/database";
import { authMiddleware } from "../lib/auth.js";
import { eq } from "drizzle-orm";

const app = new Hono();

app.get("/", authMiddleware, async (c) => {
  try {
    const page = Math.max(1, Number(c.req.query("page")) || 1);
    const limit = Math.min(100, Math.max(1, Number(c.req.query("limit")) || 20));
    const offset = (page - 1) * limit;

    const rows = await db.query.customers.findMany({
      columns: {
        id: true,
        code: true,
        name: true,
        type: true,
        phone: true,
        email: true,
        balance: true,
        creditLimit: true,
        isActive: true,
        isBlocked: true,
      },
      where: (cust, { eq, and }) =>
        and(eq(cust.isActive, 1), eq(cust.isDeleted, 0)),
      limit,
      offset,
    });

    return c.json({
      data: rows,
      page,
      limit,
    });
  } catch (e) {
    console.error("Error fetching customers:", e);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.get("/:id", authMiddleware, async (c) => {
  try {
    const id = c.req.param("id");
    const [row] = await db.query.customers.findMany({
      where: (cust, { eq }) => eq(cust.id, id),
    });
    if (!row) return c.json({ error: "Customer not found" }, 404);
    return c.json(row);
  } catch (e) {
    console.error("Error fetching customer by id:", e);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.post("/", authMiddleware, async (c) => {
  try {
    const body = await c.req.json<{
      code?: string;
      name: string;
      phone: string;
      phone2?: string;
      email?: string;
      type?: string;
    }>();
    if (!body.name?.trim() || !body.phone?.trim()) return c.json({ error: "name and phone required" }, 400);
    const id = `cust_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
    await db.insert(customersTable).values({
      id,
      code: body.code?.trim() || null,
      name: body.name.trim(),
      phone: body.phone.trim(),
      phone2: body.phone2?.trim() || null,
      email: body.email?.trim() || null,
      type: body.type?.trim() || "retail",
      isActive: 1,
      isDeleted: 0,
    });
    const [row] = await db.query.customers.findMany({
      where: (cust, { eq }) => eq(cust.id, id),
    });
    return c.json(row, 201);
  } catch (e) {
    console.error("Error creating customer:", e);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

app.put("/:id", authMiddleware, async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json<{
      code?: string;
      name?: string;
      phone?: string;
      phone2?: string;
      email?: string;
      type?: string;
      isActive?: number;
      isBlocked?: number;
    }>();
    const [existing] = await db.query.customers.findMany({
      where: (cust, { eq }) => eq(cust.id, id),
    });
    if (!existing) return c.json({ error: "Customer not found" }, 404);
    await db
      .update(customersTable)
      .set({
        ...(body.code !== undefined && { code: body.code?.trim() || null }),
        ...(body.name !== undefined && { name: body.name?.trim() ?? existing.name }),
        ...(body.phone !== undefined && { phone: body.phone?.trim() ?? existing.phone }),
        ...(body.phone2 !== undefined && { phone2: body.phone2?.trim() || null }),
        ...(body.email !== undefined && { email: body.email?.trim() || null }),
        ...(body.type !== undefined && { type: body.type?.trim() || "retail" }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
        ...(body.isBlocked !== undefined && { isBlocked: body.isBlocked }),
        updatedAt: new Date(),
      })
      .where(eq(customersTable.id, id));
    const [row] = await db.query.customers.findMany({
      where: (cust, { eq }) => eq(cust.id, id),
    });
    return c.json(row);
  } catch (e) {
    console.error("Error updating customer:", e);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

app.delete("/:id", authMiddleware, async (c) => {
  try {
    const id = c.req.param("id");
    const [existing] = await db.query.customers.findMany({
      where: (cust, { eq }) => eq(cust.id, id),
    });
    if (!existing) return c.json({ error: "Customer not found" }, 404);
    await db
      .update(customersTable)
      .set({ isDeleted: 1, deletedAt: new Date() })
      .where(eq(customersTable.id, id));
    return c.json({ success: true });
  } catch (e) {
    console.error("Error deleting customer:", e);
    return c.json({ error: "فشل في حذف السجل" }, 500);
  }
});

export default app;

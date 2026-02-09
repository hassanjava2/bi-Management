import { Hono } from "hono";
import { db, cashRegisters as cashRegistersTable } from "@bi-management/database";
import { eq } from "drizzle-orm";
import { authMiddleware } from "../lib/auth.js";

const app = new Hono();

app.get("/", authMiddleware, async (c) => {
  try {
    const page = Math.max(1, Number(c.req.query("page")) || 1);
    const limit = Math.min(100, Math.max(1, Number(c.req.query("limit")) || 20));
    const offset = (page - 1) * limit;

    const rows = await db.query.cashRegisters.findMany({
      columns: {
        id: true,
        code: true,
        name: true,
        branchId: true,
        balance: true,
        currency: true,
        isActive: true,
        createdAt: true,
      },
      where: (cr, { eq }) => eq(cr.isActive, 1),
      limit,
      offset,
    });

    return c.json({
      data: rows,
      page,
      limit,
    });
  } catch (e) {
    console.error(e);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.get("/:id", authMiddleware, async (c) => {
  try {
    const id = c.req.param("id");
    const [row] = await db.query.cashRegisters.findMany({
      where: (cr, { eq }) => eq(cr.id, id),
    });
    if (!row) return c.json({ error: "Cash register not found" }, 404);
    return c.json(row);
  } catch (e) {
    console.error(e);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.post("/", authMiddleware, async (c) => {
  try {
    const body = await c.req.json<{
      code: string;
      name: string;
      branchId?: string;
      balance?: number;
      currency?: string;
    }>();

    if (!body.code || !body.name) {
      return c.json({ error: "code and name are required" }, 400);
    }

    const id = `cr_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;

    await db.insert(cashRegistersTable).values({
      id,
      code: body.code.trim(),
      name: body.name.trim(),
      branchId: body.branchId?.trim() || null,
      balance: body.balance ?? 0,
      currency: body.currency?.trim() || "IQD",
      isActive: 1,
      createdAt: new Date(),
    });

    const [created] = await db.query.cashRegisters.findMany({
      where: (cr, { eq }) => eq(cr.id, id),
    });

    return c.json(created, 201);
  } catch (e) {
    console.error("Error creating cash register:", e);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

app.put("/:id", authMiddleware, async (c) => {
  try {
    const id = c.req.param("id");
    const [existing] = await db.query.cashRegisters.findMany({
      where: (cr, { and, eq }) => and(eq(cr.id, id), eq(cr.isActive, 1)),
    });
    if (!existing) return c.json({ error: "Cash register not found" }, 404);

    const body = await c.req.json<{
      code?: string;
      name?: string;
      balance?: number;
      currency?: string;
    }>();

    await db.update(cashRegistersTable).set({
      code: body.code?.trim() || existing.code,
      name: body.name?.trim() || existing.name,
      balance: body.balance ?? existing.balance,
      currency: body.currency?.trim() ?? existing.currency,
    }).where(eq(cashRegistersTable.id, id));

    const [updated] = await db.query.cashRegisters.findMany({
      where: (cr, { eq }) => eq(cr.id, id),
    });
    return c.json(updated);
  } catch (e) {
    console.error(e);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

app.delete("/:id", authMiddleware, async (c) => {
  try {
    const id = c.req.param("id");
    const [existing] = await db.query.cashRegisters.findMany({
      where: (cr, { and, eq }) => and(eq(cr.id, id), eq(cr.isActive, 1)),
    });
    if (!existing) return c.json({ error: "Cash register not found" }, 404);

    await db.update(cashRegistersTable).set({ isActive: 0 }).where(eq(cashRegistersTable.id, id));
    return c.json({ success: true });
  } catch (e) {
    console.error(e);
    return c.json({ error: "فشل في حذف السجل" }, 500);
  }
});

export default app;

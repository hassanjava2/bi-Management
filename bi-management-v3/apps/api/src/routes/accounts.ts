import { Hono } from "hono";
import { db, accounts as accountsTable } from "@bi-management/database";
import { authMiddleware } from "../lib/auth.js";
import { eq } from "drizzle-orm";

const app = new Hono();

app.get("/", authMiddleware, async (c) => {
  try {
    const page = Math.max(1, Number(c.req.query("page")) || 1);
    const limit = Math.min(100, Math.max(1, Number(c.req.query("limit")) || 20));
    const offset = (page - 1) * limit;

    const rows = await db.query.accounts.findMany({
      columns: {
        id: true,
        code: true,
        name: true,
        nameAr: true,
        parentId: true,
        type: true,
        nature: true,
        balance: true,
        isSystem: true,
        isActive: true,
      },
      where: (a, { eq }) => eq(a.isActive, 1),
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
    const [row] = await db.query.accounts.findMany({
      where: (a, { eq }) => eq(a.id, id),
    });
    if (!row) return c.json({ error: "Account not found" }, 404);
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
      nameAr?: string;
      parentId?: string;
      type: string;
      nature?: string;
      description?: string;
    }>();

    if (!body.code?.trim() || !body.name?.trim() || !body.type?.trim()) {
      return c.json({ error: "code, name, and type are required" }, 400);
    }

    // Check for duplicate code
    const [existing] = await db.query.accounts.findMany({
      where: (a, { eq }) => eq(a.code, body.code.trim()),
    });
    if (existing) {
      return c.json({ error: "كود الحساب موجود مسبقاً" }, 400);
    }

    const id = `acc_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
    await db.insert(accountsTable).values({
      id,
      code: body.code.trim(),
      name: body.name.trim(),
      nameAr: body.nameAr?.trim() || null,
      parentId: body.parentId || null,
      type: body.type.trim(),
      nature: body.nature?.trim() || "debit",
      description: body.description?.trim() || null,
      balance: 0,
      isSystem: 0,
      isActive: 1,
    });

    const [row] = await db.query.accounts.findMany({
      where: (a, { eq }) => eq(a.id, id),
    });
    return c.json(row, 201);
  } catch (e) {
    console.error("Error creating account:", e);
    return c.json({ error: "فشل في إنشاء الحساب" }, 500);
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
      type?: string;
      nature?: string;
      description?: string;
      isActive?: number;
    }>();

    const [existing] = await db.query.accounts.findMany({
      where: (a, { eq }) => eq(a.id, id),
    });
    if (!existing) {
      return c.json({ error: "Account not found" }, 404);
    }

    // Prevent editing system accounts
    if (existing.isSystem === 1) {
      return c.json({ error: "لا يمكن تعديل الحسابات النظامية" }, 400);
    }

    // Check for duplicate code if changing
    if (body.code && body.code.trim() !== existing.code) {
      const [duplicate] = await db.query.accounts.findMany({
        where: (a, { eq }) => eq(a.code, body.code!.trim()),
      });
      if (duplicate) {
        return c.json({ error: "كود الحساب موجود مسبقاً" }, 400);
      }
    }

    await db
      .update(accountsTable)
      .set({
        ...(body.code !== undefined && { code: body.code.trim() }),
        ...(body.name !== undefined && { name: body.name.trim() }),
        ...(body.nameAr !== undefined && { nameAr: body.nameAr?.trim() || null }),
        ...(body.parentId !== undefined && { parentId: body.parentId || null }),
        ...(body.type !== undefined && { type: body.type.trim() }),
        ...(body.nature !== undefined && { nature: body.nature?.trim() || "debit" }),
        ...(body.description !== undefined && { description: body.description?.trim() || null }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
      })
      .where(eq(accountsTable.id, id));

    const [row] = await db.query.accounts.findMany({
      where: (a, { eq }) => eq(a.id, id),
    });
    return c.json(row);
  } catch (e) {
    console.error("Error updating account:", e);
    return c.json({ error: "فشل في تحديث الحساب" }, 500);
  }
});

app.delete("/:id", authMiddleware, async (c) => {
  try {
    const id = c.req.param("id");
    const [existing] = await db.query.accounts.findMany({
      where: (a, { eq }) => eq(a.id, id),
    });
    if (!existing) {
      return c.json({ error: "Account not found" }, 404);
    }

    // Prevent deleting system accounts
    if (existing.isSystem === 1) {
      return c.json({ error: "لا يمكن حذف الحسابات النظامية" }, 400);
    }

    // Check if account has balance
    if (existing.balance && existing.balance !== 0) {
      return c.json({ error: "لا يمكن حذف حساب له رصيد" }, 400);
    }

    // Soft delete
    await db
      .update(accountsTable)
      .set({ isActive: 0 })
      .where(eq(accountsTable.id, id));

    return c.json({ success: true });
  } catch (e) {
    console.error("Error deleting account:", e);
    return c.json({ error: "فشل في حذف الحساب" }, 500);
  }
});

export default app;

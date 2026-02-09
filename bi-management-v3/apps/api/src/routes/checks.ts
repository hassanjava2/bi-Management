import { Hono } from "hono";
import { db, checks as checksTable } from "@bi-management/database";
import { eq, ne } from "drizzle-orm";
import { authMiddleware } from "../lib/auth.js";

const app = new Hono();

app.get("/", authMiddleware, async (c) => {
  try {
    const page = Math.max(1, Number(c.req.query("page")) || 1);
    const limit = Math.min(100, Math.max(1, Number(c.req.query("limit")) || 20));
    const offset = (page - 1) * limit;

    const rows = await db.query.checks.findMany({
      columns: {
        id: true,
        checkNumber: true,
        type: true,
        amount: true,
        dueDate: true,
        checkDate: true,
        status: true,
        payeeName: true,
        createdAt: true,
      },
      where: (ch, { ne }) => ne(ch.status, "cancelled"),
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
    const [row] = await db.query.checks.findMany({
      where: (ch, { eq }) => eq(ch.id, id),
    });
    if (!row) return c.json({ error: "Check not found" }, 404);
    return c.json(row);
  } catch (e) {
    console.error(e);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.post("/", authMiddleware, async (c) => {
  try {
    const body = await c.req.json<{
      checkNumber: string;
      type: string;
      amount: number;
      checkDate: string;
      dueDate?: string;
      payeeName?: string;
      bankAccountId?: string;
      notes?: string;
    }>();

    if (!body.checkNumber || !body.type || !body.amount || !body.checkDate) {
      return c.json({ error: "checkNumber, type, amount, and checkDate are required" }, 400);
    }

    const id = `chk_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;

    await db.insert(checksTable).values({
      id,
      checkNumber: body.checkNumber.trim(),
      type: body.type.trim(),
      amount: body.amount,
      checkDate: body.checkDate.trim(),
      dueDate: body.dueDate?.trim() || null,
      payeeName: body.payeeName?.trim() || null,
      bankAccountId: body.bankAccountId?.trim() || null,
      notes: body.notes?.trim() || null,
      status: "pending",
      createdAt: new Date(),
    });

    const [created] = await db.query.checks.findMany({
      where: (ch, { eq }) => eq(ch.id, id),
    });

    return c.json(created, 201);
  } catch (e) {
    console.error(e);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

app.put("/:id", authMiddleware, async (c) => {
  try {
    const id = c.req.param("id");
    const [existing] = await db.query.checks.findMany({
      where: (ch, { and, eq, ne }) => and(eq(ch.id, id), ne(ch.status, "cancelled")),
    });
    if (!existing) return c.json({ error: "Check not found" }, 404);

    const body = await c.req.json<{
      checkNumber?: string;
      type?: string;
      amount?: number;
      checkDate?: string;
      dueDate?: string;
      payeeName?: string;
      status?: string;
      notes?: string;
    }>();

    await db.update(checksTable).set({
      checkNumber: body.checkNumber?.trim() || existing.checkNumber,
      type: body.type?.trim() || existing.type,
      amount: body.amount ?? existing.amount,
      checkDate: body.checkDate?.trim() || existing.checkDate,
      dueDate: body.dueDate?.trim() ?? existing.dueDate,
      payeeName: body.payeeName?.trim() ?? existing.payeeName,
      status: body.status?.trim() ?? existing.status,
      notes: body.notes?.trim() ?? existing.notes,
    }).where(eq(checksTable.id, id));

    const [updated] = await db.query.checks.findMany({
      where: (ch, { eq }) => eq(ch.id, id),
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
    const [existing] = await db.query.checks.findMany({
      where: (ch, { and, eq, ne }) => and(eq(ch.id, id), ne(ch.status, "cancelled")),
    });
    if (!existing) return c.json({ error: "Check not found" }, 404);

    await db.update(checksTable).set({ status: "cancelled" }).where(eq(checksTable.id, id));
    return c.json({ success: true });
  } catch (e) {
    console.error(e);
    return c.json({ error: "فشل في حذف السجل" }, 500);
  }
});

export default app;

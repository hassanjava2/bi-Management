import { Hono } from "hono";
import { db, bankAccounts as bankAccountsTable, bankReconciliations } from "@bi-management/database";
import { eq, desc } from "drizzle-orm";
import { authMiddleware } from "../lib/auth.js";

const app = new Hono();
app.get("/", authMiddleware, async (c) => {
  try {
    const page = Math.max(1, Number(c.req.query("page")) || 1);
    const limit = Math.min(100, Math.max(1, Number(c.req.query("limit")) || 20));
    const offset = (page - 1) * limit;

    const rows = await db.query.bankAccounts.findMany({
      columns: {
        id: true,
        accountNumber: true,
        bankName: true,
        accountName: true,
        branchName: true,
        balance: true,
        currency: true,
        iban: true,
        isActive: true,
        createdAt: true,
      },
      where: (ba, { eq }) => eq(ba.isActive, 1),
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
    const [row] = await db.query.bankAccounts.findMany({
      where: (ba, { eq }) => eq(ba.id, id),
    });
    if (!row) return c.json({ error: "Bank account not found" }, 404);
    return c.json(row);
  } catch (e) {
    console.error(e);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.post("/", authMiddleware, async (c) => {
  try {
    const body = await c.req.json<{
      accountNumber: string;
      bankName: string;
      accountName?: string;
      branchName?: string;
      balance?: number;
      currency?: string;
      iban?: string;
      swiftCode?: string;
    }>();

    if (!body.accountNumber || !body.bankName) {
      return c.json({ error: "accountNumber and bankName are required" }, 400);
    }

    const id = `ba_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;

    await db.insert(bankAccountsTable).values({
      id,
      accountNumber: body.accountNumber.trim(),
      bankName: body.bankName.trim(),
      accountName: body.accountName?.trim() || null,
      branchName: body.branchName?.trim() || null,
      balance: body.balance ?? 0,
      currency: body.currency?.trim() || "IQD",
      iban: body.iban?.trim() || null,
      swiftCode: body.swiftCode?.trim() || null,
      isActive: 1,
      createdAt: new Date(),
    });

    const [created] = await db.query.bankAccounts.findMany({
      where: (ba, { eq }) => eq(ba.id, id),
    });

    return c.json(created, 201);
  } catch (e) {
    console.error("Error creating bank account:", e);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

app.put("/:id", authMiddleware, async (c) => {
  try {
    const id = c.req.param("id");
    const [existing] = await db.query.bankAccounts.findMany({
      where: (ba, { and, eq }) => and(eq(ba.id, id), eq(ba.isActive, 1)),
    });
    if (!existing) return c.json({ error: "Bank account not found" }, 404);

    const body = await c.req.json<{
      accountNumber?: string;
      bankName?: string;
      accountName?: string;
      branchName?: string;
      balance?: number;
      currency?: string;
      iban?: string;
    }>();

    await db.update(bankAccountsTable).set({
      accountNumber: body.accountNumber?.trim() || existing.accountNumber,
      bankName: body.bankName?.trim() || existing.bankName,
      accountName: body.accountName?.trim() ?? existing.accountName,
      branchName: body.branchName?.trim() ?? existing.branchName,
      balance: body.balance ?? existing.balance,
      currency: body.currency?.trim() ?? existing.currency,
      iban: body.iban?.trim() ?? existing.iban,
    }).where(eq(bankAccountsTable.id, id));

    const [updated] = await db.query.bankAccounts.findMany({
      where: (ba, { eq }) => eq(ba.id, id),
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
    const [existing] = await db.query.bankAccounts.findMany({
      where: (ba, { and, eq }) => and(eq(ba.id, id), eq(ba.isActive, 1)),
    });
    if (!existing) return c.json({ error: "Bank account not found" }, 404);

    await db.update(bankAccountsTable).set({ isActive: 0 }).where(eq(bankAccountsTable.id, id));
    return c.json({ success: true });
  } catch (e) {
    console.error(e);
    return c.json({ error: "فشل في حذف السجل" }, 500);
  }
});

app.get("/:id/reconciliations", authMiddleware, async (c) => {
  try {
    const id = c.req.param("id");
    const [account] = await db.query.bankAccounts.findMany({
      where: (ba, { eq }) => eq(ba.id, id),
      limit: 1,
    });
    if (!account) return c.json({ error: "Bank account not found" }, 404);

    const list = await db
      .select()
      .from(bankReconciliations)
      .where(eq(bankReconciliations.bankAccountId, id))
      .orderBy(desc(bankReconciliations.statementDate));
    return c.json({ reconciliations: list });
  } catch (e) {
    console.error(e);
    return c.json({ error: "فشل في جلب التسويات" }, 500);
  }
});

app.post("/:id/reconciliations", authMiddleware, async (c) => {
  try {
    const user = c.get("user") as { id: string } | undefined;
    const id = c.req.param("id");
    const [account] = await db.query.bankAccounts.findMany({
      where: (ba, { eq }) => eq(ba.id, id),
      limit: 1,
    });
    if (!account) return c.json({ error: "Bank account not found" }, 404);

    const body = await c.req.json<{
      statementDate: string;
      statementBalance: number;
      notes?: string;
    }>();
    if (!body.statementDate || body.statementBalance === undefined) {
      return c.json({ error: "statementDate and statementBalance are required" }, 400);
    }

    const bookBalance = account.balance ?? 0;
    const statementBalance = Number(body.statementBalance);
    const difference = statementBalance - bookBalance;

    const recId = `br_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
    await db.insert(bankReconciliations).values({
      id: recId,
      bankAccountId: id,
      statementDate: body.statementDate,
      statementBalance,
      bookBalance,
      difference,
      notes: body.notes?.trim() || null,
      createdBy: user?.userId || null,
      createdAt: new Date(),
    });

    const [created] = await db.select().from(bankReconciliations).where(eq(bankReconciliations.id, recId));
    return c.json(created, 201);
  } catch (e) {
    console.error(e);
    return c.json({ error: "فشل في تسجيل التسوية" }, 500);
  }
});

export default app;

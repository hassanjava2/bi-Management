import { Hono } from "hono";
import { db, journalEntries, journalEntryLines, accounts as accountsTable, systemSettings } from "@bi-management/database";
import { authMiddleware } from "../lib/auth.js";
import { assertPeriodNotLocked, getPeriodLockBeforeDate } from "../lib/accounting.js";
import { logAuditEvent } from "./audit.js";
import { eq, sql, desc, and } from "drizzle-orm";
import { nanoid } from "nanoid";

const app = new Hono();
app.get("/", authMiddleware, async (c) => {
  try {
    const page = Math.max(1, Number(c.req.query("page")) || 1);
    const limit = Math.min(100, Math.max(1, Number(c.req.query("limit")) || 20));
    const offset = (page - 1) * limit;
    const status = c.req.query("status");

    const rows = await db.query.journalEntries.findMany({
      columns: {
        id: true,
        entryNumber: true,
        entryDate: true,
        description: true,
        totalDebit: true,
        totalCredit: true,
        status: true,
        createdAt: true,
      },
      where: status ? (e, { eq }) => eq(e.status, status) : undefined,
      orderBy: (e, { desc }) => [desc(e.createdAt)],
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
    const [entry] = await db.query.journalEntries.findMany({
      where: (e, { eq }) => eq(e.id, id),
    });
    if (!entry) return c.json({ error: "Journal entry not found" }, 404);
    const lines = await db.query.journalEntryLines.findMany({
      where: (l, { eq }) => eq(l.journalEntryId, id),
    });
    return c.json({ ...entry, lines });
  } catch (e) {
    console.error(e);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

type JournalLine = {
  accountId: string;
  debit?: number;
  credit?: number;
  description?: string;
  costCenter?: string;
};

app.post("/", authMiddleware, async (c) => {
  try {
    const user = c.get("user") as { id: string } | undefined;
    const body = await c.req.json<{
      entryDate: string;
      description?: string;
      referenceType?: string;
      referenceId?: string;
      lines: JournalLine[];
    }>();

    if (!body.entryDate || !body.lines || body.lines.length < 2) {
      return c.json({ error: "يجب تحديد التاريخ وعلى الأقل حسابين" }, 400);
    }
    try {
      await assertPeriodNotLocked(body.entryDate);
    } catch (e) {
      return c.json({ error: e instanceof Error ? e.message : "الفترة المحاسبية مقفلة" }, 400);
    }

    let totalDebit = 0;
    let totalCredit = 0;
    for (const line of body.lines) {
      totalDebit += line.debit || 0;
      totalCredit += line.credit || 0;
    }

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return c.json({ error: "القيد غير متوازن - مجموع المدين يجب أن يساوي مجموع الدائن" }, 400);
    }

    const [newEntry, newLines] = await db.transaction(async (tx) => {
      const year = new Date().getFullYear();
      const [lastEntry] = await tx.query.journalEntries.findMany({
        orderBy: (e, { desc }) => [desc(e.createdAt)],
        limit: 1,
      });
      const sequence = lastEntry ? parseInt(lastEntry.entryNumber.split("-")[2] || "0", 10) + 1 : 1;
      const entryNumber = `JE-${year}-${String(sequence).padStart(5, "0")}`;
      const entryId = `je_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;

      await tx.insert(journalEntries).values({
        id: entryId,
        entryNumber,
        entryDate: body.entryDate,
        description: body.description?.trim() || null,
        referenceType: body.referenceType || null,
        referenceId: body.referenceId || null,
        totalDebit,
        totalCredit,
        status: "draft",
        createdBy: user?.userId || null,
      });

      for (const line of body.lines) {
        const lineId = `jel_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
        await tx.insert(journalEntryLines).values({
          id: lineId,
          journalEntryId: entryId,
          accountId: line.accountId,
          debit: line.debit || 0,
          credit: line.credit || 0,
          description: line.description?.trim() || null,
          costCenter: line.costCenter?.trim() || null,
        });
      }

      const entry = await tx.query.journalEntries.findMany({
        where: (e, { eq }) => eq(e.id, entryId),
        limit: 1,
      });
      const lines = await tx.query.journalEntryLines.findMany({
        where: (l, { eq }) => eq(l.journalEntryId, entryId),
      });
      return [entry[0], lines] as const;
    });

    if (!newEntry) return c.json({ error: "فشل في إنشاء القيد" }, 500);
    await logAuditEvent({
      eventType: "JOURNAL_CREATED",
      userId: user?.userId,
      entityType: "journal_entry",
      entityId: newEntry.id,
      entityName: newEntry.entryNumber,
      newValue: { totalDebit: newEntry.totalDebit, totalCredit: newEntry.totalCredit },
    });
    return c.json({ ...newEntry, lines: newLines }, 201);
  } catch (e) {
    console.error("Error creating journal entry:", e);
    return c.json({ error: "فشل في إنشاء القيد" }, 500);
  }
});

app.put("/:id", authMiddleware, async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json<{
      entryDate?: string;
      description?: string;
      lines?: JournalLine[];
    }>();

    const [existing] = await db.query.journalEntries.findMany({
      where: (e, { eq }) => eq(e.id, id),
    });
    if (!existing) {
      return c.json({ error: "القيد غير موجود" }, 404);
    }

    // Only allow editing draft entries
    if (existing.status !== "draft") {
      return c.json({ error: "لا يمكن تعديل قيد مرحل" }, 400);
    }

    // Update entry basic info
    if (body.entryDate || body.description !== undefined) {
      await db
        .update(journalEntries)
        .set({
          ...(body.entryDate && { entryDate: body.entryDate }),
          ...(body.description !== undefined && { description: body.description?.trim() || null }),
        })
        .where(eq(journalEntries.id, id));
    }

    // Update lines if provided
    if (body.lines && body.lines.length >= 2) {
      // Calculate totals
      let totalDebit = 0;
      let totalCredit = 0;
      for (const line of body.lines) {
        totalDebit += line.debit || 0;
        totalCredit += line.credit || 0;
      }

      // Validate balanced entry
      if (Math.abs(totalDebit - totalCredit) > 0.01) {
        return c.json({ error: "القيد غير متوازن" }, 400);
      }

      // Delete old lines
      await db.delete(journalEntryLines).where(eq(journalEntryLines.journalEntryId, id));

      // Insert new lines
      for (const line of body.lines) {
        const lineId = `jel_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
        await db.insert(journalEntryLines).values({
          id: lineId,
          journalEntryId: id,
          accountId: line.accountId,
          debit: line.debit || 0,
          credit: line.credit || 0,
          description: line.description?.trim() || null,
          costCenter: line.costCenter?.trim() || null,
        });
      }

      // Update totals
      await db
        .update(journalEntries)
        .set({ totalDebit, totalCredit })
        .where(eq(journalEntries.id, id));
    }

    const [updated] = await db.query.journalEntries.findMany({
      where: (e, { eq }) => eq(e.id, id),
    });
    const updatedLines = await db.query.journalEntryLines.findMany({
      where: (l, { eq }) => eq(l.journalEntryId, id),
    });

    return c.json({ ...updated, lines: updatedLines });
  } catch (e) {
    console.error("Error updating journal entry:", e);
    return c.json({ error: "فشل في تحديث القيد" }, 500);
  }
});

// Post (approve) entry - updates account balances
app.post("/:id/post", authMiddleware, async (c) => {
  try {
    const id = c.req.param("id");
    const user = c.get("user") as { id: string } | undefined;

    const [updated] = await db.transaction(async (tx) => {
      const [existing] = await tx.query.journalEntries.findMany({
        where: (e, { eq }) => eq(e.id, id),
      });
      if (!existing) return null;
      if (existing.status !== "draft") {
        throw new Error("القيد مرحل مسبقاً");
      }
      try {
        await assertPeriodNotLocked(existing.entryDate, tx);
      } catch (periodErr) {
        throw periodErr;
      }

      const lines = await tx.query.journalEntryLines.findMany({
        where: (l, { eq }) => eq(l.journalEntryId, id),
      });

      for (const line of lines) {
        const [account] = await tx.query.accounts.findMany({
          where: (a, { eq }) => eq(a.id, line.accountId),
        });
        if (account && account.nature) {
          const currentBalance = account.balance || 0;
          const newBalance =
            account.nature === "debit"
              ? currentBalance + (line.debit || 0) - (line.credit || 0)
              : currentBalance + (line.credit || 0) - (line.debit || 0);
          await tx
            .update(accountsTable)
            .set({ balance: newBalance })
            .where(eq(accountsTable.id, line.accountId));
        }
      }

      await tx
        .update(journalEntries)
        .set({
          status: "posted",
          postedBy: user?.userId || null,
          postedAt: new Date(),
        })
        .where(eq(journalEntries.id, id));

      const [u] = await tx.query.journalEntries.findMany({
        where: (e, { eq }) => eq(e.id, id),
      });
      return u;
    });

    if (!updated) return c.json({ error: "القيد غير موجود" }, 404);
    await logAuditEvent({
      eventType: "JOURNAL_POSTED",
      userId: user?.userId,
      entityType: "journal_entry",
      entityId: updated.id,
      entityName: updated.entryNumber,
    });
    return c.json(updated);
  } catch (e) {
    console.error("Error posting journal entry:", e);
    const msg = e instanceof Error ? e.message : "فشل في ترحيل القيد";
    return c.json({ error: msg }, 400);
  }
});

app.delete("/:id", authMiddleware, async (c) => {
  try {
    const id = c.req.param("id");

    const [existing] = await db.query.journalEntries.findMany({
      where: (e, { eq }) => eq(e.id, id),
    });
    if (!existing) {
      return c.json({ error: "القيد غير موجود" }, 404);
    }

    if (existing.status !== "draft") {
      return c.json({ error: "لا يمكن حذف قيد مرحل - استخدم قيد عكسي" }, 400);
    }

    // Delete lines first (cascade should handle this, but being explicit)
    await db.delete(journalEntryLines).where(eq(journalEntryLines.journalEntryId, id));

    // Delete entry
    await db.delete(journalEntries).where(eq(journalEntries.id, id));

    return c.json({ success: true });
  } catch (e) {
    console.error("Error deleting journal entry:", e);
    return c.json({ error: "فشل في حذف القيد" }, 500);
  }
});

const PERIOD_LOCK_CATEGORY = "accounting";
const PERIOD_LOCK_KEY = "period_lock_before";

app.get("/period-lock", authMiddleware, async (c) => {
  try {
    const date = await getPeriodLockBeforeDate();
    return c.json({ periodLockBefore: date });
  } catch (e) {
    console.error("Get period lock error:", e);
    return c.json({ error: "فشل في جلب إعداد القفل" }, 500);
  }
});

app.put("/period-lock", authMiddleware, async (c) => {
  try {
    const body = await c.req.json<{ periodLockBefore: string | null }>();
    const value = body.periodLockBefore?.trim() || null;
    const [existing] = await db
      .select()
      .from(systemSettings)
      .where(and(eq(systemSettings.category, PERIOD_LOCK_CATEGORY), eq(systemSettings.key, PERIOD_LOCK_KEY)))
      .limit(1);
    if (existing) {
      await db.update(systemSettings).set({ value, updatedAt: new Date() }).where(eq(systemSettings.id, existing.id));
    } else {
      await db.insert(systemSettings).values({
        id: `set_${nanoid(12)}`,
        category: PERIOD_LOCK_CATEGORY,
        key: PERIOD_LOCK_KEY,
        value,
        updatedAt: new Date(),
      });
    }
    return c.json({ success: true, periodLockBefore: value });
  } catch (e) {
    console.error("Set period lock error:", e);
    return c.json({ error: "فشل في حفظ إعداد القفل" }, 500);
  }
});

export default app;

import { Hono } from "hono";
import { db, vouchers as vouchersTable, cashRegisters, cashTransactions } from "@bi-management/database";
import { eq } from "drizzle-orm";
import { authMiddleware } from "../lib/auth.js";
import {
  ensureSystemAccounts,
  getAccountIdByCode,
  createAndPostJournalEntryWithTx,
  SYSTEM_ACCOUNT_CODES,
} from "../lib/accounting.js";
import { logAuditEvent } from "./audit.js";

const app = new Hono();

app.get("/", async (c) => {
  try {
    const page = Math.max(1, Number(c.req.query("page")) || 1);
    const limit = Math.min(100, Math.max(1, Number(c.req.query("limit")) || 20));
    const offset = (page - 1) * limit;

    const rows = await db.query.vouchers.findMany({
      columns: {
        id: true,
        voucherNumber: true,
        type: true,
        amount: true,
        currency: true,
        paymentMethod: true,
        description: true,
        createdAt: true,
      },
      where: (v, { eq }) => eq(v.isDeleted, 0),
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

app.get("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const [row] = await db.query.vouchers.findMany({
      where: (v, { eq }) => eq(v.id, id),
    });
    if (!row) return c.json({ error: "Voucher not found" }, 404);
    return c.json(row);
  } catch (e) {
    console.error(e);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.post("/", async (c) => {
  try {
    const user = c.get("user") as { id: string } | undefined;
    const body = await c.req.json<{
      type: string;
      amount: number;
      currency?: string;
      customerId?: string;
      supplierId?: string;
      paymentMethod?: string;
      bankAccountId?: string;
      cashRegisterId?: string;
      description?: string;
      notes?: string;
    }>();

    if (!body.type || !body.amount || body.amount <= 0) {
      return c.json({ error: "type and amount (positive) are required" }, 400);
    }

    const id = `vch_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
    const now = new Date();
    const voucherNumber = `VCH-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const amount = Number(body.amount);
    const entryDate = now.toISOString().slice(0, 10);
    const type = body.type.trim().toLowerCase();
    const isReceipt = type === "receipt" || type === "قبض";
    const useBank = (body.paymentMethod?.toLowerCase() === "bank" || body.bankAccountId) ?? false;
    const cashRegisterId = body.cashRegisterId?.trim() || null;

    const [created] = await db.transaction(async (tx) => {
      await tx.insert(vouchersTable).values({
        id,
        voucherNumber,
        type: body.type.trim(),
        amount,
        currency: body.currency?.trim() || "IQD",
        customerId: body.customerId?.trim() || null,
        supplierId: body.supplierId?.trim() || null,
        paymentMethod: body.paymentMethod?.trim() || null,
        bankAccountId: body.bankAccountId?.trim() || null,
        cashRegisterId: cashRegisterId || null,
        description: body.description?.trim() || null,
        notes: body.notes?.trim() || null,
        status: "posted",
        createdAt: now,
        isDeleted: 0,
        createdBy: user?.userId || null,
      });

      let journalEntryId: string | null = null;
      await ensureSystemAccounts(tx);
      const cashId = await getAccountIdByCode(tx, SYSTEM_ACCOUNT_CODES.CASH);
      const bankId = await getAccountIdByCode(tx, SYSTEM_ACCOUNT_CODES.BANK);
      const receivableId = await getAccountIdByCode(tx, SYSTEM_ACCOUNT_CODES.RECEIVABLE);
      const payableId = await getAccountIdByCode(tx, SYSTEM_ACCOUNT_CODES.PAYABLE);

      const moneyAccountId = useBank && bankId ? bankId : cashId;
      if (moneyAccountId && (isReceipt ? receivableId : payableId)) {
        journalEntryId = await createAndPostJournalEntryWithTx(tx, {
          entryDate,
          description: `سند ${isReceipt ? "قبض" : "صرف"} ${voucherNumber}`,
          referenceType: "voucher",
          referenceId: id,
          lines: isReceipt
            ? [
                { accountId: moneyAccountId, debit: amount, description: body.description || `قبض - ${voucherNumber}` },
                { accountId: receivableId!, credit: amount, description: body.description || `ذمم مدينة - ${voucherNumber}` },
              ]
            : [
                { accountId: payableId!, debit: amount, description: body.description || `ذمم دائنة - ${voucherNumber}` },
                { accountId: moneyAccountId, credit: amount, description: body.description || `صرف - ${voucherNumber}` },
              ],
          createdBy: user?.userId ?? null,
          postedBy: user?.userId ?? null,
        });
        await tx.update(vouchersTable).set({ journalEntryId }).where(eq(vouchersTable.id, id));
      }

      if (!useBank && cashRegisterId) {
        const [reg] = await tx.select().from(cashRegisters).where(eq(cashRegisters.id, cashRegisterId)).limit(1);
        if (reg) {
          const balanceBefore = reg.balance ?? 0;
          const balanceAfter = isReceipt ? balanceBefore + amount : balanceBefore - amount;
          await tx.insert(cashTransactions).values({
            id: `ct_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`,
            cashRegisterId,
            type: isReceipt ? "receipt" : "payment",
            amount,
            balanceBefore,
            balanceAfter,
            referenceType: "voucher",
            referenceId: id,
            description: body.description || `سند ${isReceipt ? "قبض" : "صرف"} ${voucherNumber}`,
            createdBy: user?.userId || null,
            createdAt: now,
          });
          await tx.update(cashRegisters).set({ balance: balanceAfter }).where(eq(cashRegisters.id, cashRegisterId));
        }
      }

      return await tx.query.vouchers.findMany({
        where: (v, { eq }) => eq(v.id, id),
        limit: 1,
      });
    });

    if (created?.[0]) {
      await logAuditEvent({
        eventType: "VOUCHER_CREATED",
        userId: user?.userId,
        entityType: "voucher",
        entityId: created[0].id,
        entityName: created[0].voucherNumber,
        newValue: { type: created[0].type, amount: created[0].amount },
      });
    }
    return c.json(created?.[0] ?? { id, voucherNumber, type: body.type, amount }, 201);
  } catch (e) {
    console.error(e);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

app.put("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const [existing] = await db.query.vouchers.findMany({
      where: (v, { and, eq }) => and(eq(v.id, id), eq(v.isDeleted, 0)),
    });
    if (!existing) return c.json({ error: "Voucher not found" }, 404);
    if (existing.status !== "draft") {
      return c.json({ error: "لا يمكن تعديل سند مرحل أو مقفل" }, 400);
    }

    const body = await c.req.json<{
      type?: string;
      amount?: number;
      currency?: string;
      paymentMethod?: string;
      description?: string;
      notes?: string;
    }>();

    await db.update(vouchersTable).set({
      type: body.type?.trim() || existing.type,
      amount: body.amount ?? existing.amount,
      currency: body.currency?.trim() ?? existing.currency,
      paymentMethod: body.paymentMethod?.trim() ?? existing.paymentMethod,
      description: body.description?.trim() ?? existing.description,
      notes: body.notes?.trim() ?? existing.notes,
    }).where(eq(vouchersTable.id, id));

    const [updated] = await db.query.vouchers.findMany({
      where: (v, { eq }) => eq(v.id, id),
    });
    return c.json(updated);
  } catch (e) {
    console.error(e);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

app.delete("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const [existing] = await db.query.vouchers.findMany({
      where: (v, { and, eq }) => and(eq(v.id, id), eq(v.isDeleted, 0)),
    });
    if (!existing) return c.json({ error: "Voucher not found" }, 404);
    if (existing.status !== "draft") {
      return c.json({ error: "لا يمكن حذف سند مرحل أو مقفل" }, 400);
    }

    await db.update(vouchersTable).set({ isDeleted: 1, deletedAt: new Date() }).where(eq(vouchersTable.id, id));
    return c.json({ success: true });
  } catch (e) {
    console.error(e);
    return c.json({ error: "فشل في حذف السجل" }, 500);
  }
});

export default app;

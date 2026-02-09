import { Hono } from "hono";
import {
  db,
  invoices as invoicesTable,
  invoiceItems as invoiceItemsTable,
  products as productsTable,
  returns as returnsTable,
} from "@bi-management/database";
import { authMiddleware } from "../lib/auth.js";
import { eq, count } from "drizzle-orm";
import {
  ensureSystemAccounts,
  getAccountIdByCode,
  createAndPostJournalEntryWithTx,
  SYSTEM_ACCOUNT_CODES,
} from "../lib/accounting.js";
import { logAuditEvent } from "./audit.js";

const app = new Hono();

app.get("/", authMiddleware, async (c) => {
  try {
    const page = Math.max(1, Number(c.req.query("page")) || 1);
    const limit = Math.min(100, Math.max(1, Number(c.req.query("limit")) || 20));
    const offset = (page - 1) * limit;

    const [totalResult] = await db
      .select({ count: count() })
      .from(invoicesTable)
      .where(eq(invoicesTable.isDeleted, 0));
    const total = Number(totalResult?.count ?? 0);

    const rows = await db.query.invoices.findMany({
      columns: {
        id: true,
        invoiceNumber: true,
        type: true,
        paymentType: true,
        total: true,
        status: true,
        paymentStatus: true,
        paidAmount: true,
        remainingAmount: true,
        createdAt: true,
      },
      where: (inv, { eq }) => eq(inv.isDeleted, 0),
      limit,
      offset,
    });

    return c.json({
      data: rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (e) {
    console.error("Error fetching invoices:", e);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.get("/:id", authMiddleware, async (c) => {
  try {
    const id = c.req.param("id");
    const [inv] = await db.query.invoices.findMany({
      where: (i, { eq }) => eq(i.id, id),
    });
    if (!inv) return c.json({ error: "Invoice not found" }, 404);
    const items = await db.query.invoiceItems.findMany({
      where: (item, { eq }) => eq(item.invoiceId, id),
    });
    return c.json({ ...inv, items });
  } catch (e) {
    console.error("Error fetching invoice:", e);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.post("/", authMiddleware, async (c) => {
  try {
    const user = c.get("user");
    const body = await c.req.json<{
      type: string;
      paymentType?: string;
      customerId?: string;
      supplierId?: string;
      branchId?: string;
      warehouseId?: string;
      notes?: string;
      items: { productId?: string; description?: string; quantity: number; unitPrice: number }[];
    }>();
    if (!body.type?.trim()) return c.json({ error: "type required" }, 400);
    if (!body.items || body.items.length === 0) return c.json({ error: "items required" }, 400);

    const id = `inv_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
    const now = new Date();
    const invoiceNumber = `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    let subtotal = 0;
    for (const item of body.items) {
      subtotal += (item.quantity ?? 1) * (item.unitPrice ?? 0);
    }
    const total = subtotal;
    const entryDate = now.toISOString().slice(0, 10);

    const [created, createdItems] = await db.transaction(async (tx) => {
      // 1) Validate stock for each item with productId
      for (const item of body.items) {
        const productId = item.productId?.trim();
        if (!productId) continue;
        const qty = item.quantity ?? 1;
        const [product] = await tx.query.products.findMany({
          columns: { id: true, quantity: true, name: true },
          where: (p, { eq }) => eq(p.id, productId),
          limit: 1,
        });
        if (!product) {
          throw new Error(`المنتج غير موجود: ${productId}`);
        }
        const available = product.quantity ?? 0;
        if (available < qty) {
          throw new Error(
            `الكمية غير متوفرة للمنتج ${product.name || productId}: المطلوب ${qty}، المتوفر ${available}`
          );
        }
      }

      // 2) Insert invoice and items
      await tx.insert(invoicesTable).values({
        id,
        invoiceNumber,
        type: body.type.trim(),
        paymentType: body.paymentType?.trim() || null,
        customerId: body.customerId?.trim() || null,
        supplierId: body.supplierId?.trim() || null,
        branchId: body.branchId?.trim() || null,
        warehouseId: body.warehouseId?.trim() || null,
        subtotal,
        total,
        remainingAmount: total,
        status: "confirmed",
        paymentStatus: "pending",
        notes: body.notes?.trim() || null,
        isDeleted: 0,
        createdBy: user?.userId || null,
      });

      for (const item of body.items) {
        const itemId = `itm_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
        const itemTotal = (item.quantity ?? 1) * (item.unitPrice ?? 0);
        await tx.insert(invoiceItemsTable).values({
          id: itemId,
          invoiceId: id,
          productId: item.productId?.trim() || null,
          description: item.description?.trim() || null,
          quantity: item.quantity ?? 1,
          unitPrice: item.unitPrice ?? 0,
          total: itemTotal,
        });
      }

      // 3) Create and post journal entry (debit Receivable, credit Sales)
      await ensureSystemAccounts(tx);
      const receivableId = await getAccountIdByCode(tx, SYSTEM_ACCOUNT_CODES.RECEIVABLE);
      const salesId = await getAccountIdByCode(tx, SYSTEM_ACCOUNT_CODES.SALES);
      if (receivableId && salesId && total > 0) {
        const journalEntryId = await createAndPostJournalEntryWithTx(tx, {
          entryDate,
          description: `فاتورة مبيعات ${invoiceNumber}`,
          referenceType: "invoice",
          referenceId: id,
          lines: [
            { accountId: receivableId, debit: total, description: `ذمم مدينة - فاتورة ${invoiceNumber}` },
            { accountId: salesId, credit: total, description: `إيرادات مبيعات - فاتورة ${invoiceNumber}` },
          ],
          createdBy: user?.userId ?? null,
          postedBy: user?.userId ?? null,
        });
        await tx
          .update(invoicesTable)
          .set({ journalEntryId })
          .where(eq(invoicesTable.id, id));
      }

      // 4) Decrease product quantities
      for (const item of body.items) {
        const productId = item.productId?.trim();
        if (!productId) continue;
        const qty = item.quantity ?? 1;
        const [product] = await tx.query.products.findMany({
          columns: { quantity: true },
          where: (p, { eq }) => eq(p.id, productId),
          limit: 1,
        });
        if (product) {
          const newQty = Math.max(0, (product.quantity ?? 0) - qty);
          await tx
            .update(productsTable)
            .set({ quantity: newQty })
            .where(eq(productsTable.id, productId));
        }
      }

      const inv = await tx.query.invoices.findMany({
        where: (i, { eq }) => eq(i.id, id),
        limit: 1,
      });
      const items = await tx.query.invoiceItems.findMany({
        where: (item, { eq }) => eq(item.invoiceId, id),
      });
      return [inv[0], items] as const;
    });

    if (!created) {
      return c.json({ error: "فشل في إنشاء الفاتورة" }, 500);
    }
    await logAuditEvent({
      eventType: "INVOICE_CREATED",
      userId: user?.userId,
      entityType: "invoice",
      entityId: created.id,
      entityName: created.invoiceNumber,
      newValue: { total: created.total, itemsCount: createdItems.length },
    });
    return c.json({ ...created, items: createdItems }, 201);
  } catch (e) {
    console.error("Error creating invoice:", e);
    const message = e instanceof Error ? e.message : "فشل في إنشاء الفاتورة";
    return c.json({ error: message }, 500);
  }
});

app.put("/:id", authMiddleware, async (c) => {
  try {
    const id = c.req.param("id");
    const [existing] = await db.query.invoices.findMany({
      where: (i, { and, eq }) => and(eq(i.id, id), eq(i.isDeleted, 0)),
    });
    if (!existing) return c.json({ error: "Invoice not found" }, 404);

    const body = await c.req.json<{
      type?: string;
      paymentType?: string;
      notes?: string;
      items?: { productId?: string; description?: string; quantity: number; unitPrice: number }[];
    }>();

    let subtotal = existing.subtotal;
    let total = existing.total;

    await db.transaction(async (tx) => {
      if (body.items && body.items.length > 0) {
        await tx.delete(invoiceItemsTable).where(eq(invoiceItemsTable.invoiceId, id));

        subtotal = 0;
        for (const item of body.items) {
          subtotal += (item.quantity ?? 1) * (item.unitPrice ?? 0);
        }
        total = subtotal;

        for (const item of body.items) {
          const itemId = `itm_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
          const itemTotal = (item.quantity ?? 1) * (item.unitPrice ?? 0);
          await tx.insert(invoiceItemsTable).values({
            id: itemId,
            invoiceId: id,
            productId: item.productId?.trim() || null,
            description: item.description?.trim() || null,
            quantity: item.quantity ?? 1,
            unitPrice: item.unitPrice ?? 0,
            total: itemTotal,
          });
        }
      }

      await tx.update(invoicesTable).set({
      type: body.type?.trim() || existing.type,
      paymentType: body.paymentType?.trim() ?? existing.paymentType,
      notes: body.notes?.trim() ?? existing.notes,
      subtotal,
      total,
      remainingAmount: total - (existing.paidAmount ?? 0),
      updatedAt: new Date(),
      }).where(eq(invoicesTable.id, id));
    });

    const [updated] = await db.query.invoices.findMany({
      where: (i, { eq }) => eq(i.id, id),
    });
    const updatedItems = await db.query.invoiceItems.findMany({
      where: (item, { eq }) => eq(item.invoiceId, id),
    });

    return c.json({ ...updated, items: updatedItems });
  } catch (e) {
    console.error("Error updating invoice:", e);
    return c.json({ error: "فشل في تحديث الفاتورة" }, 500);
  }
});

app.post("/:id/return", authMiddleware, async (c) => {
  try {
    const user = c.get("user");
    const id = c.req.param("id");
    const body = await c.req.json<{
      amount: number;
      notes?: string;
      items?: { productId: string; quantity: number }[];
    }>();
    const returnAmount = Number(body.amount) || 0;
    if (returnAmount <= 0) return c.json({ error: "amount must be positive" }, 400);

    const result = await db.transaction(async (tx) => {
      const [inv] = await tx.query.invoices.findMany({
        where: (i, { and, eq }) => and(eq(i.id, id), eq(i.isDeleted, 0)),
        limit: 1,
      });
      if (!inv) throw new Error("الفاتورة غير موجودة");
      const remaining = Number(inv.remainingAmount) ?? 0;
      if (returnAmount > remaining) {
        throw new Error(`مبلغ المرتجع (${returnAmount}) أكبر من المتبقي (${remaining})`);
      }

      const returnId = `ret_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
      const returnNumber = `RET-INV-${inv.invoiceNumber}-${Date.now().toString(36).toUpperCase()}`;
      await tx.insert(returnsTable).values({
        id: returnId,
        returnNumber,
        customerId: inv.customerId,
        invoiceId: id,
        returnDate: new Date(),
        status: "completed",
        totalAmount: String(returnAmount),
        notes: body.notes?.trim() || null,
        createdBy: user?.userId || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await ensureSystemAccounts(tx);
      const receivableId = await getAccountIdByCode(tx, SYSTEM_ACCOUNT_CODES.RECEIVABLE);
      const salesId = await getAccountIdByCode(tx, SYSTEM_ACCOUNT_CODES.SALES);
      if (receivableId && salesId) {
        await createAndPostJournalEntryWithTx(tx, {
          entryDate: new Date().toISOString().slice(0, 10),
          description: `مرتجع مبيعات - فاتورة ${inv.invoiceNumber}`,
          referenceType: "return",
          referenceId: returnId,
          lines: [
            { accountId: salesId, debit: returnAmount, description: `عكس إيرادات - مرتجع ${returnNumber}` },
            { accountId: receivableId, credit: returnAmount, description: `عكس ذمم مدينة - مرتجع ${returnNumber}` },
          ],
          createdBy: user?.userId ?? null,
          postedBy: user?.userId ?? null,
        });
      }

      const newRemaining = remaining - returnAmount;
      await tx
        .update(invoicesTable)
        .set({
          remainingAmount: newRemaining,
          updatedAt: new Date(),
        })
        .where(eq(invoicesTable.id, id));

      for (const item of body.items || []) {
        const productId = item.productId?.trim();
        if (!productId || !(item.quantity > 0)) continue;
        const [p] = await tx.select({ quantity: productsTable.quantity }).from(productsTable).where(eq(productsTable.id, productId)).limit(1);
        if (p) {
          const current = p.quantity ?? 0;
          await tx.update(productsTable).set({ quantity: current + item.quantity }).where(eq(productsTable.id, productId));
        }
      }

      return { returnId, returnNumber, newRemaining };
    });

    return c.json({
      success: true,
      returnId: result.returnId,
      returnNumber: result.returnNumber,
      newRemaining: result.newRemaining,
    }, 201);
  } catch (e) {
    console.error("Error processing return:", e);
    const message = e instanceof Error ? e.message : "فشل في تسجيل المرتجع";
    return c.json({ error: message }, 400);
  }
});

app.delete("/:id", authMiddleware, async (c) => {
  try {
    const id = c.req.param("id");
    const [existing] = await db.query.invoices.findMany({
      where: (i, { eq }) => eq(i.id, id),
    });
    if (!existing) return c.json({ error: "Invoice not found" }, 404);
    await db
      .update(invoicesTable)
      .set({ isDeleted: 1, deletedAt: new Date() })
      .where(eq(invoicesTable.id, id));
    return c.json({ success: true });
  } catch (e) {
    console.error("Error deleting invoice:", e);
    return c.json({ error: "فشل في حذف الفاتورة" }, 500);
  }
});

export default app;

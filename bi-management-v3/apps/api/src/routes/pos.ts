import { Hono } from "hono";
import { db, posTerminals, posSessions, posTransactions, posTransactionItems, posCashMovements, products, customers, users, branches } from "@bi-management/database";
import { eq, desc, sql, and, gte, lte } from "drizzle-orm";
import { authMiddleware } from "../lib/auth.js";

const app = new Hono();

// ==================== TERMINALS ====================

// GET /pos/terminals - List terminals
app.get("/terminals", async (c) => {
  try {
    const items = await db
      .select({
        terminal: posTerminals,
        branch: branches,
      })
      .from(posTerminals)
      .leftJoin(branches, eq(posTerminals.branchId, branches.id));

    return c.json({
      items: items.map((row) => ({
        ...row.terminal,
        branch: row.branch ? { id: row.branch.id, name: row.branch.name } : null,
      })),
    });
  } catch (error) {
    console.error("Error in GET /pos/terminals:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

// POST /pos/terminals - Create terminal
app.post("/terminals", async (c) => {
  try {
    const body = await c.req.json();
    const id = crypto.randomUUID();
    const code = `POS-${Date.now().toString(36).toUpperCase()}`;

    await db.insert(posTerminals).values({
      id,
      code,
      name: body.name,
      branchId: body.branchId,
      receiptHeader: body.receiptHeader,
      receiptFooter: body.receiptFooter,
      status: "active",
    });

    return c.json({ id, code }, 201);
  } catch (error) {
    console.error("Error in POST /pos/terminals:", error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

// ==================== SESSIONS ====================

// GET /pos/sessions - List sessions
app.get("/sessions", async (c) => {
  try {
    const { status, cashierId, limit = "50" } = c.req.query();

    let query = db
      .select({
        session: posSessions,
        cashier: users,
        terminal: posTerminals,
      })
      .from(posSessions)
      .leftJoin(users, eq(posSessions.cashierId, users.id))
      .leftJoin(posTerminals, eq(posSessions.terminalId, posTerminals.id));

    const conditions = [];
    if (status) conditions.push(eq(posSessions.status, status));
    if (cashierId) conditions.push(eq(posSessions.cashierId, cashierId));

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query;
    }

    const items = await query.orderBy(desc(posSessions.openedAt)).limit(parseInt(limit));

    return c.json({
      items: items.map((row) => ({
        ...row.session,
        cashier: row.cashier ? { id: row.cashier.id, name: row.cashier.name } : null,
        terminal: row.terminal ? { id: row.terminal.id, name: row.terminal.name, code: row.terminal.code } : null,
      })),
    });
  } catch (error) {
    console.error("Error in GET /pos/sessions:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

// GET /pos/sessions/current - Get current open session for user
app.get("/sessions/current", async (c) => {
  try {
    const { cashierId } = c.req.query();

    if (!cashierId) return c.json({ error: "cashierId required" }, 400);

    const [session] = await db
      .select({
        session: posSessions,
        terminal: posTerminals,
      })
      .from(posSessions)
      .leftJoin(posTerminals, eq(posSessions.terminalId, posTerminals.id))
      .where(and(eq(posSessions.cashierId, cashierId), eq(posSessions.status, "open")))
      .orderBy(desc(posSessions.openedAt))
      .limit(1);

    if (!session) return c.json({ session: null });

    return c.json({
      session: {
        ...session.session,
        terminal: session.terminal,
      },
    });
  } catch (error) {
    console.error("Error in GET /pos/sessions/current:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

// POST /pos/sessions/open - Open new session
app.post("/sessions/open", async (c) => {
  try {
    const body = await c.req.json();
    const id = crypto.randomUUID();
    const code = `SES-${Date.now().toString(36).toUpperCase()}`;

    // Check if user has an open session
    const [existing] = await db
      .select()
      .from(posSessions)
      .where(and(eq(posSessions.cashierId, body.cashierId), eq(posSessions.status, "open")));

    if (existing) {
      return c.json({ error: "User already has an open session", sessionId: existing.id }, 400);
    }

    await db.insert(posSessions).values({
      id,
      code,
      terminalId: body.terminalId,
      branchId: body.branchId,
      cashierId: body.cashierId,
      openingCash: body.openingCash || 0,
      status: "open",
    });

    return c.json({ id, code }, 201);
  } catch (error) {
    console.error("Error in POST /pos/sessions/open:", error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

// POST /pos/sessions/:id/close - Close session
app.post("/sessions/:id/close", async (c) => {
  try {
    const { id } = c.req.param();
    const body = await c.req.json();

    const [session] = await db.select().from(posSessions).where(eq(posSessions.id, id));
    if (!session) return c.json({ error: "Session not found" }, 404);

    // Calculate expected cash
    const expectedCash = (session.openingCash || 0) + (session.cashPayments || 0);
    const closingCash = body.closingCash || 0;
    const difference = closingCash - expectedCash;

    await db
      .update(posSessions)
      .set({
        status: "closed",
        closedAt: new Date(),
        closingCash,
        expectedCash,
        cashDifference: difference,
        closingNotes: body.notes,
      })
      .where(eq(posSessions.id, id));

    return c.json({ success: true, expectedCash, difference });
  } catch (error) {
    console.error("Error in POST /pos/sessions/:id/close:", error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

// ==================== TRANSACTIONS ====================

// GET /pos/transactions - List transactions
app.get("/transactions", async (c) => {
  try {
    const { sessionId, status, limit = "50" } = c.req.query();

    let query = db
      .select({
        transaction: posTransactions,
        customer: customers,
        cashier: users,
      })
      .from(posTransactions)
      .leftJoin(customers, eq(posTransactions.customerId, customers.id))
      .leftJoin(users, eq(posTransactions.cashierId, users.id));

    const conditions = [];
    if (sessionId) conditions.push(eq(posTransactions.sessionId, sessionId));
    if (status) conditions.push(eq(posTransactions.status, status));

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query;
    }

    const items = await query.orderBy(desc(posTransactions.createdAt)).limit(parseInt(limit));

    return c.json({
      items: items.map((row) => ({
        ...row.transaction,
        customer: row.customer ? { id: row.customer.id, name: row.customer.name } : null,
        cashier: row.cashier ? { id: row.cashier.id, name: row.cashier.name } : null,
      })),
    });
  } catch (error) {
    console.error("Error in GET /pos/transactions:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

// GET /pos/transactions/:id - Get transaction details
app.get("/transactions/:id", async (c) => {
  try {
    const { id } = c.req.param();

    const [transaction] = await db
      .select({
        transaction: posTransactions,
        customer: customers,
        cashier: users,
      })
      .from(posTransactions)
      .leftJoin(customers, eq(posTransactions.customerId, customers.id))
      .leftJoin(users, eq(posTransactions.cashierId, users.id))
      .where(eq(posTransactions.id, id));

    if (!transaction) return c.json({ error: "Transaction not found" }, 404);

    // Get items
    const items = await db
      .select()
      .from(posTransactionItems)
      .where(eq(posTransactionItems.transactionId, id));

    return c.json({
      ...transaction.transaction,
      customer: transaction.customer,
      cashier: transaction.cashier,
      items,
    });
  } catch (error) {
    console.error("Error in GET /pos/transactions/:id:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

// POST /pos/transactions - Create transaction (sale)
app.post("/transactions", async (c) => {
  try {
    const body = await c.req.json();
    const id = crypto.randomUUID();
    const code = `TXN-${Date.now().toString(36).toUpperCase()}`;

    // Calculate totals
    let subtotal = 0;
    const items = body.items || [];
    for (const item of items) {
      const itemTotal = item.quantity * item.unitPrice - (item.discountAmount || 0);
      subtotal += itemTotal;
    }

    const discountAmount = body.discountAmount || 0;
    const taxAmount = body.taxAmount || 0;
    const total = subtotal - discountAmount + taxAmount;

    // Create transaction
    await db.insert(posTransactions).values({
      id,
      code,
      sessionId: body.sessionId,
      terminalId: body.terminalId,
      branchId: body.branchId,
      cashierId: body.cashierId,
      customerId: body.customerId,
      transactionType: body.transactionType || "sale",
      subtotal,
      discountAmount,
      discountPercent: body.discountPercent,
      taxAmount,
      total,
      paymentMethod: body.paymentMethod || "cash",
      cashReceived: body.cashReceived,
      changeAmount: body.cashReceived ? body.cashReceived - total : 0,
      cardAmount: body.cardAmount,
      cardReference: body.cardReference,
      status: "completed",
      notes: body.notes,
    });

    // Create items
    for (const item of items) {
      const itemTotal = item.quantity * item.unitPrice - (item.discountAmount || 0);
      await db.insert(posTransactionItems).values({
        id: crypto.randomUUID(),
        transactionId: id,
        productId: item.productId,
        productName: item.productName,
        productCode: item.productCode,
        barcode: item.barcode,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discountAmount: item.discountAmount || 0,
        discountPercent: item.discountPercent,
        taxAmount: item.taxAmount || 0,
        total: itemTotal,
      });
    }

    // Update session totals
    const isCash = body.paymentMethod === "cash" || body.paymentMethod === "mixed";
    const isCard = body.paymentMethod === "card" || body.paymentMethod === "mixed";

    await db
      .update(posSessions)
      .set({
        totalSales: sql`${posSessions.totalSales} + ${total}`,
        totalDiscount: sql`${posSessions.totalDiscount} + ${discountAmount}`,
        transactionCount: sql`${posSessions.transactionCount} + 1`,
        cashPayments: isCash ? sql`${posSessions.cashPayments} + ${body.cashReceived || total}` : posSessions.cashPayments,
        cardPayments: isCard ? sql`${posSessions.cardPayments} + ${body.cardAmount || 0}` : posSessions.cardPayments,
      })
      .where(eq(posSessions.id, body.sessionId));

    return c.json({ id, code, total, change: body.cashReceived ? body.cashReceived - total : 0 }, 201);
  } catch (error) {
    console.error("Error in POST /pos/transactions:", error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

// POST /pos/transactions/:id/void - Void transaction
app.post("/transactions/:id/void", async (c) => {
  try {
    const { id } = c.req.param();
    const body = await c.req.json();

    const [transaction] = await db.select().from(posTransactions).where(eq(posTransactions.id, id));
    if (!transaction) return c.json({ error: "Transaction not found" }, 404);

    await db
      .update(posTransactions)
      .set({
        status: "voided",
        voidedAt: new Date(),
        voidedBy: body.userId,
        voidReason: body.reason,
      })
      .where(eq(posTransactions.id, id));

    // Update session totals (reverse)
    await db
      .update(posSessions)
      .set({
        totalSales: sql`${posSessions.totalSales} - ${transaction.total}`,
        totalDiscount: sql`${posSessions.totalDiscount} - ${transaction.discountAmount}`,
        transactionCount: sql`${posSessions.transactionCount} - 1`,
      })
      .where(eq(posSessions.id, transaction.sessionId || ""));

    return c.json({ success: true });
  } catch (error) {
    console.error("Error in POST /pos/transactions/:id/void:", error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

// ==================== PRODUCTS SEARCH ====================

// GET /pos/products/search - Search products for POS
app.get("/products/search", async (c) => {
  try {
    const { q, barcode, limit = "20" } = c.req.query();

    let query = db.select().from(products).where(eq(products.isActive, 1));

    if (barcode) {
      const items = await db.select().from(products).where(eq(products.barcode, barcode)).limit(1);
      return c.json({ items });
    }

    if (q) {
      const items = await db
        .select()
        .from(products)
        .where(
          and(
            eq(products.isActive, 1),
            sql`(${products.name} ILIKE ${"%" + q + "%"} OR ${products.code} ILIKE ${"%" + q + "%"} OR ${products.barcode} ILIKE ${"%" + q + "%"})`
          )
        )
        .limit(parseInt(limit));

      return c.json({ items });
    }

    const items = await db.select().from(products).where(eq(products.isActive, 1)).limit(parseInt(limit));
    return c.json({ items });
  } catch (error) {
    console.error("Error in GET /pos/products/search:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

// ==================== CASH MOVEMENTS ====================

// POST /pos/cash-movement - Record cash in/out
app.post("/cash-movement", async (c) => {
  try {
    const body = await c.req.json();
    const id = crypto.randomUUID();

    await db.insert(posCashMovements).values({
      id,
      sessionId: body.sessionId,
      movementType: body.movementType,
      amount: body.amount,
      reason: body.reason,
      reference: body.reference,
      performedBy: body.performedBy,
      approvedBy: body.approvedBy,
    });

    // Update session if cash in/out
    if (body.movementType === "cash_in") {
      await db
        .update(posSessions)
        .set({ cashPayments: sql`${posSessions.cashPayments} + ${body.amount}` })
        .where(eq(posSessions.id, body.sessionId));
    } else if (body.movementType === "cash_out") {
      await db
        .update(posSessions)
        .set({ cashPayments: sql`${posSessions.cashPayments} - ${body.amount}` })
        .where(eq(posSessions.id, body.sessionId));
    }

    return c.json({ id }, 201);
  } catch (error) {
    console.error("Error in POST /pos/cash-movement:", error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

// ==================== STATS ====================

// GET /pos/stats - Get POS stats for today
app.get("/stats", async (c) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [stats] = await db
      .select({
        totalSales: sql<number>`coalesce(sum(${posTransactions.total}), 0)`,
        transactionCount: sql<number>`count(*)`,
        avgTransaction: sql<number>`coalesce(avg(${posTransactions.total}), 0)`,
      })
      .from(posTransactions)
      .where(and(eq(posTransactions.status, "completed"), gte(posTransactions.createdAt, today)));

    const [sessionStats] = await db
      .select({
        openSessions: sql<number>`count(*) filter (where ${posSessions.status} = 'open')`,
        closedToday: sql<number>`count(*) filter (where ${posSessions.status} = 'closed' and ${posSessions.closedAt} >= ${today})`,
      })
      .from(posSessions);

    return c.json({
      ...stats,
      ...sessionStats,
    });
  } catch (error) {
    console.error("Error in GET /pos/stats:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

export default app;

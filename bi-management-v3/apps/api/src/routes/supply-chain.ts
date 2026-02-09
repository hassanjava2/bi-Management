import { Hono } from "hono";
import { db, purchaseRequisitions, purchaseOrders, reorderPoints, products, suppliers, users } from "@bi-management/database";
import { eq, desc, sql } from "drizzle-orm";
import { authMiddleware } from "../lib/auth.js";

const app = new Hono();

app.get("/requisitions", async (c) => {
  try {
    const { status, limit = "50" } = c.req.query();
    let query = db.select({ requisition: purchaseRequisitions, requester: users }).from(purchaseRequisitions).leftJoin(users, eq(purchaseRequisitions.requestedBy, users.id));
    if (status) query = query.where(eq(purchaseRequisitions.status, status)) as typeof query;
    const items = await query.orderBy(desc(purchaseRequisitions.createdAt)).limit(parseInt(limit));
    return c.json({ items: items.map((row) => ({ ...row.requisition, requester: row.requester ? { id: row.requester.id, name: row.requester.name } : null })) });
  } catch (error) {
    console.error(error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.post("/requisitions", async (c) => {
  try {
    const body = await c.req.json();
    const id = crypto.randomUUID();
    const code = `REQ-${Date.now().toString(36).toUpperCase()}`;
    await db.insert(purchaseRequisitions).values({ id, code, requestedBy: body.requestedBy, departmentId: body.departmentId, status: "draft", priority: body.priority || "normal", requiredDate: body.requiredDate, purpose: body.purpose, notes: body.notes });
    return c.json({ id, code }, 201);
  } catch (error) {
    console.error(error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

app.get("/orders", async (c) => {
  try {
    const { status, limit = "50" } = c.req.query();
    let query = db.select({ order: purchaseOrders, supplier: suppliers }).from(purchaseOrders).leftJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id));
    if (status) query = query.where(eq(purchaseOrders.status, status)) as typeof query;
    const items = await query.orderBy(desc(purchaseOrders.createdAt)).limit(parseInt(limit));
    return c.json({ items: items.map((row) => ({ ...row.order, supplier: row.supplier ? { id: row.supplier.id, name: row.supplier.name } : null })) });
  } catch (error) {
    console.error(error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.get("/orders/stats", async (c) => {
  try {
    const [stats] = await db.select({ total: sql<number>`count(*)`, draft: sql<number>`count(*) filter (where ${purchaseOrders.status} = 'draft')`, sent: sql<number>`count(*) filter (where ${purchaseOrders.status} = 'sent')`, received: sql<number>`count(*) filter (where ${purchaseOrders.status} = 'received')`, totalValue: sql<number>`coalesce(sum(${purchaseOrders.total}), 0)` }).from(purchaseOrders);
    return c.json(stats);
  } catch (error) {
    console.error(error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.post("/orders", async (c) => {
  try {
    const body = await c.req.json();
    const id = crypto.randomUUID();
    const code = `PO-${Date.now().toString(36).toUpperCase()}`;
    await db.insert(purchaseOrders).values({ id, code, requisitionId: body.requisitionId, supplierId: body.supplierId, warehouseId: body.warehouseId, status: "draft", orderDate: body.orderDate, expectedDate: body.expectedDate, subtotal: body.subtotal || 0, total: body.total || 0, paymentTerms: body.paymentTerms, notes: body.notes, createdBy: body.createdBy });
    return c.json({ id, code }, 201);
  } catch (error) {
    console.error(error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

app.get("/alerts", async (c) => {
  try {
    const alerts = await db.select({ reorder: reorderPoints, product: products }).from(reorderPoints).leftJoin(products, eq(reorderPoints.productId, products.id)).where(eq(reorderPoints.isActive, 1));
    return c.json({ items: alerts, total: alerts.length });
  } catch (error) {
    console.error(error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

export default app;

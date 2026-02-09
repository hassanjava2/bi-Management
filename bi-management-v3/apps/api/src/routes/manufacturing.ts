import { Hono } from "hono";
import { db, billOfMaterials, bomItems, workCenters, productionOrders, productionOperations, qualityChecks, products, users } from "@bi-management/database";
import { eq, desc, sql, and } from "drizzle-orm";
import { authMiddleware } from "../lib/auth.js";

const app = new Hono();

// ==================== BILL OF MATERIALS ====================

app.get("/bom", async (c) => {
  try {
    const { status, limit = "50" } = c.req.query();

    let query = db
      .select({
        bom: billOfMaterials,
        product: products,
      })
      .from(billOfMaterials)
      .leftJoin(products, eq(billOfMaterials.productId, products.id));

    if (status) {
      query = query.where(eq(billOfMaterials.status, status)) as typeof query;
    }

    const items = await query.orderBy(desc(billOfMaterials.createdAt)).limit(parseInt(limit));

    return c.json({
      items: items.map((row) => ({
        ...row.bom,
        product: row.product ? { id: row.product.id, name: row.product.name, code: row.product.code } : null,
      })),
    });
  } catch (error) {
    console.error("Error in GET /bom:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.get("/bom/:id", async (c) => {
  try {
    const { id } = c.req.param();

    const [bom] = await db
      .select({
        bom: billOfMaterials,
        product: products,
      })
      .from(billOfMaterials)
      .leftJoin(products, eq(billOfMaterials.productId, products.id))
      .where(eq(billOfMaterials.id, id));

    if (!bom) return c.json({ error: "BOM not found" }, 404);

    const components = await db
      .select({
        item: bomItems,
        product: products,
      })
      .from(bomItems)
      .leftJoin(products, eq(bomItems.productId, products.id))
      .where(eq(bomItems.bomId, id))
      .orderBy(bomItems.sortOrder);

    return c.json({
      ...bom.bom,
      product: bom.product,
      components: components.map((c) => ({
        ...c.item,
        product: c.product,
      })),
    });
  } catch (error) {
    console.error("Error in GET /bom/:id:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.post("/bom", async (c) => {
  try {
    const body = await c.req.json();
    const id = crypto.randomUUID();
    const code = `BOM-${Date.now().toString(36).toUpperCase()}`;

    await db.insert(billOfMaterials).values({
      id,
      code,
      productId: body.productId,
      name: body.name,
      version: body.version || "1.0",
      status: "draft",
      quantity: body.quantity || 1,
      laborHours: body.laborHours,
      machineHours: body.machineHours,
      leadTimeDays: body.leadTimeDays,
      notes: body.notes,
      createdBy: body.createdBy,
    });

    return c.json({ id, code }, 201);
  } catch (error) {
    console.error("Error in POST /bom:", error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

app.post("/bom/:id/items", async (c) => {
  try {
    const { id } = c.req.param();
    const body = await c.req.json();
    const itemId = crypto.randomUUID();

    await db.insert(bomItems).values({
      id: itemId,
      bomId: id,
      productId: body.productId,
      itemType: body.itemType || "material",
      quantity: body.quantity,
      unitCost: body.unitCost,
      wastePercent: body.wastePercent || 0,
      sortOrder: body.sortOrder || 0,
    });

    return c.json({ id: itemId }, 201);
  } catch (error) {
    console.error("Error in POST /bom/:id/items:", error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

// ==================== WORK CENTERS ====================

app.get("/work-centers", async (c) => {
  const items = await db.select().from(workCenters).where(eq(workCenters.isActive, 1));
  return c.json({ items });
});

app.post("/work-centers", async (c) => {
  const body = await c.req.json();
  const id = crypto.randomUUID();
  const code = `WC-${Date.now().toString(36).toUpperCase()}`;

  await db.insert(workCenters).values({
    id,
    code,
    name: body.name,
    description: body.description,
    capacityPerHour: body.capacityPerHour,
    efficiency: body.efficiency || 100,
    hourlyRate: body.hourlyRate,
    overheadRate: body.overheadRate,
    isActive: 1,
  });

  return c.json({ id, code }, 201);
});

// ==================== PRODUCTION ORDERS ====================

app.get("/orders", async (c) => {
  const { status, limit = "50" } = c.req.query();

  let query = db
    .select({
      order: productionOrders,
      product: products,
      bom: billOfMaterials,
    })
    .from(productionOrders)
    .leftJoin(products, eq(productionOrders.productId, products.id))
    .leftJoin(billOfMaterials, eq(productionOrders.bomId, billOfMaterials.id));

  if (status) {
    query = query.where(eq(productionOrders.status, status)) as typeof query;
  }

  const items = await query.orderBy(desc(productionOrders.createdAt)).limit(parseInt(limit));

  return c.json({
    items: items.map((row) => ({
      ...row.order,
      product: row.product ? { id: row.product.id, name: row.product.name, code: row.product.code } : null,
      bom: row.bom ? { id: row.bom.id, name: row.bom.name, code: row.bom.code } : null,
    })),
  });
});

app.get("/orders/stats", async (c) => {
  const [stats] = await db
    .select({
      total: sql<number>`count(*)`,
      planned: sql<number>`count(*) filter (where ${productionOrders.status} = 'planned')`,
      inProgress: sql<number>`count(*) filter (where ${productionOrders.status} = 'in_progress')`,
      completed: sql<number>`count(*) filter (where ${productionOrders.status} = 'completed')`,
      totalPlanned: sql<number>`coalesce(sum(${productionOrders.plannedQuantity}), 0)`,
      totalProduced: sql<number>`coalesce(sum(${productionOrders.producedQuantity}), 0)`,
    })
    .from(productionOrders);

  return c.json(stats);
});

app.post("/orders", async (c) => {
  const body = await c.req.json();
  const id = crypto.randomUUID();
  const code = `MO-${Date.now().toString(36).toUpperCase()}`;

  await db.insert(productionOrders).values({
    id,
    code,
    bomId: body.bomId,
    productId: body.productId,
    warehouseId: body.warehouseId,
    status: "planned",
    priority: body.priority || "normal",
    plannedQuantity: body.plannedQuantity,
    plannedStartDate: body.plannedStartDate,
    plannedEndDate: body.plannedEndDate,
    estimatedCost: body.estimatedCost,
    notes: body.notes,
    createdBy: body.createdBy,
  });

  return c.json({ id, code }, 201);
});

app.put("/orders/:id/start", async (c) => {
  const { id } = c.req.param();

  await db
    .update(productionOrders)
    .set({
      status: "in_progress",
      actualStartDate: new Date().toISOString().split("T")[0],
      updatedAt: new Date(),
    })
    .where(eq(productionOrders.id, id));

  return c.json({ success: true });
});

app.put("/orders/:id/complete", async (c) => {
  const { id } = c.req.param();
  const body = await c.req.json();

  await db
    .update(productionOrders)
    .set({
      status: "completed",
      producedQuantity: body.producedQuantity,
      scrapQuantity: body.scrapQuantity || 0,
      actualCost: body.actualCost,
      actualEndDate: new Date().toISOString().split("T")[0],
      updatedAt: new Date(),
    })
    .where(eq(productionOrders.id, id));

  return c.json({ success: true });
});

export default app;

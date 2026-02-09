/**
 * سجل حركات الأجهزة - API Routes
 * ─────────────────────────────────
 * تتبع كامل لكل جهاز من دخوله للمخزن حتى بيعه
 */
import { Hono } from "hono";
import {
  db,
  serialNumbers,
  serialMovements,
  products,
  warehouses,
  customers,
  users,
  invoices,
} from "@bi-management/database";
import { eq, desc, sql, and, or, like } from "drizzle-orm";
import { authMiddleware } from "../lib/auth.js";
import { nanoid } from "nanoid";

const app = new Hono();

// أنواع الحركات
const MOVEMENT_TYPES = {
  purchase_received: "استلام من المورد",
  warehouse_transfer: "نقل بين المخازن",
  custody_assign: "تسليم عهدة",
  custody_return: "استرداد عهدة",
  sale: "بيع",
  sale_return: "مرتجع بيع",
  maintenance_in: "دخول صيانة",
  maintenance_out: "خروج صيانة",
  upgrade: "ترقية",
  downgrade: "تنزيل",
  damage: "تلف",
  adjustment: "تعديل جرد",
};

/**
 * البحث عن جهاز بالسيريال
 */
app.get("/search", async (c) => {
  try {
    const query = c.req.query("q") || "";

    if (query.length < 2) {
      return c.json({ devices: [] });
    }

    const devices = await db
      .select({
        id: serialNumbers.id,
        serialNumber: serialNumbers.serialNumber,
        status: serialNumbers.status,
        productId: serialNumbers.productId,
        productName: products.name,
        productNameAr: products.nameAr,
        warehouseId: serialNumbers.warehouseId,
        warehouseName: warehouses.name,
        customerId: serialNumbers.customerId,
        purchaseDate: serialNumbers.purchaseDate,
        saleDate: serialNumbers.saleDate,
      })
      .from(serialNumbers)
      .leftJoin(products, eq(serialNumbers.productId, products.id))
      .leftJoin(warehouses, eq(serialNumbers.warehouseId, warehouses.id))
      .where(like(serialNumbers.serialNumber, `%${query}%`))
      .limit(20);

    return c.json({ devices });
  } catch (error) {
    console.error("Search error:", error);
    return c.json({ error: "فشل في البحث" }, 500);
  }
});

/**
 * الحصول على تفاصيل جهاز معين + تاريخه الكامل
 */
app.get("/device/:serialNumber", async (c) => {
  try {
    const serialNumber = c.req.param("serialNumber");

    // معلومات الجهاز
    const [device] = await db
      .select({
        id: serialNumbers.id,
        serialNumber: serialNumbers.serialNumber,
        status: serialNumbers.status,
        condition: serialNumbers.condition,
        productId: serialNumbers.productId,
        productName: products.name,
        productNameAr: products.nameAr,
        productModel: products.model,
        warehouseId: serialNumbers.warehouseId,
        warehouseName: warehouses.name,
        customerId: serialNumbers.customerId,
        custodyUserId: serialNumbers.custodyUserId,
        custodySince: serialNumbers.custodySince,
        custodyReason: serialNumbers.custodyReason,
        purchaseDate: serialNumbers.purchaseDate,
        saleDate: serialNumbers.saleDate,
        warrantyMonths: serialNumbers.warrantyMonths,
        warrantyStart: serialNumbers.warrantyStart,
        warrantyEnd: serialNumbers.warrantyEnd,
        supplierWarrantyEnd: serialNumbers.supplierWarrantyEnd,
        sellingPrice: serialNumbers.sellingPrice,
        notes: serialNumbers.notes,
        createdAt: serialNumbers.createdAt,
      })
      .from(serialNumbers)
      .leftJoin(products, eq(serialNumbers.productId, products.id))
      .leftJoin(warehouses, eq(serialNumbers.warehouseId, warehouses.id))
      .where(eq(serialNumbers.serialNumber, serialNumber));

    if (!device) {
      return c.json({ error: "الجهاز غير موجود" }, 404);
    }

    // تاريخ الحركات
    const movements = await db
      .select({
        id: serialMovements.id,
        movementType: serialMovements.movementType,
        fromWarehouseId: serialMovements.fromWarehouseId,
        toWarehouseId: serialMovements.toWarehouseId,
        fromStatus: serialMovements.fromStatus,
        toStatus: serialMovements.toStatus,
        referenceType: serialMovements.referenceType,
        referenceId: serialMovements.referenceId,
        performedBy: serialMovements.performedBy,
        performedByName: users.fullName,
        performedAt: serialMovements.performedAt,
        notes: serialMovements.notes,
      })
      .from(serialMovements)
      .leftJoin(users, eq(serialMovements.performedBy, users.id))
      .where(eq(serialMovements.serialId, device.id))
      .orderBy(desc(serialMovements.performedAt));

    // إحصائيات
    const stats = {
      totalMovements: movements.length,
      warehouseTransfers: movements.filter(
        (m) => m.movementType === "warehouse_transfer"
      ).length,
      custodyChanges: movements.filter(
        (m) =>
          m.movementType === "custody_assign" ||
          m.movementType === "custody_return"
      ).length,
      maintenanceCount: movements.filter(
        (m) =>
          m.movementType === "maintenance_in" ||
          m.movementType === "maintenance_out"
      ).length,
    };

    // معلومات العميل إذا كان مباع
    let customer = null;
    if (device.customerId) {
      const [customerData] = await db
        .select({
          id: customers.id,
          fullName: customers.name,
          phone: customers.phone,
        })
        .from(customers)
        .where(eq(customers.id, device.customerId));
      customer = customerData;
    }

    // معلومات حامل العهدة إذا كان في عهدة
    let custodyUser = null;
    if (device.custodyUserId) {
      const [userData] = await db
        .select({
          id: users.id,
          fullName: users.fullName,
        })
        .from(users)
        .where(eq(users.id, device.custodyUserId));
      custodyUser = userData;
    }

    return c.json({
      device,
      movements,
      stats,
      customer,
      custodyUser,
      movementTypes: MOVEMENT_TYPES,
    });
  } catch (error) {
    console.error("Device details error:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

/**
 * تسجيل حركة جديدة
 */
app.post("/movement", async (c) => {
  try {
    const user = c.get("user");
    const body = await c.req.json();
    const {
      serialId,
      movementType,
      fromWarehouseId,
      toWarehouseId,
      toStatus,
      referenceType,
      referenceId,
      notes,
    } = body;

    // جلب الجهاز الحالي
    const [device] = await db
      .select()
      .from(serialNumbers)
      .where(eq(serialNumbers.id, serialId));

    if (!device) {
      return c.json({ error: "الجهاز غير موجود" }, 404);
    }

    const movementId = `mov_${nanoid(12)}`;

    // تسجيل الحركة
    await db.insert(serialMovements).values({
      id: movementId,
      serialId,
      movementType,
      fromWarehouseId: fromWarehouseId || device.warehouseId,
      toWarehouseId,
      fromStatus: device.status,
      toStatus: toStatus || device.status,
      referenceType,
      referenceId,
      performedBy: user.userId,
      performedAt: new Date(),
      notes,
    });

    // تحديث الجهاز حسب نوع الحركة
    const updates: Record<string, any> = {
      updatedAt: new Date(),
    };

    if (toWarehouseId) {
      updates.warehouseId = toWarehouseId;
    }

    if (toStatus) {
      updates.status = toStatus;
    }

    if (movementType === "custody_assign") {
      updates.custodyUserId = body.custodyUserId;
      updates.custodySince = new Date();
      updates.custodyReason = body.custodyReason;
    } else if (movementType === "custody_return") {
      updates.custodyUserId = null;
      updates.custodySince = null;
      updates.custodyReason = null;
    }

    await db
      .update(serialNumbers)
      .set(updates)
      .where(eq(serialNumbers.id, serialId));

    return c.json({ success: true, movementId });
  } catch (error) {
    console.error("Movement error:", error);
    return c.json({ error: "فشل في تسجيل الحركة" }, 500);
  }
});

/**
 * نقل بين المخازن
 */
app.post("/transfer", async (c) => {
  try {
    const user = c.get("user");
    const body = await c.req.json();
    const { serialIds, toWarehouseId, notes } = body;

    if (!serialIds?.length || !toWarehouseId) {
      return c.json({ error: "بيانات غير مكتملة" }, 400);
    }

    const results = [];

    for (const serialId of serialIds) {
      const [device] = await db
        .select()
        .from(serialNumbers)
        .where(eq(serialNumbers.id, serialId));

      if (!device) continue;

      const movementId = `mov_${nanoid(12)}`;

      // تسجيل الحركة
      await db.insert(serialMovements).values({
        id: movementId,
        serialId,
        movementType: "warehouse_transfer",
        fromWarehouseId: device.warehouseId,
        toWarehouseId,
        fromStatus: device.status,
        toStatus: device.status,
        performedBy: user.userId,
        performedAt: new Date(),
        notes,
      });

      // تحديث موقع الجهاز
      await db
        .update(serialNumbers)
        .set({
          warehouseId: toWarehouseId,
          updatedAt: new Date(),
        })
        .where(eq(serialNumbers.id, serialId));

      results.push({ serialId, success: true });
    }

    return c.json({ success: true, transferred: results.length });
  } catch (error) {
    console.error("Transfer error:", error);
    return c.json({ error: "فشل في النقل" }, 500);
  }
});

/**
 * تسليم/استرداد عهدة
 */
app.post("/custody", async (c) => {
  try {
    const user = c.get("user");
    const body = await c.req.json();
    const { serialId, action, custodyUserId, reason, notes } = body;

    const [device] = await db
      .select()
      .from(serialNumbers)
      .where(eq(serialNumbers.id, serialId));

    if (!device) {
      return c.json({ error: "الجهاز غير موجود" }, 404);
    }

    const movementId = `mov_${nanoid(12)}`;
    const isAssign = action === "assign";

    // تسجيل الحركة
    await db.insert(serialMovements).values({
      id: movementId,
      serialId,
      movementType: isAssign ? "custody_assign" : "custody_return",
      fromWarehouseId: device.warehouseId,
      toWarehouseId: device.warehouseId,
      fromStatus: device.status,
      toStatus: isAssign ? "in_custody" : "available",
      performedBy: user.userId,
      performedAt: new Date(),
      notes: `${reason || ""} ${notes || ""}`.trim(),
    });

    // تحديث الجهاز
    if (isAssign) {
      await db
        .update(serialNumbers)
        .set({
          custodyUserId,
          custodySince: new Date(),
          custodyReason: reason,
          status: "in_custody",
          updatedAt: new Date(),
        })
        .where(eq(serialNumbers.id, serialId));
    } else {
      await db
        .update(serialNumbers)
        .set({
          custodyUserId: null,
          custodySince: null,
          custodyReason: null,
          status: "available",
          updatedAt: new Date(),
        })
        .where(eq(serialNumbers.id, serialId));
    }

    return c.json({ success: true, movementId });
  } catch (error) {
    console.error("Custody error:", error);
    return c.json({ error: "فشل في تسجيل العهدة" }, 500);
  }
});

/**
 * أحدث الحركات
 */
app.get("/recent", async (c) => {
  try {
    const limit = parseInt(c.req.query("limit") || "50");

    const movements = await db
      .select({
        id: serialMovements.id,
        movementType: serialMovements.movementType,
        serialId: serialMovements.serialId,
        serialNumber: serialNumbers.serialNumber,
        productName: products.nameAr,
        fromStatus: serialMovements.fromStatus,
        toStatus: serialMovements.toStatus,
        performedByName: users.fullName,
        performedAt: serialMovements.performedAt,
        notes: serialMovements.notes,
      })
      .from(serialMovements)
      .leftJoin(serialNumbers, eq(serialMovements.serialId, serialNumbers.id))
      .leftJoin(products, eq(serialNumbers.productId, products.id))
      .leftJoin(users, eq(serialMovements.performedBy, users.id))
      .orderBy(desc(serialMovements.performedAt))
      .limit(limit);

    return c.json({ movements, movementTypes: MOVEMENT_TYPES });
  } catch (error) {
    console.error("Recent movements error:", error);
    return c.json({ error: "فشل في جلب الحركات" }, 500);
  }
});

/**
 * إحصائيات الحركات
 */
app.get("/stats", async (c) => {
  try {
    // إجمالي الأجهزة حسب الحالة
    const statusCounts = await db
      .select({
        status: serialNumbers.status,
        count: sql<number>`count(*)`,
      })
      .from(serialNumbers)
      .groupBy(serialNumbers.status);

    // حركات اليوم
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayMovements = await db
      .select({
        movementType: serialMovements.movementType,
        count: sql<number>`count(*)`,
      })
      .from(serialMovements)
      .where(sql`${serialMovements.performedAt} >= ${today}`)
      .groupBy(serialMovements.movementType);

    // أجهزة في العهدة
    const inCustody = await db
      .select({
        count: sql<number>`count(*)`,
      })
      .from(serialNumbers)
      .where(eq(serialNumbers.status, "in_custody"));

    return c.json({
      statusCounts,
      todayMovements,
      inCustody: inCustody[0]?.count || 0,
      movementTypes: MOVEMENT_TYPES,
    });
  } catch (error) {
    console.error("Stats error:", error);
    return c.json({ error: "فشل في جلب الإحصائيات" }, 500);
  }
});

export default app;

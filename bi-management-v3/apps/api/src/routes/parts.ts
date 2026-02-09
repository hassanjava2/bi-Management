/**
 * API Routes - نظام إدارة القطع والترقيات
 */
import { Hono } from "hono";
import {
  db,
  partTypes,
  partsInventory,
  partsMovements,
  upgradeOrders,
  upgradeItems,
  installedParts,
  installationPrices,
  serialNumbers,
  products,
  warehouses,
  users,
} from "@bi-management/database";
import { eq, desc, sql, and, or, gte, lte, count, asc, like } from "drizzle-orm";
import { authMiddleware } from "../lib/auth.js";
import { nanoid } from "nanoid";

const app = new Hono();

/**
 * توليد رقم طلب الترقية
 */
async function generateUpgradeNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, "0");

  const [result] = await db
    .select({ count: count() })
    .from(upgradeOrders)
    .where(
      sql`EXTRACT(YEAR FROM ${upgradeOrders.createdAt}) = ${year} AND EXTRACT(MONTH FROM ${upgradeOrders.createdAt}) = ${Number(month)}`
    );

  const num = (result?.count || 0) + 1;
  return `UPG-${year}${month}-${String(num).padStart(4, "0")}`;
}

// ==================== أنواع القطع ====================

/**
 * جلب أنواع القطع
 */
app.get("/types", async (c) => {
  try {
    const types = await db
      .select()
      .from(partTypes)
      .where(eq(partTypes.isActive, true))
      .orderBy(asc(partTypes.sortOrder));

    return c.json({ types });
  } catch (error) {
    console.error("Get part types error:", error);
    return c.json({ error: "فشل في جلب أنواع القطع" }, 500);
  }
});

/**
 * إضافة نوع قطعة
 */
app.post("/types", async (c) => {
  try {
    const body = await c.req.json();
    const { name, nameAr, category, icon, requiresCompatibility, specifications } = body;

    const id = `pt_${nanoid(12)}`;
    await db.insert(partTypes).values({
      id,
      name,
      nameAr,
      category: category || "internal",
      icon,
      requiresCompatibility: requiresCompatibility ?? true,
      specifications,
      createdAt: new Date(),
    });

    return c.json({ success: true, id });
  } catch (error) {
    console.error("Create part type error:", error);
    return c.json({ error: "فشل في إنشاء نوع القطعة" }, 500);
  }
});

// ==================== مخزون القطع ====================

/**
 * جلب مخزون القطع
 */
app.get("/inventory", async (c) => {
  try {
    const typeId = c.req.query("typeId");
    const warehouseId = c.req.query("warehouseId");
    const search = c.req.query("search");
    const lowStock = c.req.query("lowStock") === "true";

    let query = db
      .select({
        id: partsInventory.id,
        name: partsInventory.name,
        brand: partsInventory.brand,
        model: partsInventory.model,
        sku: partsInventory.sku,
        specifications: partsInventory.specifications,
        quantity: partsInventory.quantity,
        minQuantity: partsInventory.minQuantity,
        costPrice: partsInventory.costPrice,
        sellPrice: partsInventory.sellPrice,
        installationFee: partsInventory.installationFee,
        condition: partsInventory.condition,
        warehouseId: partsInventory.warehouseId,
        warehouseName: warehouses.name,
        partTypeId: partsInventory.partTypeId,
        partTypeName: partTypes.nameAr,
        isActive: partsInventory.isActive,
      })
      .from(partsInventory)
      .leftJoin(partTypes, eq(partsInventory.partTypeId, partTypes.id))
      .leftJoin(warehouses, eq(partsInventory.warehouseId, warehouses.id))
      .orderBy(desc(partsInventory.createdAt));

    const conditions = [];
    if (typeId) conditions.push(eq(partsInventory.partTypeId, typeId));
    if (warehouseId) conditions.push(eq(partsInventory.warehouseId, warehouseId));
    if (search) {
      conditions.push(
        or(
          sql`${partsInventory.name} ILIKE ${"%" + search + "%"}`,
          sql`${partsInventory.brand} ILIKE ${"%" + search + "%"}`,
          sql`${partsInventory.model} ILIKE ${"%" + search + "%"}`,
          sql`${partsInventory.sku} ILIKE ${"%" + search + "%"}`
        )
      );
    }
    if (lowStock) {
      conditions.push(sql`${partsInventory.quantity} <= ${partsInventory.minQuantity}`);
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    const parts = await query;

    // إحصائيات
    const [stats] = await db
      .select({
        totalParts: count(),
        totalQuantity: sql<number>`COALESCE(SUM(${partsInventory.quantity}), 0)`,
        lowStockCount: sql<number>`COUNT(CASE WHEN ${partsInventory.quantity} <= ${partsInventory.minQuantity} THEN 1 END)`,
        totalValue: sql<number>`COALESCE(SUM(${partsInventory.quantity} * ${partsInventory.costPrice}), 0)`,
      })
      .from(partsInventory)
      .where(eq(partsInventory.isActive, true));

    return c.json({ parts, stats });
  } catch (error) {
    console.error("Get inventory error:", error);
    return c.json({ error: "فشل في جلب المخزون" }, 500);
  }
});

/**
 * إضافة قطعة للمخزون
 */
app.post("/inventory", async (c) => {
  try {
    const currentUser = c.get("user");
    const body = await c.req.json();
    const {
      partTypeId,
      name,
      brand,
      model,
      sku,
      barcode,
      specifications,
      compatibleWith,
      warehouseId,
      quantity,
      minQuantity,
      costPrice,
      sellPrice,
      installationFee,
      condition,
      notes,
    } = body;

    if (!partTypeId || !name) {
      return c.json({ error: "بيانات غير مكتملة" }, 400);
    }

    const id = `part_${nanoid(12)}`;
    await db.insert(partsInventory).values({
      id,
      partTypeId,
      name,
      brand,
      model,
      sku,
      barcode,
      specifications,
      compatibleWith,
      warehouseId,
      quantity: quantity || 0,
      minQuantity: minQuantity || 5,
      costPrice,
      sellPrice,
      installationFee,
      condition: condition || "new",
      notes,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // تسجيل حركة المخزون الأولى
    if (quantity && quantity > 0) {
      await db.insert(partsMovements).values({
        id: `pm_${nanoid(12)}`,
        partId: id,
        movementType: "purchase",
        quantity,
        quantityBefore: 0,
        quantityAfter: quantity,
        unitPrice: costPrice,
        notes: "إضافة أولية للمخزون",
        performedBy: currentUser.id,
        performedAt: new Date(),
      });
    }

    return c.json({ success: true, id });
  } catch (error) {
    console.error("Create part error:", error);
    return c.json({ error: "فشل في إضافة القطعة" }, 500);
  }
});

/**
 * تحديث قطعة
 */
app.put("/inventory/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();

    await db
      .update(partsInventory)
      .set({
        ...body,
        updatedAt: new Date(),
      })
      .where(eq(partsInventory.id, id));

    return c.json({ success: true });
  } catch (error) {
    console.error("Update part error:", error);
    return c.json({ error: "فشل في تحديث القطعة" }, 500);
  }
});

/**
 * تعديل كمية المخزون
 */
app.post("/inventory/:id/adjust", async (c) => {
  try {
    const id = c.req.param("id");
    const currentUser = c.get("user");
    const body = await c.req.json();
    const { adjustment, reason } = body;

    const [part] = await db
      .select()
      .from(partsInventory)
      .where(eq(partsInventory.id, id));

    if (!part) {
      return c.json({ error: "القطعة غير موجودة" }, 404);
    }

    const newQuantity = (part.quantity || 0) + adjustment;
    if (newQuantity < 0) {
      return c.json({ error: "الكمية لا يمكن أن تكون سالبة" }, 400);
    }

    await db
      .update(partsInventory)
      .set({
        quantity: newQuantity,
        updatedAt: new Date(),
      })
      .where(eq(partsInventory.id, id));

    await db.insert(partsMovements).values({
      id: `pm_${nanoid(12)}`,
      partId: id,
      movementType: "adjustment",
      quantity: adjustment,
      quantityBefore: part.quantity,
      quantityAfter: newQuantity,
      notes: reason,
      performedBy: currentUser.id,
      performedAt: new Date(),
    });

    return c.json({ success: true, newQuantity });
  } catch (error) {
    console.error("Adjust quantity error:", error);
    return c.json({ error: "فشل في تعديل الكمية" }, 500);
  }
});

// ==================== طلبات الترقية ====================

/**
 * جلب طلبات الترقية
 */
app.get("/upgrades", async (c) => {
  try {
    const status = c.req.query("status");
    const serialNumber = c.req.query("serialNumber");

    let query = db
      .select({
        id: upgradeOrders.id,
        orderNumber: upgradeOrders.orderNumber,
        serialNumber: upgradeOrders.serialNumber,
        productName: upgradeOrders.productName,
        upgradeType: upgradeOrders.upgradeType,
        status: upgradeOrders.status,
        partsCost: upgradeOrders.partsCost,
        installationFee: upgradeOrders.installationFee,
        totalCost: upgradeOrders.totalCost,
        requestedAt: upgradeOrders.requestedAt,
        completedAt: upgradeOrders.completedAt,
        notes: upgradeOrders.notes,
      })
      .from(upgradeOrders)
      .orderBy(desc(upgradeOrders.requestedAt));

    const conditions = [];
    if (status) conditions.push(eq(upgradeOrders.status, status));
    if (serialNumber) {
      conditions.push(
        sql`${upgradeOrders.serialNumber} ILIKE ${"%" + serialNumber + "%"}`
      );
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    const upgrades = await query;

    return c.json({ upgrades });
  } catch (error) {
    console.error("Get upgrades error:", error);
    return c.json({ error: "فشل في جلب طلبات الترقية" }, 500);
  }
});

/**
 * جلب تفاصيل طلب ترقية
 */
app.get("/upgrades/:id", async (c) => {
  try {
    const id = c.req.param("id");

    const [upgrade] = await db
      .select()
      .from(upgradeOrders)
      .where(eq(upgradeOrders.id, id));

    if (!upgrade) {
      return c.json({ error: "الطلب غير موجود" }, 404);
    }

    const items = await db
      .select()
      .from(upgradeItems)
      .where(eq(upgradeItems.upgradeOrderId, id));

    return c.json({ upgrade, items });
  } catch (error) {
    console.error("Get upgrade error:", error);
    return c.json({ error: "فشل في جلب تفاصيل الطلب" }, 500);
  }
});

/**
 * إنشاء طلب ترقية
 */
app.post("/upgrades", async (c) => {
  try {
    const currentUser = c.get("user");
    const body = await c.req.json();
    const {
      serialNumber,
      invoiceId,
      upgradeType,
      items,
      notes,
      customerNotes,
    } = body;

    if (!serialNumber || !items || items.length === 0) {
      return c.json({ error: "بيانات غير مكتملة" }, 400);
    }

    // جلب بيانات الجهاز
    const [device] = await db
      .select({
        id: serialNumbers.id,
        serialNumber: serialNumbers.serialNumber,
        productId: serialNumbers.productId,
        productName: products.name,
      })
      .from(serialNumbers)
      .leftJoin(products, eq(serialNumbers.productId, products.id))
      .where(eq(serialNumbers.serialNumber, serialNumber));

    if (!device) {
      return c.json({ error: "الجهاز غير موجود" }, 404);
    }

    const orderNumber = await generateUpgradeNumber();
    const upgradeId = `upg_${nanoid(12)}`;

    let totalPartsCost = 0;
    let totalInstallationFee = 0;

    // إنشاء الطلب
    await db.insert(upgradeOrders).values({
      id: upgradeId,
      orderNumber,
      serialId: device.id,
      serialNumber: device.serialNumber,
      productId: device.productId,
      productName: device.productName,
      invoiceId,
      upgradeType: upgradeType || "add",
      status: "pending",
      notes,
      customerNotes,
      requestedBy: currentUser.id,
      requestedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // إضافة العناصر
    for (const item of items) {
      const [part] = await db
        .select()
        .from(partsInventory)
        .where(eq(partsInventory.id, item.partId));

      if (!part) continue;

      const unitPrice = parseFloat(String(part.sellPrice || 0));
      const installFee = parseFloat(String(item.installationFee || part.installationFee || 0));
      const qty = item.quantity || 1;
      const subtotal = unitPrice * qty + installFee;

      totalPartsCost += unitPrice * qty;
      totalInstallationFee += installFee;

      await db.insert(upgradeItems).values({
        id: `ui_${nanoid(12)}`,
        upgradeOrderId: upgradeId,
        partId: part.id,
        partName: part.name,
        partSpecifications: part.specifications,
        action: item.action || "install",
        quantity: qty,
        unitPrice: String(unitPrice),
        installationFee: String(installFee),
        subtotal: String(subtotal),
        removedPartId: item.removedPartId,
        removedPartName: item.removedPartName,
        removedPartValue: item.removedPartValue,
        notes: item.notes,
        createdAt: new Date(),
      });
    }

    // تحديث التكلفة الإجمالية
    await db
      .update(upgradeOrders)
      .set({
        partsCost: String(totalPartsCost),
        installationFee: String(totalInstallationFee),
        totalCost: String(totalPartsCost + totalInstallationFee),
      })
      .where(eq(upgradeOrders.id, upgradeId));

    return c.json({
      success: true,
      upgradeId,
      orderNumber,
      totalCost: totalPartsCost + totalInstallationFee,
    });
  } catch (error) {
    console.error("Create upgrade error:", error);
    return c.json({ error: "فشل في إنشاء طلب الترقية" }, 500);
  }
});

/**
 * تنفيذ الترقية (تركيب القطع)
 */
app.post("/upgrades/:id/complete", async (c) => {
  try {
    const id = c.req.param("id");
    const currentUser = c.get("user");
    const body = await c.req.json();
    const { notes } = body;

    const [upgrade] = await db
      .select()
      .from(upgradeOrders)
      .where(eq(upgradeOrders.id, id));

    if (!upgrade) {
      return c.json({ error: "الطلب غير موجود" }, 404);
    }

    if (upgrade.status === "completed") {
      return c.json({ error: "الطلب مكتمل بالفعل" }, 400);
    }

    // جلب عناصر الترقية
    const items = await db
      .select()
      .from(upgradeItems)
      .where(eq(upgradeItems.upgradeOrderId, id));

    // تنفيذ كل عنصر
    for (const item of items) {
      if (item.action === "install" || item.action === "swap") {
        // خصم من المخزون
        if (item.partId) {
          const [part] = await db
            .select()
            .from(partsInventory)
            .where(eq(partsInventory.id, item.partId));

          if (part) {
            const newQty = (part.quantity || 0) - (item.quantity || 1);
            await db
              .update(partsInventory)
              .set({ quantity: newQty, updatedAt: new Date() })
              .where(eq(partsInventory.id, item.partId));

            await db.insert(partsMovements).values({
              id: `pm_${nanoid(12)}`,
              partId: item.partId,
              movementType: "upgrade_install",
              quantity: -(item.quantity || 1),
              referenceType: "upgrade",
              referenceId: id,
              quantityBefore: part.quantity,
              quantityAfter: newQty,
              unitPrice: item.unitPrice,
              notes: `ترقية: ${upgrade.orderNumber}`,
              performedBy: currentUser.id,
              performedAt: new Date(),
            });
          }

          // تسجيل القطعة المركبة
          await db.insert(installedParts).values({
            id: `ip_${nanoid(12)}`,
            serialId: upgrade.serialId!,
            partId: item.partId,
            partName: item.partName,
            partSpecifications: item.partSpecifications,
            isOriginal: false,
            isUpgrade: true,
            upgradeOrderId: id,
            installedAt: new Date(),
            installedBy: currentUser.id,
            status: "active",
            createdAt: new Date(),
          });
        }

        // إذا كان swap، أعد القطعة المسحوبة للمخزون
        if (item.action === "swap" && item.removedPartId && !item.returnedToInventory) {
          // يمكن إضافة منطق إعادة القطعة للمخزون هنا
          await db
            .update(upgradeItems)
            .set({ returnedToInventory: true })
            .where(eq(upgradeItems.id, item.id));
        }
      }
    }

    // تحديث حالة الطلب
    await db
      .update(upgradeOrders)
      .set({
        status: "completed",
        completedAt: new Date(),
        completedBy: currentUser.id,
        notes: notes ? `${upgrade.notes || ""}\n${notes}` : upgrade.notes,
        updatedAt: new Date(),
      })
      .where(eq(upgradeOrders.id, id));

    return c.json({ success: true, message: "تم تنفيذ الترقية بنجاح" });
  } catch (error) {
    console.error("Complete upgrade error:", error);
    return c.json({ error: "فشل في تنفيذ الترقية" }, 500);
  }
});

/**
 * إلغاء طلب ترقية
 */
app.post("/upgrades/:id/cancel", async (c) => {
  try {
    const id = c.req.param("id");

    await db
      .update(upgradeOrders)
      .set({
        status: "cancelled",
        updatedAt: new Date(),
      })
      .where(eq(upgradeOrders.id, id));

    return c.json({ success: true });
  } catch (error) {
    console.error("Cancel upgrade error:", error);
    return c.json({ error: "فشل في إلغاء الطلب" }, 500);
  }
});

// ==================== القطع المركبة ====================

/**
 * جلب القطع المركبة على جهاز
 */
app.get("/installed/:serialNumber", async (c) => {
  try {
    const serialNumber = c.req.param("serialNumber");

    const [device] = await db
      .select()
      .from(serialNumbers)
      .where(eq(serialNumbers.serialNumber, serialNumber));

    if (!device) {
      return c.json({ error: "الجهاز غير موجود" }, 404);
    }

    const parts = await db
      .select({
        id: installedParts.id,
        partName: installedParts.partName,
        partSpecifications: installedParts.partSpecifications,
        isOriginal: installedParts.isOriginal,
        isUpgrade: installedParts.isUpgrade,
        installedAt: installedParts.installedAt,
        status: installedParts.status,
        partTypeName: partTypes.nameAr,
      })
      .from(installedParts)
      .leftJoin(partTypes, eq(installedParts.partTypeId, partTypes.id))
      .where(
        and(
          eq(installedParts.serialId, device.id),
          eq(installedParts.status, "active")
        )
      )
      .orderBy(desc(installedParts.installedAt));

    return c.json({ device, parts });
  } catch (error) {
    console.error("Get installed parts error:", error);
    return c.json({ error: "فشل في جلب القطع" }, 500);
  }
});

// ==================== البحث ====================

/**
 * البحث عن قطع متوافقة
 */
app.get("/compatible", async (c) => {
  try {
    const productId = c.req.query("productId");
    const typeId = c.req.query("typeId");

    let query = db
      .select()
      .from(partsInventory)
      .where(
        and(
          eq(partsInventory.isActive, true),
          sql`${partsInventory.quantity} > 0`
        )
      );

    if (typeId) {
      query = query.where(eq(partsInventory.partTypeId, typeId)) as any;
    }

    const parts = await query;

    // فلترة حسب التوافق
    const compatible = productId
      ? parts.filter((p) => {
          if (!p.compatibleWith) return true;
          return (p.compatibleWith as string[]).includes(productId);
        })
      : parts;

    return c.json({ parts: compatible });
  } catch (error) {
    console.error("Get compatible parts error:", error);
    return c.json({ error: "فشل في البحث" }, 500);
  }
});

/**
 * أسعار التركيب
 */
app.get("/installation-prices", async (c) => {
  try {
    const prices = await db
      .select({
        id: installationPrices.id,
        partTypeId: installationPrices.partTypeId,
        partTypeName: partTypes.nameAr,
        action: installationPrices.action,
        price: installationPrices.price,
        description: installationPrices.description,
      })
      .from(installationPrices)
      .leftJoin(partTypes, eq(installationPrices.partTypeId, partTypes.id))
      .where(eq(installationPrices.isActive, true));

    return c.json({ prices });
  } catch (error) {
    console.error("Get prices error:", error);
    return c.json({ error: "فشل في جلب الأسعار" }, 500);
  }
});

/**
 * تقارير الترقيات
 */
app.get("/reports/summary", async (c) => {
  try {
    const fromDate = c.req.query("fromDate");
    const toDate = c.req.query("toDate");

    const conditions = [];
    if (fromDate) conditions.push(gte(upgradeOrders.completedAt, new Date(fromDate)));
    if (toDate) conditions.push(lte(upgradeOrders.completedAt, new Date(toDate)));

    let statsQuery = db
      .select({
        totalUpgrades: count(),
        completedUpgrades: sql<number>`COUNT(CASE WHEN ${upgradeOrders.status} = 'completed' THEN 1 END)`,
        totalRevenue: sql<number>`COALESCE(SUM(CASE WHEN ${upgradeOrders.status} = 'completed' THEN ${upgradeOrders.totalCost} END), 0)`,
        avgCost: sql<number>`COALESCE(AVG(CASE WHEN ${upgradeOrders.status} = 'completed' THEN ${upgradeOrders.totalCost} END), 0)`,
      })
      .from(upgradeOrders);

    if (conditions.length > 0) {
      statsQuery = statsQuery.where(and(...conditions)) as any;
    }

    const [stats] = await statsQuery;

    // أكثر القطع مبيعاً
    const topParts = await db
      .select({
        partName: upgradeItems.partName,
        count: sql<number>`SUM(${upgradeItems.quantity})`,
        revenue: sql<number>`SUM(${upgradeItems.subtotal})`,
      })
      .from(upgradeItems)
      .innerJoin(upgradeOrders, eq(upgradeItems.upgradeOrderId, upgradeOrders.id))
      .where(eq(upgradeOrders.status, "completed"))
      .groupBy(upgradeItems.partName)
      .orderBy(desc(sql`SUM(${upgradeItems.quantity})`))
      .limit(10);

    return c.json({ stats, topParts });
  } catch (error) {
    console.error("Get reports error:", error);
    return c.json({ error: "فشل في جلب التقارير" }, 500);
  }
});

export default app;

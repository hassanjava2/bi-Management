/**
 * نظام الشراء والوجبات - API Routes
 * ───────────────────────────────────
 * 
 * سير العمل:
 * 1. POST /batches - الموظف يضيف وجبة (بدون أسعار)
 * 2. PATCH /batches/:id/prices - المدير يضيف أسعار الشراء
 * 3. POST /batches/:id/receive - الفاحص يستلم ويفحص
 * 4. PATCH /batches/:id/selling-prices - المدير يحدد أسعار البيع
 */

import { Hono } from "hono";
import {
  db,
  purchaseBatches,
  purchaseBatchItems,
  purchaseBatchDevices,
  serialSettings,
  suppliers,
  products,
  serialNumbers,
} from "@bi-management/database";
import { eq, desc, and, sql, isNull } from "drizzle-orm";
import { authMiddleware } from "../lib/auth.js";
import {
  ensureSystemAccounts,
  getAccountIdByCode,
  createAndPostJournalEntryWithTx,
  SYSTEM_ACCOUNT_CODES,
} from "../lib/accounting.js";

const app = new Hono();

app.use("*", authMiddleware);

// ═══════════════════════════════════════════════════════════════
// توليد رقم الوجبة
// ═══════════════════════════════════════════════════════════════
async function generateBatchNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, "0");
  
  // عد الوجبات هذا الشهر
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(purchaseBatches)
    .where(sql`EXTRACT(YEAR FROM created_at) = ${year} AND EXTRACT(MONTH FROM created_at) = ${month + 1}`);
  
  const count = Number(result[0]?.count || 0) + 1;
  return `PO-${year}${month}-${String(count).padStart(4, "0")}`;
}

// ═══════════════════════════════════════════════════════════════
// توليد السيريال
// ═══════════════════════════════════════════════════════════════
async function generateSerialNumber(): Promise<string> {
  const year = new Date().getFullYear();
  
  // جلب أو إنشاء إعدادات السيريال
  let settings = await db.select().from(serialSettings).limit(1);
  
  if (settings.length === 0) {
    // إنشاء إعدادات افتراضية
    await db.insert(serialSettings).values({
      id: "serial_settings_default",
      prefix: "BI",
      yearFormat: "YYYY",
      separator: "-",
      digitCount: 6,
      currentSequence: 0,
      currentYear: year,
    });
    settings = await db.select().from(serialSettings).limit(1);
  }
  
  const setting = settings[0];
  
  // إعادة الترقيم إذا تغيرت السنة
  let sequence = setting.currentSequence || 0;
  if (setting.resetYearly && setting.currentYear !== year) {
    sequence = 0;
    await db
      .update(serialSettings)
      .set({ currentYear: year, currentSequence: 0 })
      .where(eq(serialSettings.id, setting.id));
  }
  
  // زيادة التسلسل
  sequence += 1;
  await db
    .update(serialSettings)
    .set({ currentSequence: sequence, updatedAt: new Date() })
    .where(eq(serialSettings.id, setting.id));
  
  // تكوين السيريال
  const yearStr = setting.yearFormat === "YY" ? String(year).slice(-2) : String(year);
  const seqStr = String(sequence).padStart(setting.digitCount || 6, "0");
  
  return `${setting.prefix}${setting.separator}${yearStr}${setting.separator}${seqStr}`;
}

// ═══════════════════════════════════════════════════════════════
// قائمة الوجبات
// ═══════════════════════════════════════════════════════════════
app.get("/batches", async (c) => {
  try {
    const status = c.req.query("status");
    const supplierId = c.req.query("supplierId");
    
    let query = db
      .select({
        batch: purchaseBatches,
        supplier: suppliers,
      })
      .from(purchaseBatches)
      .leftJoin(suppliers, eq(purchaseBatches.supplierId, suppliers.id))
      .orderBy(desc(purchaseBatches.createdAt));
    
    const batches = await query;
    
    // فلترة حسب الحالة
    let filtered = batches;
    if (status) {
      filtered = batches.filter(b => b.batch.status === status);
    }
    if (supplierId) {
      filtered = filtered.filter(b => b.batch.supplierId === supplierId);
    }
    
    return c.json({
      batches: filtered.map(b => ({
        ...b.batch,
        supplier: b.supplier,
      })),
    });
  } catch (error) {
    console.error("GET /batches error:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

// ═══════════════════════════════════════════════════════════════
// تفاصيل وجبة
// ═══════════════════════════════════════════════════════════════
app.get("/batches/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const user = c.get("user");
    const isManager = user?.role === "admin" || user?.role === "owner" || user?.role === "manager";
    
    const batch = await db
      .select()
      .from(purchaseBatches)
      .where(eq(purchaseBatches.id, id))
      .limit(1);
    
    if (batch.length === 0) {
      return c.json({ error: "الوجبة غير موجودة" }, 404);
    }
    
    // جلب بنود الوجبة
    const items = await db
      .select({
        item: purchaseBatchItems,
        product: products,
      })
      .from(purchaseBatchItems)
      .leftJoin(products, eq(purchaseBatchItems.productId, products.id))
      .where(eq(purchaseBatchItems.batchId, id));
    
    // جلب الأجهزة
    const devices = await db
      .select()
      .from(purchaseBatchDevices)
      .where(eq(purchaseBatchDevices.batchId, id));
    
    // جلب المورد
    const supplier = await db
      .select()
      .from(suppliers)
      .where(eq(suppliers.id, batch[0].supplierId))
      .limit(1);
    
    // إخفاء الأسعار للموظف العادي
    const responseItems = items.map(i => ({
      ...i.item,
      product: i.product,
      // إخفاء الأسعار إذا ليس مدير
      unitCost: isManager ? i.item.unitCost : undefined,
      totalCost: isManager ? i.item.totalCost : undefined,
    }));
    
    const responseDevices = devices.map(d => ({
      ...d,
      purchaseCost: isManager ? d.purchaseCost : undefined,
    }));
    
    return c.json({
      batch: {
        ...batch[0],
        totalCost: isManager ? batch[0].totalCost : undefined,
      },
      supplier: supplier[0],
      items: responseItems,
      devices: responseDevices,
    });
  } catch (error) {
    console.error("GET /batches/:id error:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

// ═══════════════════════════════════════════════════════════════
// إنشاء وجبة جديدة (الموظف - بدون أسعار)
// ═══════════════════════════════════════════════════════════════
app.post("/batches", async (c) => {
  try {
    const user = c.get("user");
    const body = await c.req.json();
    
    const { supplierId, warehouseId, items, notes } = body;
    
    if (!supplierId) {
      return c.json({ error: "المورد مطلوب" }, 400);
    }
    if (!items || items.length === 0) {
      return c.json({ error: "يجب إضافة منتج واحد على الأقل" }, 400);
    }
    
    const batchNumber = await generateBatchNumber();
    const batchId = `batch_${Date.now()}`;
    
    // حساب إجمالي الكمية
    const totalItems = items.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0);
    
    // إنشاء الوجبة
    await db.insert(purchaseBatches).values({
      id: batchId,
      batchNumber,
      supplierId,
      warehouseId,
      status: "awaiting_prices",
      totalItems,
      notes,
      createdBy: user?.userId || "system",
    });
    
    // إضافة البنود (بدون أسعار)
    for (const item of items) {
      await db.insert(purchaseBatchItems).values({
        id: `batch_item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        batchId,
        productId: item.productId || null,
        productName: item.productName,
        brand: item.brand,
        model: item.model,
        specs: item.specs ? JSON.stringify(item.specs) : null,
        quantity: item.quantity || 1,
        notes: item.notes,
      });
    }
    
    // TODO: إرسال إشعار للمدير
    
    return c.json({
      success: true,
      message: "تم إنشاء الوجبة بنجاح - بانتظار إضافة الأسعار",
      batch: {
        id: batchId,
        batchNumber,
        status: "awaiting_prices",
      },
    });
  } catch (error) {
    console.error("POST /batches error:", error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

// ═══════════════════════════════════════════════════════════════
// إضافة أسعار الشراء (المدير فقط)
// ═══════════════════════════════════════════════════════════════
app.patch("/batches/:id/prices", async (c) => {
  try {
    const user = c.get("user");
    const id = c.req.param("id");
    
    // التحقق من الصلاحية
    const isManager = user?.role === "admin" || user?.role === "owner" || user?.role === "manager";
    if (!isManager) {
      return c.json({ error: "غير مصرح - المدير فقط يمكنه إضافة الأسعار" }, 403);
    }
    
    const body = await c.req.json();
    const { items } = body; // [{itemId, unitCost}]
    
    // التحقق من وجود الوجبة
    const batch = await db
      .select()
      .from(purchaseBatches)
      .where(eq(purchaseBatches.id, id))
      .limit(1);
    
    if (batch.length === 0) {
      return c.json({ error: "الوجبة غير موجودة" }, 404);
    }
    
    if (batch[0].status !== "awaiting_prices") {
      return c.json({ error: "لا يمكن تعديل الأسعار - الحالة غير مناسبة" }, 400);
    }
    
    let totalCost = 0;
    
    // تحديث أسعار البنود
    for (const item of items) {
      const itemRecord = await db
        .select()
        .from(purchaseBatchItems)
        .where(eq(purchaseBatchItems.id, item.itemId))
        .limit(1);
      
      if (itemRecord.length > 0) {
        const itemTotal = (item.unitCost || 0) * (itemRecord[0].quantity || 1);
        totalCost += itemTotal;
        
        await db
          .update(purchaseBatchItems)
          .set({
            unitCost: item.unitCost,
            totalCost: itemTotal,
          })
          .where(eq(purchaseBatchItems.id, item.itemId));
      }
    }
    
    // تحديث الوجبة
    await db
      .update(purchaseBatches)
      .set({
        status: "ready_for_receiving",
        totalCost,
        pricesAddedBy: user?.userId,
        pricesAddedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(purchaseBatches.id, id));
    
    // TODO: إرسال إشعار للفاحص
    
    return c.json({
      success: true,
      message: "تم إضافة الأسعار - الوجبة جاهزة للاستلام",
      totalCost,
    });
  } catch (error) {
    console.error("PATCH /batches/:id/prices error:", error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

// ═══════════════════════════════════════════════════════════════
// استلام وفحص الأجهزة (الفاحص)
// ═══════════════════════════════════════════════════════════════
app.post("/batches/:id/receive", async (c) => {
  try {
    const user = c.get("user");
    const id = c.req.param("id");
    const body = await c.req.json();
    
    const { devices } = body;
    // devices: [{batchItemId, actualSpecs, inspectionStatus, inspectionNotes, defects}]
    
    const result = await db.transaction(async (tx) => {
      const batch = await tx
        .select()
        .from(purchaseBatches)
        .where(eq(purchaseBatches.id, id))
        .limit(1);
      
      if (batch.length === 0) {
        throw new Error("الوجبة غير موجودة");
      }
      
      if (batch[0].status !== "ready_for_receiving" && batch[0].status !== "receiving") {
        throw new Error("الوجبة غير جاهزة للاستلام");
      }
      
      const batchItems = await tx
        .select()
        .from(purchaseBatchItems)
        .where(eq(purchaseBatchItems.batchId, id));
      
      const itemsMap = new Map(batchItems.map(i => [i.id, i]));
      
      for (const device of devices) {
        const serialNumber = await generateSerialNumber();
        const batchItem = itemsMap.get(device.batchItemId);
        
        await tx.insert(purchaseBatchDevices).values({
          id: `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          batchId: id,
          batchItemId: device.batchItemId,
          serialNumber,
          productId: batchItem?.productId,
          actualSpecs: device.actualSpecs ? JSON.stringify(device.actualSpecs) : null,
          purchaseCost: batchItem?.unitCost,
          inspectionStatus: device.inspectionStatus || "passed",
          inspectionNotes: device.inspectionNotes,
          defects: device.defects ? JSON.stringify(device.defects) : null,
          specsVariance: device.specsVariance ? JSON.stringify(device.specsVariance) : null,
          inspectionPhotos: device.photos ? JSON.stringify(device.photos) : null,
          inspectedBy: user?.userId,
          inspectedAt: new Date(),
          warehouseId: batch[0].warehouseId,
        });
        
        if (batchItem) {
          await tx
            .update(purchaseBatchItems)
            .set({
              receivedQuantity: sql`${purchaseBatchItems.receivedQuantity} + 1`,
            })
            .where(eq(purchaseBatchItems.id, batchItem.id));
        }
      }
      
      const receivedCount = await tx
        .select({ count: sql<number>`count(*)` })
        .from(purchaseBatchDevices)
        .where(eq(purchaseBatchDevices.batchId, id));
      
      const totalReceived = Number(receivedCount[0]?.count || 0);
      let newStatus = "receiving";
      if (totalReceived >= (batch[0].totalItems || 0)) {
        newStatus = "received";
      }
      
      await tx
        .update(purchaseBatches)
        .set({
          status: newStatus,
          receivedItems: totalReceived,
          receivedBy: user?.userId,
          receivedAt: newStatus === "received" ? new Date() : null,
          updatedAt: new Date(),
        })
        .where(eq(purchaseBatches.id, id));
      
      if (newStatus === "received") {
        const totalCost = batch[0].totalCost ?? 0;
        if (totalCost > 0) {
          await ensureSystemAccounts(tx);
          const inventoryId = await getAccountIdByCode(tx, SYSTEM_ACCOUNT_CODES.INVENTORY);
          const payableId = await getAccountIdByCode(tx, SYSTEM_ACCOUNT_CODES.PAYABLE);
          if (inventoryId && payableId) {
            await createAndPostJournalEntryWithTx(tx, {
              entryDate: new Date().toISOString().slice(0, 10),
              description: `استلام وجبة شراء ${batch[0].batchNumber}`,
              referenceType: "purchase_batch",
              referenceId: id,
              lines: [
                { accountId: inventoryId, debit: totalCost, description: `مخزون - وجبة ${batch[0].batchNumber}` },
                { accountId: payableId, credit: totalCost, description: `ذمم دائنة - وجبة ${batch[0].batchNumber}` },
              ],
              createdBy: user?.userId ?? null,
              postedBy: user?.userId ?? null,
            });
          }
        }
        
        const devicesInBatch = await tx
          .select({ productId: purchaseBatchDevices.productId })
          .from(purchaseBatchDevices)
          .where(eq(purchaseBatchDevices.batchId, id));
        
        const productCounts = new Map<string, number>();
        for (const d of devicesInBatch) {
          const pid = d.productId;
          if (pid) {
            productCounts.set(pid, (productCounts.get(pid) ?? 0) + 1);
          }
        }
        for (const [productId, count] of productCounts) {
          const [p] = await tx.select({ quantity: products.quantity }).from(products).where(eq(products.id, productId)).limit(1);
          const current = p?.quantity ?? 0;
          await tx.update(products).set({ quantity: current + count }).where(eq(products.id, productId));
        }
      }
      
      return { totalReceived, totalItems: batch[0].totalItems, newStatus };
    });
    
    return c.json({
      success: true,
      message: `تم استلام ${devices.length} جهاز`,
      receivedItems: result.totalReceived,
      totalItems: result.totalItems,
      status: result.newStatus,
      serials: devices.map((_, i) => `Serial generated for device ${i + 1}`),
    });
  } catch (error) {
    console.error("POST /batches/:id/receive error:", error);
    const message = error instanceof Error ? error.message : "فشل في إنشاء السجل";
    return c.json({ error: message }, error instanceof Error && message.includes("الوجبة") ? 404 : 500);
  }
});

// ═══════════════════════════════════════════════════════════════
// إضافة أسعار البيع (المدير فقط)
// ═══════════════════════════════════════════════════════════════
app.patch("/batches/:id/selling-prices", async (c) => {
  try {
    const user = c.get("user");
    const id = c.req.param("id");
    
    // التحقق من الصلاحية
    const isManager = user?.role === "admin" || user?.role === "owner" || user?.role === "manager";
    if (!isManager) {
      return c.json({ error: "غير مصرح - المدير فقط يمكنه تحديد أسعار البيع" }, 403);
    }
    
    const body = await c.req.json();
    const { devices } = body; // [{deviceId, sellingPrice}]
    
    // التحقق من وجود الوجبة
    const batch = await db
      .select()
      .from(purchaseBatches)
      .where(eq(purchaseBatches.id, id))
      .limit(1);
    
    if (batch.length === 0) {
      return c.json({ error: "الوجبة غير موجودة" }, 404);
    }
    
    if (batch[0].status !== "received") {
      return c.json({ error: "يجب استلام الوجبة أولاً" }, 400);
    }
    
    // تحديث أسعار البيع للأجهزة
    for (const device of devices) {
      await db
        .update(purchaseBatchDevices)
        .set({ sellingPrice: device.sellingPrice })
        .where(eq(purchaseBatchDevices.id, device.deviceId));
      
      // إنشاء سجل في جدول السيريالات الرئيسي
      const deviceRecord = await db
        .select()
        .from(purchaseBatchDevices)
        .where(eq(purchaseBatchDevices.id, device.deviceId))
        .limit(1);
      
      if (deviceRecord.length > 0) {
        const d = deviceRecord[0];
        
        // التحقق من عدم وجود السيريال مسبقاً
        const existingSerial = await db
          .select()
          .from(serialNumbers)
          .where(eq(serialNumbers.serialNumber, d.serialNumber))
          .limit(1);
        
        if (existingSerial.length === 0) {
          await db.insert(serialNumbers).values({
            id: `serial_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            serialNumber: d.serialNumber,
            productId: d.productId || "",
            purchaseCost: d.purchaseCost,
            sellingPrice: device.sellingPrice,
            status: "available",
            warehouseId: d.warehouseId,
            supplierId: batch[0].supplierId,
            purchaseInvoiceId: batch[0].id,
            purchaseDate: new Date(),
            condition: d.inspectionStatus === "passed" ? "good" : "fair",
            notes: d.inspectionNotes,
            createdBy: user?.userId,
          });
        }
      }
    }
    
    // تحديث الوجبة
    await db
      .update(purchaseBatches)
      .set({
        status: "ready_to_sell",
        sellingPricesAddedBy: user?.userId,
        sellingPricesAddedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(purchaseBatches.id, id));
    
    return c.json({
      success: true,
      message: "تم تحديد أسعار البيع - الأجهزة جاهزة للبيع",
    });
  } catch (error) {
    console.error("PATCH /batches/:id/selling-prices error:", error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

// ═══════════════════════════════════════════════════════════════
// إحصائيات الوجبات
// ═══════════════════════════════════════════════════════════════
app.get("/stats", async (c) => {
  try {
    const awaitingPrices = await db
      .select({ count: sql<number>`count(*)` })
      .from(purchaseBatches)
      .where(eq(purchaseBatches.status, "awaiting_prices"));
    
    const readyForReceiving = await db
      .select({ count: sql<number>`count(*)` })
      .from(purchaseBatches)
      .where(eq(purchaseBatches.status, "ready_for_receiving"));
    
    const receiving = await db
      .select({ count: sql<number>`count(*)` })
      .from(purchaseBatches)
      .where(eq(purchaseBatches.status, "receiving"));
    
    const received = await db
      .select({ count: sql<number>`count(*)` })
      .from(purchaseBatches)
      .where(eq(purchaseBatches.status, "received"));
    
    const readyToSell = await db
      .select({ count: sql<number>`count(*)` })
      .from(purchaseBatches)
      .where(eq(purchaseBatches.status, "ready_to_sell"));
    
    return c.json({
      awaitingPrices: Number(awaitingPrices[0]?.count || 0),
      readyForReceiving: Number(readyForReceiving[0]?.count || 0),
      receiving: Number(receiving[0]?.count || 0),
      received: Number(received[0]?.count || 0),
      readyToSell: Number(readyToSell[0]?.count || 0),
    });
  } catch (error) {
    console.error("GET /stats error:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

export default app;

/**
 * نظام التوصيل والشحن - API Routes
 * ─────────────────────────────────
 */

import { Hono } from "hono";
import {
  db,
  deliveryCompanies,
  shipments,
  shipmentTracking,
  shipmentItems,
  deliveryCollections,
  deliveryZones,
  invoices,
  customers,
} from "@bi-management/database";
import { eq, desc, sql, and } from "drizzle-orm";
import { authMiddleware } from "../lib/auth.js";

const app = new Hono();

app.use("*", authMiddleware);

// ═══════════════════════════════════════════════════════════════
// توليد رقم الشحنة
// ═══════════════════════════════════════════════════════════════
async function generateShipmentNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, "0");
  const day = String(new Date().getDate()).padStart(2, "0");
  
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(shipments)
    .where(sql`DATE(created_at) = CURRENT_DATE`);
  
  const count = Number(result[0]?.count || 0) + 1;
  return `SHP-${year}${month}${day}-${String(count).padStart(4, "0")}`;
}

// ═══════════════════════════════════════════════════════════════
// شركات التوصيل
// ═══════════════════════════════════════════════════════════════

// قائمة الشركات
app.get("/companies", async (c) => {
  try {
    const companies = await db
      .select()
      .from(deliveryCompanies)
      .where(eq(deliveryCompanies.isActive, 1))
      .orderBy(deliveryCompanies.name);
    
    return c.json({ companies });
  } catch (error) {
    console.error("Error in GET /companies:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

// تفاصيل شركة
app.get("/companies/:id", async (c) => {
  try {
    const id = c.req.param("id");
    
    const company = await db
      .select()
      .from(deliveryCompanies)
      .where(eq(deliveryCompanies.id, id))
      .limit(1);
    
    if (company.length === 0) {
      return c.json({ error: "الشركة غير موجودة" }, 404);
    }
    
    // جلب المناطق
    const zones = await db
      .select()
      .from(deliveryZones)
      .where(eq(deliveryZones.deliveryCompanyId, id));
    
    // إحصائيات
    const pendingShipments = await db
      .select({ count: sql<number>`count(*)` })
      .from(shipments)
      .where(
        and(
          eq(shipments.deliveryCompanyId, id),
          sql`status NOT IN ('delivered', 'returned', 'cancelled')`
        )
      );
    
    return c.json({
      company: company[0],
      zones,
      stats: {
        pendingShipments: Number(pendingShipments[0]?.count || 0),
      },
    });
  } catch (error) {
    console.error("Error in GET /companies/:id:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

// إنشاء شركة
app.post("/companies", async (c) => {
  try {
    const user = c.get("user");
    const body = await c.req.json();
    
    const id = `dc_${Date.now()}`;
    
    await db.insert(deliveryCompanies).values({
      id,
      code: body.code,
      name: body.name,
      nameAr: body.nameAr,
      type: body.type || "company",
      phone: body.phone,
      phone2: body.phone2,
      email: body.email,
      address: body.address,
      contactPerson: body.contactPerson,
      feeType: body.feeType || "fixed",
      feeAmount: body.feeAmount || 0,
      requiresVideo: body.requiresVideo ?? 1,
      notes: body.notes,
    });
    
    return c.json({ success: true, id });
  } catch (error) {
    console.error("Error in POST /companies:", error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

// تحديث شركة
app.patch("/companies/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();
    
    await db
      .update(deliveryCompanies)
      .set({
        ...body,
        updatedAt: new Date(),
      })
      .where(eq(deliveryCompanies.id, id));
    
    return c.json({ success: true });
  } catch (error) {
    console.error("Error in PATCH /companies/:id:", error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

// إحصائيات الشركات
app.get("/companies-stats", async (c) => {
  try {
    const companies = await db
      .select({
        company: deliveryCompanies,
        pendingCount: sql<number>`(
          SELECT COUNT(*) FROM shipments 
          WHERE delivery_company_id = delivery_companies.id 
          AND status NOT IN ('delivered', 'returned', 'cancelled')
        )`,
        pendingAmount: sql<number>`(
          SELECT COALESCE(SUM(cod_amount - collected_amount), 0) FROM shipments 
          WHERE delivery_company_id = delivery_companies.id 
          AND status NOT IN ('delivered', 'returned', 'cancelled')
        )`,
      })
      .from(deliveryCompanies)
      .where(eq(deliveryCompanies.isActive, 1));
    
    return c.json({
      companies: companies.map(c => ({
        ...c.company,
        pendingCount: Number(c.pendingCount || 0),
        pendingAmount: Number(c.pendingAmount || 0),
      })),
    });
  } catch (error) {
    console.error("Error in GET /companies-stats:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

// ═══════════════════════════════════════════════════════════════
// الشحنات
// ═══════════════════════════════════════════════════════════════

// قائمة الشحنات
app.get("/shipments", async (c) => {
  try {
    const status = c.req.query("status");
    const companyId = c.req.query("companyId");
    
    let results = await db
      .select({
        shipment: shipments,
        company: deliveryCompanies,
        customer: customers,
      })
      .from(shipments)
      .leftJoin(deliveryCompanies, eq(shipments.deliveryCompanyId, deliveryCompanies.id))
      .leftJoin(customers, eq(shipments.customerId, customers.id))
      .orderBy(desc(shipments.createdAt));
    
    // فلترة
    if (status) {
      results = results.filter(r => r.shipment.status === status);
    }
    if (companyId) {
      results = results.filter(r => r.shipment.deliveryCompanyId === companyId);
    }
    
    return c.json({
      shipments: results.map(r => ({
        ...r.shipment,
        company: r.company,
        customer: r.customer,
      })),
    });
  } catch (error) {
    console.error("Error in GET /shipments:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

// تفاصيل شحنة
app.get("/shipments/:id", async (c) => {
  try {
    const id = c.req.param("id");
    
    const shipment = await db
      .select({
        shipment: shipments,
        company: deliveryCompanies,
        customer: customers,
        invoice: invoices,
      })
      .from(shipments)
      .leftJoin(deliveryCompanies, eq(shipments.deliveryCompanyId, deliveryCompanies.id))
      .leftJoin(customers, eq(shipments.customerId, customers.id))
      .leftJoin(invoices, eq(shipments.invoiceId, invoices.id))
      .where(eq(shipments.id, id))
      .limit(1);
    
    if (shipment.length === 0) {
      return c.json({ error: "الشحنة غير موجودة" }, 404);
    }
    
    // جلب البنود
    const items = await db
      .select()
      .from(shipmentItems)
      .where(eq(shipmentItems.shipmentId, id));
    
    // جلب سجل التتبع
    const tracking = await db
      .select()
      .from(shipmentTracking)
      .where(eq(shipmentTracking.shipmentId, id))
      .orderBy(desc(shipmentTracking.recordedAt));
    
    return c.json({
      ...shipment[0].shipment,
      company: shipment[0].company,
      customer: shipment[0].customer,
      invoice: shipment[0].invoice,
      items,
      tracking,
    });
  } catch (error) {
    console.error("Error in GET /shipments/:id:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

// إنشاء شحنة
app.post("/shipments", async (c) => {
  try {
    const user = c.get("user");
    const body = await c.req.json();
    
    const shipmentNumber = await generateShipmentNumber();
    const id = `shp_${Date.now()}`;
    
    await db.insert(shipments).values({
      id,
      shipmentNumber,
      invoiceId: body.invoiceId,
      deliveryCompanyId: body.deliveryCompanyId,
      customerId: body.customerId,
      status: "preparing",
      recipientName: body.recipientName,
      recipientPhone: body.recipientPhone,
      recipientPhone2: body.recipientPhone2,
      deliveryAddress: body.deliveryAddress,
      city: body.city,
      area: body.area,
      codAmount: body.codAmount || 0,
      deliveryFee: body.deliveryFee || 0,
      deliveryNotes: body.deliveryNotes,
      notes: body.notes,
      createdBy: user?.userId,
    });
    
    // إضافة البنود
    if (body.items && body.items.length > 0) {
      for (const item of body.items) {
        await db.insert(shipmentItems).values({
          id: `shp_item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          shipmentId: id,
          invoiceItemId: item.invoiceItemId,
          serialNumber: item.serialNumber,
          productName: item.productName,
          quantity: item.quantity || 1,
        });
      }
    }
    
    // إضافة سجل تتبع
    await db.insert(shipmentTracking).values({
      id: `track_${Date.now()}`,
      shipmentId: id,
      status: "preparing",
      statusAr: "قيد التجهيز",
      description: "تم إنشاء الشحنة",
      recordedBy: user?.userId,
    });
    
    return c.json({ success: true, id, shipmentNumber });
  } catch (error) {
    console.error("Error in POST /shipments:", error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

// تجهيز الشحنة (إضافة فيديو وصور)
app.patch("/shipments/:id/prepare", async (c) => {
  try {
    const user = c.get("user");
    const id = c.req.param("id");
    const body = await c.req.json();
    
    await db
      .update(shipments)
      .set({
        status: "ready",
        packagingVideoUrl: body.videoUrl,
        packagingPhotos: body.photos ? JSON.stringify(body.photos) : null,
        preparedBy: user?.userId,
        preparedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(shipments.id, id));
    
    // سجل التتبع
    await db.insert(shipmentTracking).values({
      id: `track_${Date.now()}`,
      shipmentId: id,
      status: "ready",
      statusAr: "جاهزة للتسليم",
      description: "تم تجهيز الشحنة وتصوير فيديو التغليف",
      recordedBy: user?.userId,
    });
    
    return c.json({ success: true });
  } catch (error) {
    console.error("Error in PATCH /shipments/:id/prepare:", error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

// تسليم لشركة التوصيل
app.patch("/shipments/:id/handover", async (c) => {
  try {
    const user = c.get("user");
    const id = c.req.param("id");
    const body = await c.req.json();
    
    await db
      .update(shipments)
      .set({
        status: "handed_over",
        trackingNumber: body.trackingNumber,
        handedOverBy: user?.userId,
        handedOverAt: new Date(),
        expectedDeliveryDate: body.expectedDeliveryDate ? new Date(body.expectedDeliveryDate) : null,
        updatedAt: new Date(),
      })
      .where(eq(shipments.id, id));
    
    // تحديث عداد الشركة
    const shipment = await db.select().from(shipments).where(eq(shipments.id, id)).limit(1);
    if (shipment.length > 0) {
      await db
        .update(deliveryCompanies)
        .set({
          pendingOrders: sql`${deliveryCompanies.pendingOrders} + 1`,
          balance: sql`${deliveryCompanies.balance} + ${shipment[0].codAmount}`,
        })
        .where(eq(deliveryCompanies.id, shipment[0].deliveryCompanyId));
    }
    
    // سجل التتبع
    await db.insert(shipmentTracking).values({
      id: `track_${Date.now()}`,
      shipmentId: id,
      status: "handed_over",
      statusAr: "سُلمت لشركة التوصيل",
      description: `رقم التتبع: ${body.trackingNumber || "غير متوفر"}`,
      recordedBy: user?.userId,
    });
    
    return c.json({ success: true });
  } catch (error) {
    console.error("Error in PATCH /shipments/:id/handover:", error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

// تأكيد التسليم
app.patch("/shipments/:id/deliver", async (c) => {
  try {
    const user = c.get("user");
    const id = c.req.param("id");
    const body = await c.req.json();
    
    await db
      .update(shipments)
      .set({
        status: "delivered",
        collectedAmount: body.collectedAmount,
        deliveryProofPhoto: body.proofPhoto,
        deliveredAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(shipments.id, id));
    
    // تحديث بنود الشحنة
    await db
      .update(shipmentItems)
      .set({ status: "delivered" })
      .where(eq(shipmentItems.shipmentId, id));
    
    // سجل التتبع
    await db.insert(shipmentTracking).values({
      id: `track_${Date.now()}`,
      shipmentId: id,
      status: "delivered",
      statusAr: "تم التسليم",
      description: body.notes || "تم تسليم الشحنة للعميل بنجاح",
      recordedBy: user?.userId,
    });
    
    return c.json({ success: true });
  } catch (error) {
    console.error("Error in PATCH /shipments/:id/deliver:", error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

// تسجيل مرتجع
app.patch("/shipments/:id/return", async (c) => {
  try {
    const user = c.get("user");
    const id = c.req.param("id");
    const body = await c.req.json();
    
    const isPartial = body.returnedItems && body.returnedItems.length > 0;
    
    await db
      .update(shipments)
      .set({
        status: isPartial ? "partially_returned" : "returned",
        returnReason: body.reason,
        returnedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(shipments.id, id));
    
    // تحديث البنود المرتجعة
    if (body.returnedItems) {
      for (const item of body.returnedItems) {
        await db
          .update(shipmentItems)
          .set({
            status: "returned",
            returnReason: item.reason,
            returnCondition: item.condition,
          })
          .where(eq(shipmentItems.id, item.id));
      }
    } else {
      // كل البنود مرتجعة
      await db
        .update(shipmentItems)
        .set({
          status: "returned",
          returnReason: body.reason,
        })
        .where(eq(shipmentItems.shipmentId, id));
    }
    
    // سجل التتبع
    await db.insert(shipmentTracking).values({
      id: `track_${Date.now()}`,
      shipmentId: id,
      status: isPartial ? "partially_returned" : "returned",
      statusAr: isPartial ? "مرتجع جزئي" : "مرتجع",
      description: body.reason || "تم إرجاع الشحنة",
      recordedBy: user?.userId,
    });
    
    return c.json({ success: true });
  } catch (error) {
    console.error("Error in PATCH /shipments/:id/return:", error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

// ═══════════════════════════════════════════════════════════════
// التحصيلات
// ═══════════════════════════════════════════════════════════════

// تسجيل تحصيل
app.post("/collections", async (c) => {
  try {
    const user = c.get("user");
    const body = await c.req.json();
    
    const id = `col_${Date.now()}`;
    const collectionNumber = `COL-${Date.now()}`;
    
    await db.insert(deliveryCollections).values({
      id,
      collectionNumber,
      deliveryCompanyId: body.deliveryCompanyId,
      expectedAmount: body.expectedAmount,
      receivedAmount: body.receivedAmount,
      difference: (body.receivedAmount || 0) - (body.expectedAmount || 0),
      paymentMethod: body.paymentMethod,
      referenceNumber: body.referenceNumber,
      bankName: body.bankName,
      shipmentsCount: body.shipmentIds?.length || 0,
      shipmentIds: body.shipmentIds ? JSON.stringify(body.shipmentIds) : null,
      notes: body.notes,
      receivedBy: user?.userId,
    });
    
    // تحديث الشحنات
    if (body.shipmentIds) {
      for (const shipmentId of body.shipmentIds) {
        const shipment = await db.select().from(shipments).where(eq(shipments.id, shipmentId)).limit(1);
        if (shipment.length > 0) {
          await db
            .update(shipments)
            .set({
              collectedAmount: shipment[0].codAmount,
              updatedAt: new Date(),
            })
            .where(eq(shipments.id, shipmentId));
        }
      }
    }
    
    // تحديث رصيد الشركة
    await db
      .update(deliveryCompanies)
      .set({
        balance: sql`${deliveryCompanies.balance} - ${body.receivedAmount}`,
        pendingOrders: sql`${deliveryCompanies.pendingOrders} - ${body.shipmentIds?.length || 0}`,
      })
      .where(eq(deliveryCompanies.id, body.deliveryCompanyId));
    
    return c.json({ success: true, id, collectionNumber });
  } catch (error) {
    console.error("Error in POST /collections:", error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

// قائمة التحصيلات
app.get("/collections", async (c) => {
  try {
    const companyId = c.req.query("companyId");
    
    let results = await db
      .select({
        collection: deliveryCollections,
        company: deliveryCompanies,
      })
      .from(deliveryCollections)
      .leftJoin(deliveryCompanies, eq(deliveryCollections.deliveryCompanyId, deliveryCompanies.id))
      .orderBy(desc(deliveryCollections.createdAt));
    
    if (companyId) {
      results = results.filter(r => r.collection.deliveryCompanyId === companyId);
    }
    
    return c.json({
      collections: results.map(r => ({
        ...r.collection,
        company: r.company,
      })),
    });
  } catch (error) {
    console.error("Error in GET /collections:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

// ═══════════════════════════════════════════════════════════════
// إحصائيات
// ═══════════════════════════════════════════════════════════════

app.get("/stats", async (c) => {
  try {
    const preparing = await db
      .select({ count: sql<number>`count(*)` })
      .from(shipments)
      .where(eq(shipments.status, "preparing"));
    
    const ready = await db
      .select({ count: sql<number>`count(*)` })
      .from(shipments)
      .where(eq(shipments.status, "ready"));
    
    const inTransit = await db
      .select({ count: sql<number>`count(*)` })
      .from(shipments)
      .where(sql`status IN ('handed_over', 'in_transit')`);
    
    const delivered = await db
      .select({ count: sql<number>`count(*)` })
      .from(shipments)
      .where(eq(shipments.status, "delivered"));
    
    const returned = await db
      .select({ count: sql<number>`count(*)` })
      .from(shipments)
      .where(sql`status IN ('returned', 'partially_returned')`);
    
    const pendingAmount = await db
      .select({ total: sql<number>`COALESCE(SUM(cod_amount - collected_amount), 0)` })
      .from(shipments)
      .where(sql`status NOT IN ('delivered', 'returned', 'cancelled')`);
    
    return c.json({
      preparing: Number(preparing[0]?.count || 0),
      ready: Number(ready[0]?.count || 0),
      inTransit: Number(inTransit[0]?.count || 0),
      delivered: Number(delivered[0]?.count || 0),
      returned: Number(returned[0]?.count || 0),
      pendingAmount: Number(pendingAmount[0]?.total || 0),
    });
  } catch (error) {
    console.error("Error in GET /stats:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

export default app;

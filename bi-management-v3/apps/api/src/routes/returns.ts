/**
 * API Routes - نظام تتبع المرتجعات للموردين
 */
import { Hono } from "hono";
import {
  db,
  returnRequests,
  returnHistory,
  returnAlertSettings,
  returnItems,
  suppliers,
  products,
  serialNumbers,
  users,
} from "@bi-management/database";
import { eq, desc, sql, and, or, gte, lte, isNull, count, asc } from "drizzle-orm";
import { authMiddleware } from "../lib/auth.js";
import { nanoid } from "nanoid";

const app = new Hono();

app.use("*", authMiddleware);

/**
 * توليد رقم المرتجع
 */
async function generateReturnNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, "0");

  const [result] = await db
    .select({ count: count() })
    .from(returnRequests)
    .where(
      sql`EXTRACT(YEAR FROM ${returnRequests.createdAt}) = ${year} AND EXTRACT(MONTH FROM ${returnRequests.createdAt}) = ${Number(month)}`
    );

  const num = (result?.count || 0) + 1;
  return `RET-${year}${month}-${String(num).padStart(4, "0")}`;
}

/**
 * حساب لون التنبيه
 */
function calculateColorCode(createdAt: Date, settings: any): string {
  const daysPending = Math.floor(
    (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
  );

  const yellowDays = settings?.yellowDays || 7;
  const orangeDays = settings?.orangeDays || 14;
  const redDays = settings?.redDays || 30;

  if (daysPending >= redDays) return "red";
  if (daysPending >= orangeDays) return "orange";
  if (daysPending >= yellowDays) return "yellow";
  return "green";
}

/**
 * جلب قائمة المرتجعات
 */
app.get("/", async (c) => {
  try {
    const status = c.req.query("status");
    const supplierId = c.req.query("supplierId");
    const colorCode = c.req.query("colorCode");
    const fromDate = c.req.query("fromDate");
    const toDate = c.req.query("toDate");
    const page = parseInt(c.req.query("page") || "1");
    const limit = parseInt(c.req.query("limit") || "20");
    const offset = (page - 1) * limit;

    let query = db
      .select({
        id: returnRequests.id,
        returnNumber: returnRequests.returnNumber,
        supplierId: returnRequests.supplierId,
        supplierName: returnRequests.supplierName,
        returnType: returnRequests.returnType,
        status: returnRequests.status,
        colorCode: returnRequests.colorCode,
        totalItems: returnRequests.totalItems,
        createdAt: returnRequests.createdAt,
        sentAt: returnRequests.sentAt,
        receivedAt: returnRequests.receivedAt,
        resolvedAt: returnRequests.resolvedAt,
        notes: returnRequests.notes,
      })
      .from(returnRequests)
      .orderBy(desc(returnRequests.createdAt))
      .limit(limit)
      .offset(offset);

    const conditions = [];
    if (status) conditions.push(eq(returnRequests.status, status));
    if (supplierId) conditions.push(eq(returnRequests.supplierId, supplierId));
    if (colorCode) conditions.push(eq(returnRequests.colorCode, colorCode));
    if (fromDate) conditions.push(gte(returnRequests.createdAt, new Date(fromDate)));
    if (toDate) conditions.push(lte(returnRequests.createdAt, new Date(toDate)));

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    const returns = await query;

    // حساب الأيام المعلقة لكل مرتجع
    const returnsWithDays = returns.map((r) => ({
      ...r,
      daysPending: r.status === "pending" || r.status === "sent"
        ? Math.floor((Date.now() - new Date(r.createdAt!).getTime()) / (1000 * 60 * 60 * 24))
        : null,
    }));

    // إحصائيات سريعة
    const [stats] = await db
      .select({
        total: count(),
        pending: sql<number>`COUNT(CASE WHEN ${returnRequests.status} = 'pending' THEN 1 END)`,
        sent: sql<number>`COUNT(CASE WHEN ${returnRequests.status} = 'sent' THEN 1 END)`,
        received: sql<number>`COUNT(CASE WHEN ${returnRequests.status} = 'received' THEN 1 END)`,
        resolved: sql<number>`COUNT(CASE WHEN ${returnRequests.status} = 'resolved' THEN 1 END)`,
        red: sql<number>`COUNT(CASE WHEN ${returnRequests.colorCode} = 'red' THEN 1 END)`,
        orange: sql<number>`COUNT(CASE WHEN ${returnRequests.colorCode} = 'orange' THEN 1 END)`,
        yellow: sql<number>`COUNT(CASE WHEN ${returnRequests.colorCode} = 'yellow' THEN 1 END)`,
      })
      .from(returnRequests);

    return c.json({
      returns: returnsWithDays,
      stats,
      pagination: {
        page,
        limit,
        total: stats?.total || 0,
      },
    });
  } catch (error) {
    console.error("Get returns error:", error);
    return c.json({ error: "فشل في جلب المرتجعات" }, 500);
  }
});

/**
 * جلب تفاصيل مرتجع
 */
app.get("/:id", async (c) => {
  try {
    const id = c.req.param("id");

    const [returnRequest] = await db
      .select()
      .from(returnRequests)
      .where(eq(returnRequests.id, id));

    if (!returnRequest) {
      return c.json({ error: "المرتجع غير موجود" }, 404);
    }

    // جلب العناصر
    const items = await db
      .select()
      .from(returnItems)
      .where(eq(returnItems.returnRequestId, id));

    // جلب السجل
    const history = await db
      .select({
        id: returnHistory.id,
        eventType: returnHistory.eventType,
        fromStatus: returnHistory.fromStatus,
        toStatus: returnHistory.toStatus,
        details: returnHistory.details,
        performedAt: returnHistory.performedAt,
        performedByName: users.fullName,
      })
      .from(returnHistory)
      .leftJoin(users, eq(returnHistory.performedBy, users.id))
      .where(eq(returnHistory.returnRequestId, id))
      .orderBy(desc(returnHistory.performedAt));

    // حساب الأيام
    const daysPending =
      returnRequest.status === "pending" || returnRequest.status === "sent"
        ? Math.floor(
            (Date.now() - new Date(returnRequest.createdAt!).getTime()) /
              (1000 * 60 * 60 * 24)
          )
        : null;

    return c.json({
      return: {
        ...returnRequest,
        daysPending,
      },
      items,
      history,
    });
  } catch (error) {
    console.error("Get return error:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

/**
 * إنشاء مرتجع جديد
 */
app.post("/", async (c) => {
  try {
    const currentUser = c.get("user");
    const body = await c.req.json();
    const { supplierId, returnType, notes, items } = body;

    if (!supplierId || !items || items.length === 0) {
      return c.json({ error: "بيانات غير مكتملة" }, 400);
    }

    // جلب بيانات المورد
    const [supplier] = await db
      .select()
      .from(suppliers)
      .where(eq(suppliers.id, supplierId));

    if (!supplier) {
      return c.json({ error: "المورد غير موجود" }, 404);
    }

    const returnNumber = await generateReturnNumber();
    const returnId = `ret_${nanoid(12)}`;

    // إنشاء المرتجع
    await db.insert(returnRequests).values({
      id: returnId,
      returnNumber,
      supplierId,
      supplierName: supplier.name,
      returnType: returnType || "defective",
      status: "pending",
      colorCode: "green",
      totalItems: items.length,
      notes,
      createdBy: currentUser.userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // إضافة العناصر
    for (const item of items) {
      await db.insert(returnItems).values({
        id: `ri_${nanoid(12)}`,
        returnRequestId: returnId,
        productId: item.productId,
        productName: item.productName,
        productModel: item.productModel,
        serialId: item.serialId,
        serialNumber: item.serialNumber,
        quantity: item.quantity || 1,
        returnReason: item.returnReason,
        reasonDetails: item.reasonDetails,
        itemStatus: "pending",
        photos: item.photos,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // تحديث حالة السيريال إذا وجد
      if (item.serialId) {
        await db
          .update(serialNumbers)
          .set({
            status: "return_pending",
            notes: `مرتجع: ${returnNumber}`,
            updatedAt: new Date(),
          })
          .where(eq(serialNumbers.id, item.serialId));
      }
    }

    // إضافة سجل
    await db.insert(returnHistory).values({
      id: `rh_${nanoid(12)}`,
      returnRequestId: returnId,
      eventType: "created",
      toStatus: "pending",
      details: `تم إنشاء طلب المرتجع بواسطة ${currentUser.username}`,
      performedBy: currentUser.userId,
      performedAt: new Date(),
    });

    return c.json({
      success: true,
      returnId,
      returnNumber,
      message: "تم إنشاء طلب المرتجع بنجاح",
    });
  } catch (error) {
    console.error("Create return error:", error);
    return c.json({ error: "فشل في إنشاء المرتجع" }, 500);
  }
});

/**
 * تعديل المرتجع (فقط في حالة pending)
 */
app.put("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const currentUser = c.get("user");
    const body = await c.req.json();

    const [returnRequest] = await db
      .select()
      .from(returnRequests)
      .where(eq(returnRequests.id, id));

    if (!returnRequest) {
      return c.json({ error: "المرتجع غير موجود" }, 404);
    }

    if (returnRequest.status !== "pending") {
      return c.json({ error: "لا يمكن تعديل مرتجع تم إرساله بالفعل" }, 400);
    }

    const updates: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (body.returnType !== undefined) updates.returnType = body.returnType;
    if (body.notes !== undefined) updates.notes = body.notes;
    if (body.internalNotes !== undefined) updates.internalNotes = body.internalNotes;

    await db
      .update(returnRequests)
      .set(updates)
      .where(eq(returnRequests.id, id));

    // إضافة سجل
    await db.insert(returnHistory).values({
      id: `rh_${nanoid(12)}`,
      returnRequestId: id,
      eventType: "updated",
      details: `تم تعديل بيانات المرتجع بواسطة ${currentUser.username}`,
      performedBy: currentUser.userId,
      performedAt: new Date(),
    });

    return c.json({ success: true, message: "تم تحديث المرتجع بنجاح" });
  } catch (error) {
    console.error("Update return error:", error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

/**
 * تحديث حالة المرتجع - إرسال
 */
app.post("/:id/send", async (c) => {
  try {
    const id = c.req.param("id");
    const currentUser = c.get("user");
    const body = await c.req.json();
    const { shippingMethod, trackingNumber, shippingCost, photosBefore } = body;

    const [returnRequest] = await db
      .select()
      .from(returnRequests)
      .where(eq(returnRequests.id, id));

    if (!returnRequest) {
      return c.json({ error: "المرتجع غير موجود" }, 404);
    }

    if (returnRequest.status !== "pending") {
      return c.json({ error: "لا يمكن إرسال هذا المرتجع" }, 400);
    }

    await db
      .update(returnRequests)
      .set({
        status: "sent",
        sentAt: new Date(),
        shippingMethod,
        trackingNumber,
        shippingCost,
        photosBefore,
        updatedAt: new Date(),
      })
      .where(eq(returnRequests.id, id));

    // تحديث حالة العناصر
    await db
      .update(returnItems)
      .set({ itemStatus: "sent", updatedAt: new Date() })
      .where(eq(returnItems.returnRequestId, id));

    // إضافة سجل
    await db.insert(returnHistory).values({
      id: `rh_${nanoid(12)}`,
      returnRequestId: id,
      eventType: "sent",
      fromStatus: "pending",
      toStatus: "sent",
      details: `تم إرسال المرتجع - طريقة الشحن: ${shippingMethod || "غير محدد"}`,
      metadata: { trackingNumber, shippingCost },
      performedBy: currentUser.userId,
      performedAt: new Date(),
    });

    return c.json({ success: true, message: "تم تسجيل إرسال المرتجع" });
  } catch (error) {
    console.error("Send return error:", error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

/**
 * تحديث حالة المرتجع - استلام
 */
app.post("/:id/receive", async (c) => {
  try {
    const id = c.req.param("id");
    const currentUser = c.get("user");
    const body = await c.req.json();
    const { notes } = body;

    const [returnRequest] = await db
      .select()
      .from(returnRequests)
      .where(eq(returnRequests.id, id));

    if (!returnRequest) {
      return c.json({ error: "المرتجع غير موجود" }, 404);
    }

    if (returnRequest.status !== "sent") {
      return c.json({ error: "لا يمكن تأكيد استلام هذا المرتجع" }, 400);
    }

    await db
      .update(returnRequests)
      .set({
        status: "received",
        receivedAt: new Date(),
        internalNotes: notes,
        updatedAt: new Date(),
      })
      .where(eq(returnRequests.id, id));

    // تحديث حالة العناصر
    await db
      .update(returnItems)
      .set({ itemStatus: "received", updatedAt: new Date() })
      .where(eq(returnItems.returnRequestId, id));

    // إضافة سجل
    await db.insert(returnHistory).values({
      id: `rh_${nanoid(12)}`,
      returnRequestId: id,
      eventType: "received",
      fromStatus: "sent",
      toStatus: "received",
      details: `تأكيد استلام المرتجع من قبل المورد`,
      performedBy: currentUser.userId,
      performedAt: new Date(),
    });

    return c.json({ success: true, message: "تم تأكيد استلام المرتجع" });
  } catch (error) {
    console.error("Receive return error:", error);
    return c.json({ error: "فشل في تحديث المرتجع" }, 500);
  }
});

/**
 * معالجة عنصر مرتجع
 */
app.post("/items/:itemId/resolve", async (c) => {
  try {
    const itemId = c.req.param("itemId");
    const currentUser = c.get("user");
    const body = await c.req.json();
    const {
      resolution,
      resolutionNotes,
      replacementSerialId,
      replacementSerialNumber,
      repairCost,
    } = body;

    const [item] = await db
      .select()
      .from(returnItems)
      .where(eq(returnItems.id, itemId));

    if (!item) {
      return c.json({ error: "العنصر غير موجود" }, 404);
    }

    await db
      .update(returnItems)
      .set({
        resolution,
        resolutionNotes,
        replacementSerialId,
        replacementSerialNumber,
        repairCost,
        itemStatus: resolution === "rejected" ? "rejected" : "resolved",
        resolvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(returnItems.id, itemId));

    // تحديث حالة السيريال الأصلي
    if (item.serialId) {
      let newStatus = "available";
      if (resolution === "repaired") newStatus = "available";
      else if (resolution === "replaced") newStatus = "replaced";
      else if (resolution === "rejected") newStatus = "defective";

      await db
        .update(serialNumbers)
        .set({
          status: newStatus,
          notes: `معالجة المرتجع: ${resolution}`,
          updatedAt: new Date(),
        })
        .where(eq(serialNumbers.id, item.serialId));
    }

    // إضافة سجل
    await db.insert(returnHistory).values({
      id: `rh_${nanoid(12)}`,
      returnRequestId: item.returnRequestId,
      returnItemId: itemId,
      eventType: "item_resolved",
      details: `معالجة العنصر: ${resolution} - ${resolutionNotes || ""}`,
      metadata: { resolution, repairCost },
      performedBy: currentUser.userId,
      performedAt: new Date(),
    });

    // التحقق من اكتمال جميع العناصر
    const pendingItems = await db
      .select({ count: count() })
      .from(returnItems)
      .where(
        and(
          eq(returnItems.returnRequestId, item.returnRequestId),
          or(
            eq(returnItems.itemStatus, "pending"),
            eq(returnItems.itemStatus, "sent"),
            eq(returnItems.itemStatus, "received")
          )
        )
      );

    if (pendingItems[0]?.count === 0) {
      await db
        .update(returnRequests)
        .set({
          status: "resolved",
          resolvedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(returnRequests.id, item.returnRequestId));

      await db.insert(returnHistory).values({
        id: `rh_${nanoid(12)}`,
        returnRequestId: item.returnRequestId,
        eventType: "resolved",
        fromStatus: "received",
        toStatus: "resolved",
        details: "تم معالجة جميع عناصر المرتجع",
        performedBy: currentUser.userId,
        performedAt: new Date(),
      });
    }

    return c.json({ success: true, message: "تم معالجة العنصر" });
  } catch (error) {
    console.error("Resolve item error:", error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

/**
 * إرسال تذكير للمورد
 */
app.post("/:id/reminder", async (c) => {
  try {
    const id = c.req.param("id");
    const currentUser = c.get("user");
    const body = await c.req.json();
    const { message, channel } = body;

    const [returnRequest] = await db
      .select()
      .from(returnRequests)
      .where(eq(returnRequests.id, id));

    if (!returnRequest) {
      return c.json({ error: "المرتجع غير موجود" }, 404);
    }

    // تحديث عداد التذكيرات
    await db
      .update(returnRequests)
      .set({
        lastReminderAt: new Date(),
        reminderCount: (returnRequest.reminderCount || 0) + 1,
        updatedAt: new Date(),
      })
      .where(eq(returnRequests.id, id));

    // إضافة سجل
    await db.insert(returnHistory).values({
      id: `rh_${nanoid(12)}`,
      returnRequestId: id,
      eventType: "reminder_sent",
      details: `إرسال تذكير رقم ${(returnRequest.reminderCount || 0) + 1} - ${channel || "system"}`,
      metadata: { message, channel },
      performedBy: currentUser.userId,
      performedAt: new Date(),
    });

    // TODO: إرسال الإشعار الفعلي (WhatsApp, Email, SMS)

    return c.json({ success: true, message: "تم إرسال التذكير" });
  } catch (error) {
    console.error("Send reminder error:", error);
    return c.json({ error: "فشل في إرسال التذكير" }, 500);
  }
});

/**
 * تحديث ألوان التنبيهات (مهمة مجدولة)
 */
app.post("/update-alerts", async (c) => {
  try {
    // جلب إعدادات التنبيهات
    const [settings] = await db.select().from(returnAlertSettings).limit(1);

    // جلب المرتجعات المعلقة
    const pendingReturns = await db
      .select()
      .from(returnRequests)
      .where(
        or(
          eq(returnRequests.status, "pending"),
          eq(returnRequests.status, "sent")
        )
      );

    let updated = 0;
    for (const ret of pendingReturns) {
      const newColor = calculateColorCode(new Date(ret.createdAt!), settings);
      if (newColor !== ret.colorCode) {
        await db
          .update(returnRequests)
          .set({ colorCode: newColor, updatedAt: new Date() })
          .where(eq(returnRequests.id, ret.id));
        updated++;
      }
    }

    return c.json({
      success: true,
      message: `تم تحديث ${updated} مرتجع`,
      total: pendingReturns.length,
    });
  } catch (error) {
    console.error("Update alerts error:", error);
    return c.json({ error: "فشل في تحديث التنبيهات" }, 500);
  }
});

/**
 * إحصائيات المرتجعات
 */
app.get("/stats/summary", async (c) => {
  try {
    const supplierId = c.req.query("supplierId");
    const fromDate = c.req.query("fromDate");
    const toDate = c.req.query("toDate");

    const conditions = [];
    if (supplierId) conditions.push(eq(returnRequests.supplierId, supplierId));
    if (fromDate) conditions.push(gte(returnRequests.createdAt, new Date(fromDate)));
    if (toDate) conditions.push(lte(returnRequests.createdAt, new Date(toDate)));

    let baseQuery = db.select({
      total: count(),
      pending: sql<number>`COUNT(CASE WHEN ${returnRequests.status} = 'pending' THEN 1 END)`,
      sent: sql<number>`COUNT(CASE WHEN ${returnRequests.status} = 'sent' THEN 1 END)`,
      received: sql<number>`COUNT(CASE WHEN ${returnRequests.status} = 'received' THEN 1 END)`,
      resolved: sql<number>`COUNT(CASE WHEN ${returnRequests.status} = 'resolved' THEN 1 END)`,
      totalItems: sql<number>`SUM(${returnRequests.totalItems})`,
    }).from(returnRequests);

    if (conditions.length > 0) {
      baseQuery = baseQuery.where(and(...conditions)) as any;
    }

    const [summary] = await baseQuery;

    // أكثر الموردين مرتجعات
    const topSuppliers = await db
      .select({
        supplierId: returnRequests.supplierId,
        supplierName: returnRequests.supplierName,
        count: count(),
      })
      .from(returnRequests)
      .groupBy(returnRequests.supplierId, returnRequests.supplierName)
      .orderBy(desc(count()))
      .limit(5);

    // المرتجعات المتأخرة (> 14 يوم)
    const overdueCount = await db
      .select({ count: count() })
      .from(returnRequests)
      .where(
        and(
          or(
            eq(returnRequests.status, "pending"),
            eq(returnRequests.status, "sent")
          ),
          sql`${returnRequests.createdAt} < NOW() - INTERVAL '14 days'`
        )
      );

    return c.json({
      summary,
      topSuppliers,
      overdueCount: overdueCount[0]?.count || 0,
    });
  } catch (error) {
    console.error("Get stats error:", error);
    return c.json({ error: "فشل في جلب الإحصائيات" }, 500);
  }
});

/**
 * جلب الموردين للاختيار
 */
app.get("/suppliers", async (c) => {
  try {
    const suppliersList = await db
      .select({
        id: suppliers.id,
        name: suppliers.name,
        phone: suppliers.phone,
        email: suppliers.email,
      })
      .from(suppliers)
      .where(eq(suppliers.isActive, true))
      .orderBy(asc(suppliers.name));

    return c.json({ suppliers: suppliersList });
  } catch (error) {
    console.error("Get suppliers error:", error);
    return c.json({ error: "فشل في جلب الموردين" }, 500);
  }
});

/**
 * البحث عن منتجات/سيريالات للإرجاع
 */
app.get("/search-items", async (c) => {
  try {
    const q = c.req.query("q") || "";
    const supplierId = c.req.query("supplierId");

    if (!q || q.length < 2) {
      return c.json({ items: [] });
    }

    // البحث في السيريالات
    const serials = await db
      .select({
        type: sql<string>`'serial'`,
        id: serialNumbers.id,
        serialNumber: serialNumbers.serialNumber,
        productId: serialNumbers.productId,
        productName: products.name,
        productModel: products.model,
        status: serialNumbers.status,
      })
      .from(serialNumbers)
      .leftJoin(products, eq(serialNumbers.productId, products.id))
      .where(
        and(
          sql`${serialNumbers.serialNumber} ILIKE ${"%" + q + "%"}`,
          eq(serialNumbers.status, "available")
        )
      )
      .limit(10);

    // البحث في المنتجات
    const productsList = await db
      .select({
        type: sql<string>`'product'`,
        id: products.id,
        name: products.name,
        model: products.model,
        sku: products.sku,
      })
      .from(products)
      .where(
        or(
          sql`${products.name} ILIKE ${"%" + q + "%"}`,
          sql`${products.model} ILIKE ${"%" + q + "%"}`,
          sql`${products.sku} ILIKE ${"%" + q + "%"}`
        )
      )
      .limit(10);

    return c.json({
      items: [...serials, ...productsList],
    });
  } catch (error) {
    console.error("Search items error:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

export default app;

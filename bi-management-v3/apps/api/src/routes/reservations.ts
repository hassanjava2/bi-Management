/**
 * API Routes - نظام الحجوزات
 */
import { Hono } from "hono";
import { db, reservations, reservationItems, reservationActivities, customers, products } from "@bi-management/database";
import { eq, and, or, desc, count, sql, like, gte, lte, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";
import { authMiddleware } from "../lib/auth.js";

const app = new Hono();

async function generateReservationNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `RSV-${year}-`;
  const [last] = await db.select({ reservationNumber: reservations.reservationNumber })
    .from(reservations).where(like(reservations.reservationNumber, `${prefix}%`))
    .orderBy(desc(reservations.reservationNumber)).limit(1);
  let nextNum = 1;
  if (last?.reservationNumber) {
    const num = parseInt(last.reservationNumber.replace(prefix, ""), 10);
    if (!isNaN(num)) nextNum = num + 1;
  }
  return `${prefix}${String(nextNum).padStart(6, "0")}`;
}

// جلب الحجوزات
app.get("/", async (c) => {
  try {
    const { status, customerId, search, page = "1", limit = "20" } = c.req.query();
    const conditions = [];
    if (status) conditions.push(inArray(reservations.status, status.split(",")));
    if (customerId) conditions.push(eq(reservations.customerId, customerId));
    if (search) conditions.push(or(like(reservations.reservationNumber, `%${search}%`), like(reservations.customerName, `%${search}%`)));

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    const result = await db.select().from(reservations)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(reservations.createdAt))
      .limit(limitNum).offset((pageNum - 1) * limitNum);

    const [total] = await db.select({ count: count() }).from(reservations)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    return c.json({ reservations: result, pagination: { page: pageNum, limit: limitNum, total: total?.count || 0 } });
  } catch (error) {
    console.error("Error fetching reservations:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

// إحصائيات
app.get("/stats", async (c) => {
  try {
    const stats = await db.select({ status: reservations.status, count: count() })
      .from(reservations).groupBy(reservations.status);

    const now = new Date();
    const [expiringSoon] = await db.select({ count: count() }).from(reservations)
      .where(and(
        or(eq(reservations.status, "pending"), eq(reservations.status, "confirmed")),
        lte(reservations.expiresAt, new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000)),
        gte(reservations.expiresAt, now)
      ));

    return c.json({
      byStatus: stats.reduce((acc, s) => ({ ...acc, [s.status || "unknown"]: s.count }), {}),
      expiringSoon: expiringSoon?.count || 0,
    });
  } catch (error) {
    console.error("Error fetching reservation stats:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

// تفاصيل حجز
app.get("/:id", async (c) => {
  try {
    const { id } = c.req.param();
    const [reservation] = await db.select().from(reservations).where(eq(reservations.id, id));
    if (!reservation) return c.json({ error: "الحجز غير موجود" }, 404);

    const [items, activities] = await Promise.all([
      db.select().from(reservationItems).where(eq(reservationItems.reservationId, id)),
      db.select().from(reservationActivities).where(eq(reservationActivities.reservationId, id)).orderBy(desc(reservationActivities.createdAt)),
    ]);

    return c.json({ ...reservation, items, activities });
  } catch (error) {
    console.error("Error fetching reservation:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

// إنشاء حجز
app.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const id = `rsv_${nanoid(12)}`;
    const reservationNumber = await generateReservationNumber();

    const expiresAt = body.expiresAt ? new Date(body.expiresAt) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    let totalAmount = 0;
    if (body.items?.length > 0) {
      totalAmount = body.items.reduce((sum: number, item: any) => sum + (parseFloat(item.unitPrice) * (item.quantity || 1)), 0);
    }

    const depositAmount = body.depositAmount || String(totalAmount * 0.1);

    await db.insert(reservations).values({
      id, reservationNumber,
      customerId: body.customerId || null,
      customerName: body.customerName,
      customerPhone: body.customerPhone || null,
      customerEmail: body.customerEmail || null,
      branchId: body.branchId || null,
      status: "pending",
      expiresAt,
      totalAmount: String(totalAmount),
      depositAmount,
      notes: body.notes || null,
      createdBy: body.createdBy || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    if (body.items?.length > 0) {
      const itemsData = body.items.map((item: any) => ({
        id: `rsi_${nanoid(12)}`,
        reservationId: id,
        productId: item.productId || null,
        productName: item.productName,
        productSku: item.productSku || null,
        quantity: item.quantity || 1,
        unitPrice: item.unitPrice,
        totalPrice: String(parseFloat(item.unitPrice) * (item.quantity || 1)),
        reservedSerials: item.reservedSerials || null,
        status: "reserved",
        createdAt: new Date(),
      }));
      await db.insert(reservationItems).values(itemsData);
    }

    await db.insert(reservationActivities).values({
      id: `ra_${nanoid(12)}`, reservationId: id,
      activityType: "created", description: `تم إنشاء الحجز ${reservationNumber}`,
      performedBy: body.createdBy || null, createdAt: new Date(),
    });

    return c.json({ id, reservationNumber }, 201);
  } catch (error) {
    console.error("Create reservation error:", error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

// تعديل الحجز
app.put("/:id", async (c) => {
  try {
    const { id } = c.req.param();
    const body = await c.req.json();

    const [existing] = await db.select().from(reservations).where(eq(reservations.id, id));
    if (!existing) return c.json({ error: "الحجز غير موجود" }, 404);

    if (["completed", "cancelled", "expired"].includes(existing.status || "")) {
      return c.json({ error: "لا يمكن تعديل حجز مكتمل أو ملغي" }, 400);
    }

    const updates: Record<string, unknown> = { updatedAt: new Date() };

    if (body.customerName !== undefined) updates.customerName = body.customerName;
    if (body.customerPhone !== undefined) updates.customerPhone = body.customerPhone;
    if (body.customerEmail !== undefined) updates.customerEmail = body.customerEmail;
    if (body.notes !== undefined) updates.notes = body.notes;
    if (body.expiresAt !== undefined) updates.expiresAt = new Date(body.expiresAt);
    if (body.depositAmount !== undefined) updates.depositAmount = body.depositAmount;

    await db.update(reservations).set(updates).where(eq(reservations.id, id));

    await db.insert(reservationActivities).values({
      id: `ra_${nanoid(12)}`,
      reservationId: id,
      activityType: "updated",
      description: "تم تعديل بيانات الحجز",
      performedBy: body.performedBy || null,
      createdAt: new Date(),
    });

    return c.json({ success: true });
  } catch (error) {
    console.error("Update reservation error:", error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

// تغيير حالة الحجز
app.post("/:id/status", async (c) => {
  try {
    const { id } = c.req.param();
    const { status, reason, performedBy } = await c.req.json();

    const [existing] = await db.select().from(reservations).where(eq(reservations.id, id));
    if (!existing) return c.json({ error: "الحجز غير موجود" }, 404);

    const updates: any = { status, updatedAt: new Date() };
    if (status === "confirmed") updates.confirmedAt = new Date();
    if (status === "completed") updates.completedAt = new Date();
    if (status === "cancelled") { updates.cancelledAt = new Date(); updates.cancellationReason = reason; }

    await db.update(reservations).set(updates).where(eq(reservations.id, id));

    await db.insert(reservationActivities).values({
      id: `ra_${nanoid(12)}`, reservationId: id,
      activityType: status === "cancelled" ? "cancelled" : status,
      description: reason || `تم تغيير الحالة إلى ${status}`,
      performedBy, createdAt: new Date(),
    });

    return c.json({ success: true });
  } catch (error) {
    console.error("Error updating reservation status:", error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

// تسجيل دفع العربون
app.post("/:id/deposit", async (c) => {
  try {
    const { id } = c.req.param();
    const { amount, performedBy } = await c.req.json();

    await db.update(reservations).set({
      depositPaid: true, depositPaidAt: new Date(), depositAmount: amount, updatedAt: new Date(),
    }).where(eq(reservations.id, id));

    await db.insert(reservationActivities).values({
      id: `ra_${nanoid(12)}`, reservationId: id,
      activityType: "deposit_paid", description: `تم دفع عربون ${amount} IQD`,
      performedBy, metadata: { amount }, createdAt: new Date(),
    });

    return c.json({ success: true });
  } catch (error) {
    console.error("Error recording deposit:", error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

// تمديد الحجز
app.post("/:id/extend", async (c) => {
  try {
    const { id } = c.req.param();
    const { newExpiryDate, performedBy } = await c.req.json();

    await db.update(reservations).set({
      expiresAt: new Date(newExpiryDate), updatedAt: new Date(),
    }).where(eq(reservations.id, id));

    await db.insert(reservationActivities).values({
      id: `ra_${nanoid(12)}`, reservationId: id,
      activityType: "extended", description: `تم تمديد الحجز حتى ${new Date(newExpiryDate).toLocaleDateString("ar-IQ")}`,
      performedBy, createdAt: new Date(),
    });

    return c.json({ success: true });
  } catch (error) {
    console.error("Error extending reservation:", error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

// تحويل لفاتورة
app.post("/:id/convert-to-invoice", async (c) => {
  try {
    const { id } = c.req.param();
    const { invoiceId, performedBy } = await c.req.json();

    await db.update(reservations).set({
      status: "completed", completedAt: new Date(),
      convertedToInvoice: true, invoiceId, updatedAt: new Date(),
    }).where(eq(reservations.id, id));

    await db.insert(reservationActivities).values({
      id: `ra_${nanoid(12)}`, reservationId: id,
      activityType: "completed", description: `تم تحويل الحجز لفاتورة ${invoiceId}`,
      performedBy, createdAt: new Date(),
    });

    return c.json({ success: true });
  } catch (error) {
    console.error("Error converting reservation to invoice:", error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

export default app;

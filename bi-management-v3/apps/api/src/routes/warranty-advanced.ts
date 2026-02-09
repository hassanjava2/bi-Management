/**
 * نظام الضمان المتقدم - Advanced Warranty API
 * ──────────────────────────────────────────────
 * تتبع ضمانات، تنبيهات انتهاء، عروض تمديد، تكاليف
 */
import { Hono } from "hono";
import {
  db,
  productWarranties,
  warrantyClaims,
  warrantyActivities,
  warrantyPolicies,
  customers,
  products,
  serialNumbers,
  invoices,
} from "@bi-management/database";
import { eq, desc, sql, and, count, sum, gte, lte, between } from "drizzle-orm";
import { nanoid } from "nanoid";

const app = new Hono();

/**
 * لوحة الضمانات الرئيسية
 */
app.get("/dashboard", async (c) => {
  try {
    const now = new Date();
    const weekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const monthFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // إجمالي الضمانات
    const [totalResult] = await db.select({ count: count() }).from(productWarranties);

    // الضمانات النشطة
    const [activeResult] = await db
      .select({ count: count() })
      .from(productWarranties)
      .where(and(eq(productWarranties.status, "active"), gte(productWarranties.endDate, now)));

    // تنتهي خلال أسبوع
    const [expiringWeek] = await db
      .select({ count: count() })
      .from(productWarranties)
      .where(and(eq(productWarranties.status, "active"), between(productWarranties.endDate, now, weekFromNow)));

    // تنتهي خلال شهر
    const [expiringMonth] = await db
      .select({ count: count() })
      .from(productWarranties)
      .where(and(eq(productWarranties.status, "active"), between(productWarranties.endDate, now, monthFromNow)));

    // المطالبات المعلقة
    const [pendingClaims] = await db
      .select({ count: count() })
      .from(warrantyClaims)
      .where(eq(warrantyClaims.status, "pending"));

    // تكاليف الضمان هذا الشهر
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const [monthlyCost] = await db
      .select({ total: sum(sql`CAST(${warrantyClaims.repairCost} AS REAL)`) })
      .from(warrantyClaims)
      .where(and(eq(warrantyClaims.customerPays, false), gte(warrantyClaims.completedAt, monthStart)));

    return c.json({
      success: true,
      data: {
        total: Number(totalResult?.count) || 0,
        active: Number(activeResult?.count) || 0,
        expiringThisWeek: Number(expiringWeek?.count) || 0,
        expiringThisMonth: Number(expiringMonth?.count) || 0,
        pendingClaims: Number(pendingClaims?.count) || 0,
        monthlyWarrantyCost: Math.round(Number(monthlyCost?.total) || 0),
      },
    });
  } catch (error) {
    console.error("Warranty dashboard error:", error);
    return c.json({ error: "فشل في جلب لوحة الضمانات" }, 500);
  }
});

/**
 * الضمانات التي تنتهي قريباً
 */
app.get("/expiring", async (c) => {
  try {
    const days = parseInt(c.req.query("days") || "30");
    const now = new Date();
    const futureDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    const expiring = await db
      .select({
        id: productWarranties.id,
        warrantyNumber: productWarranties.warrantyNumber,
        serialNumber: productWarranties.serialNumber,
        customerName: productWarranties.customerName,
        customerPhone: productWarranties.customerPhone,
        productId: productWarranties.productId,
        productName: products.nameAr,
        model: products.model,
        endDate: productWarranties.endDate,
        claimsCount: productWarranties.claimsCount,
      })
      .from(productWarranties)
      .leftJoin(products, eq(productWarranties.productId, products.id))
      .where(
        and(
          eq(productWarranties.status, "active"),
          between(productWarranties.endDate, now, futureDate)
        )
      )
      .orderBy(productWarranties.endDate);

    const results = expiring.map((w) => {
      const daysLeft = Math.ceil((new Date(w.endDate!).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      return {
        ...w,
        daysUntilExpiry: daysLeft,
        urgency: daysLeft <= 3 ? "critical" : daysLeft <= 7 ? "high" : daysLeft <= 14 ? "medium" : "low",
        extensionOffer: `عرض تمديد ضمان ${daysLeft <= 7 ? "عاجل" : ""}: 6 أشهر إضافية`,
      };
    });

    return c.json({ success: true, data: results });
  } catch (error) {
    console.error("Expiring warranties error:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

/**
 * تقرير تكاليف الضمان
 */
app.get("/cost-report", async (c) => {
  try {
    const months = parseInt(c.req.query("months") || "6");

    const report = [];
    const now = new Date();

    for (let i = 0; i < months; i++) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

      const [stats] = await db
        .select({
          claimsCount: count(),
          totalCost: sum(sql`CAST(${warrantyClaims.repairCost} AS REAL)`),
        })
        .from(warrantyClaims)
        .where(between(warrantyClaims.completedAt, monthStart, monthEnd));

      report.push({
        month: monthStart.toISOString().substring(0, 7),
        monthLabel: monthStart.toLocaleDateString("ar-IQ", { month: "long", year: "numeric" }),
        claims: Number(stats?.claimsCount) || 0,
        cost: Math.round(Number(stats?.totalCost) || 0),
      });
    }

    const totalCost = report.reduce((s, r) => s + r.cost, 0);
    const totalClaims = report.reduce((s, r) => s + r.claims, 0);

    return c.json({
      success: true,
      data: report.reverse(),
      summary: { totalCost, totalClaims, avgMonthlyCost: months > 0 ? Math.round(totalCost / months) : 0 },
    });
  } catch (error) {
    console.error("Warranty cost report error:", error);
    return c.json({ error: "فشل في جلب التقرير" }, 500);
  }
});

/**
 * تسجيل ضمان جديد لجهاز مباع
 */
app.post("/register", async (c) => {
  try {
    const currentUser = c.get("user");
    const body = await c.req.json();
    const { serialNumberId, customerId, invoiceId, durationMonths, policyId } = body;

    if (!serialNumberId || !customerId) {
      return c.json({ error: "بيانات ناقصة" }, 400);
    }

    // جلب بيانات السيريال
    const [serial] = await db.select().from(serialNumbers).where(eq(serialNumbers.id, serialNumberId));
    if (!serial) return c.json({ error: "الجهاز غير موجود" }, 404);

    // جلب بيانات العميل
    const [customer] = await db.select().from(customers).where(eq(customers.id, customerId));
    if (!customer) return c.json({ error: "العميل غير موجود" }, 404);

    // جلب بيانات المنتج
    const [product] = await db.select().from(products).where(eq(products.id, serial.productId!));

    const duration = durationMonths || product?.warrantyMonths || 12;
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + duration);

    const warrantyId = `wr_${nanoid(12)}`;
    const warrantyNumber = `WR-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

    await db.insert(productWarranties).values({
      id: warrantyId,
      warrantyNumber,
      productId: serial.productId,
      serialNumberId,
      serialNumber: serial.serialNumber,
      customerId,
      customerName: customer.name,
      customerPhone: customer.phone,
      invoiceId: invoiceId || null,
      policyId: policyId || null,
      purchaseDate: startDate,
      startDate,
      endDate,
      status: "active",
      registeredBy: currentUser.userId,
    });

    // سجل النشاط
    await db.insert(warrantyActivities).values({
      id: `wa_${nanoid(12)}`,
      warrantyId,
      activityType: "registered",
      description: `تسجيل ضمان ${duration} شهر`,
      performedBy: currentUser.userId,
    });

    return c.json({
      success: true,
      data: { id: warrantyId, warrantyNumber, duration, endDate: endDate.toISOString() },
      message: `تم تسجيل ضمان ${duration} شهر`,
    }, 201);
  } catch (error) {
    console.error("Register warranty error:", error);
    return c.json({ error: "فشل في تسجيل الضمان" }, 500);
  }
});

/**
 * تمديد ضمان
 */
app.post("/:id/extend", async (c) => {
  try {
    const id = c.req.param("id");
    const currentUser = c.get("user");
    const body = await c.req.json();
    const { additionalMonths, reason } = body;

    const [warranty] = await db.select().from(productWarranties).where(eq(productWarranties.id, id));
    if (!warranty) return c.json({ error: "الضمان غير موجود" }, 404);

    const months = additionalMonths || 6;
    const newEndDate = new Date(warranty.endDate!);
    newEndDate.setMonth(newEndDate.getMonth() + months);

    await db.update(productWarranties).set({ endDate: newEndDate, status: "active", updatedAt: new Date() }).where(eq(productWarranties.id, id));

    await db.insert(warrantyActivities).values({
      id: `wa_${nanoid(12)}`,
      warrantyId: id,
      activityType: "extended",
      description: `تمديد ${months} أشهر - ${reason || "تمديد"}`,
      performedBy: currentUser.userId,
    });

    return c.json({ success: true, message: `تم تمديد الضمان ${months} أشهر`, data: { newEndDate } });
  } catch (error) {
    console.error("Extend warranty error:", error);
    return c.json({ error: "فشل في تمديد الضمان" }, 500);
  }
});

export default app;

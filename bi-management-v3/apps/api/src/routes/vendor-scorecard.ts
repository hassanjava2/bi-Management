/**
 * تقييم الموردين - Vendor Scorecard API
 * ─────────────────────────────────────────
 * تقييم تلقائي: جودة، أسعار، مرتجعات، سرعة
 */
import { Hono } from "hono";
import {
  db,
  suppliers,
  invoices,
  invoiceItems,
  returns,
  products,
  serialNumbers,
} from "@bi-management/database";
import { eq, desc, sql, and, count, sum, avg, ne } from "drizzle-orm";

const app = new Hono();

/**
 * تقييم جميع الموردين
 */
app.get("/", async (c) => {
  try {
    // جلب الموردين مع إحصائيات
    const suppliersList = await db
      .select({
        id: suppliers.id,
        name: suppliers.name,
        nameAr: suppliers.nameAr,
        phone: suppliers.phone,
        city: suppliers.city,
        rating: suppliers.rating,
        totalPurchases: suppliers.totalPurchases,
        isActive: suppliers.isActive,
      })
      .from(suppliers)
      .where(eq(suppliers.isDeleted, 0))
      .orderBy(desc(suppliers.totalPurchases));

    const scorecards = [];

    for (const supplier of suppliersList) {
      // عدد المشتريات
      const [purchaseStats] = await db
        .select({
          count: count(),
          totalAmount: sum(invoices.total),
        })
        .from(invoices)
        .where(
          and(
            eq(invoices.supplierId, supplier.id),
            eq(invoices.isDeleted, 0),
            sql`${invoices.type} IN ('purchase', 'buy')`
          )
        );

      // المرتجعات للمورد
      const [returnStats] = await db
        .select({ count: count() })
        .from(returns)
        .where(eq(returns.supplierId, supplier.id));

      // عدد الأجهزة المشتراة
      const [deviceCount] = await db
        .select({ count: count() })
        .from(serialNumbers)
        .where(eq(serialNumbers.supplierId, supplier.id));

      const totalPurchases = Number(purchaseStats?.count) || 0;
      const totalAmount = Number(purchaseStats?.totalAmount) || Number(supplier.totalPurchases) || 0;
      const totalReturns = Number(returnStats?.count) || 0;
      const totalDevices = Number(deviceCount?.count) || 0;

      // حساب النقاط
      const returnRate = totalDevices > 0 ? (totalReturns / totalDevices) * 100 : 0;

      // نقاط الجودة (100 - نسبة المرتجعات * 10)
      const qualityScore = Math.max(0, Math.min(100, 100 - returnRate * 10));

      // نقاط الموثوقية (بناء على عدد المعاملات)
      const reliabilityScore = Math.min(100, totalPurchases * 10);

      // الدرجة الإجمالية
      const overallScore = Math.round((qualityScore * 0.5 + reliabilityScore * 0.3 + (Number(supplier.rating) || 50) * 0.2));

      const grade = overallScore >= 90 ? "A+" : overallScore >= 80 ? "A" : overallScore >= 70 ? "B" : overallScore >= 60 ? "C" : "D";

      scorecards.push({
        supplierId: supplier.id,
        name: supplier.nameAr || supplier.name,
        phone: supplier.phone,
        city: supplier.city,
        isActive: supplier.isActive,
        stats: {
          totalPurchases,
          totalAmount: Math.round(totalAmount),
          totalDevices,
          totalReturns,
          returnRate: Math.round(returnRate * 10) / 10,
        },
        scores: {
          quality: Math.round(qualityScore),
          reliability: Math.round(reliabilityScore),
          overall: overallScore,
          grade,
        },
        alerts: [
          ...(returnRate > 10 ? [`نسبة المرتجعات عالية (${Math.round(returnRate)}%) - ابحث عن بديل`] : []),
          ...(totalPurchases === 0 ? ["لم يتم الشراء منه بعد"] : []),
          ...(returnRate === 0 && totalDevices > 10 ? ["ممتاز! لا مرتجعات"] : []),
        ],
      });
    }

    // ترتيب حسب الدرجة
    scorecards.sort((a, b) => b.scores.overall - a.scores.overall);

    return c.json({
      success: true,
      data: scorecards,
      summary: {
        totalSuppliers: scorecards.length,
        avgScore: scorecards.length > 0 ? Math.round(scorecards.reduce((s, sc) => s + sc.scores.overall, 0) / scorecards.length) : 0,
        topSupplier: scorecards[0]?.name || null,
        gradeDistribution: {
          "A+": scorecards.filter((s) => s.scores.grade === "A+").length,
          "A": scorecards.filter((s) => s.scores.grade === "A").length,
          "B": scorecards.filter((s) => s.scores.grade === "B").length,
          "C": scorecards.filter((s) => s.scores.grade === "C").length,
          "D": scorecards.filter((s) => s.scores.grade === "D").length,
        },
      },
    });
  } catch (error) {
    console.error("Vendor scorecard error:", error);
    return c.json({ error: "فشل في تقييم الموردين" }, 500);
  }
});

/**
 * تقييم مورد معين
 */
app.get("/:id", async (c) => {
  try {
    const supplierId = c.req.param("id");

    const [supplier] = await db
      .select()
      .from(suppliers)
      .where(eq(suppliers.id, supplierId));

    if (!supplier) {
      return c.json({ error: "المورد غير موجود" }, 404);
    }

    // آخر المشتريات
    const recentPurchases = await db
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        total: invoices.total,
        status: invoices.status,
        createdAt: invoices.createdAt,
      })
      .from(invoices)
      .where(
        and(
          eq(invoices.supplierId, supplierId),
          eq(invoices.isDeleted, 0)
        )
      )
      .orderBy(desc(invoices.createdAt))
      .limit(10);

    // المرتجعات
    const recentReturns = await db
      .select({
        id: returns.id,
        status: returns.status,
        createdAt: returns.createdAt,
      })
      .from(returns)
      .where(eq(returns.supplierId, supplierId))
      .orderBy(desc(returns.createdAt))
      .limit(10);

    // المنتجات من هذا المورد
    const supplierProducts = await db
      .select({
        productName: products.nameAr,
        model: products.model,
        count: count(),
      })
      .from(serialNumbers)
      .innerJoin(products, eq(serialNumbers.productId, products.id))
      .where(eq(serialNumbers.supplierId, supplierId))
      .groupBy(products.nameAr, products.model)
      .orderBy(desc(count()))
      .limit(10);

    return c.json({
      success: true,
      data: {
        supplier: {
          id: supplier.id,
          name: supplier.nameAr || supplier.name,
          phone: supplier.phone,
          email: supplier.email,
          city: supplier.city,
          address: supplier.address,
          paymentTerms: supplier.paymentTerms,
          warrantyTerms: supplier.warrantyTerms,
          balance: supplier.balance,
        },
        recentPurchases,
        recentReturns,
        topProducts: supplierProducts,
      },
    });
  } catch (error) {
    console.error("Vendor detail error:", error);
    return c.json({ error: "فشل في جلب تفاصيل المورد" }, 500);
  }
});

export default app;

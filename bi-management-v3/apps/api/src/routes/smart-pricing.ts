/**
 * التسعير الذكي - Smart Pricing API
 * ────────────────────────────────────
 * اقتراحات أسعار بناء على التكلفة، العمر، الطلب، الموسم
 */
import { Hono } from "hono";
import {
  db,
  products,
  serialNumbers,
  invoiceItems,
  invoices,
} from "@bi-management/database";
import { eq, desc, sql, and, count, sum, avg, gte } from "drizzle-orm";

const app = new Hono();

/**
 * اقتراح سعر لمنتج
 */
app.get("/suggest/:productId", async (c) => {
  try {
    const productId = c.req.param("productId");

    // بيانات المنتج
    const [product] = await db
      .select()
      .from(products)
      .where(eq(products.id, productId));

    if (!product) {
      return c.json({ error: "المنتج غير موجود" }, 404);
    }

    const costPrice = Number(product.costPrice) || 0;
    const currentPrice = Number(product.sellingPrice) || 0;

    // تحليل المبيعات الأخيرة
    const recentSales = await db
      .select({
        avgPrice: avg(invoiceItems.unitPrice),
        totalSold: count(),
        lastSaleDate: sql<string>`MAX(${invoices.createdAt})`,
      })
      .from(invoiceItems)
      .innerJoin(invoices, eq(invoiceItems.invoiceId, invoices.id))
      .where(
        and(
          eq(invoiceItems.productId, productId),
          eq(invoices.isDeleted, 0),
          gte(invoices.createdAt, new Date(Date.now() - 90 * 24 * 60 * 60 * 1000))
        )
      );

    const avgSalePrice = Number(recentSales[0]?.avgPrice) || currentPrice;
    const salesCount = Number(recentSales[0]?.totalSold) || 0;

    // المخزون المتاح
    const [stockInfo] = await db
      .select({ count: count() })
      .from(serialNumbers)
      .where(
        and(
          eq(serialNumbers.productId, productId),
          eq(serialNumbers.status, "available")
        )
      );
    const availableStock = Number(stockInfo?.count) || 0;

    // معدل البيع (أجهزة/شهر)
    const salesVelocity = salesCount / 3; // آخر 3 أشهر

    // عامل الموسم (موسم الدراسة = سبتمبر-نوفمبر)
    const month = new Date().getMonth(); // 0-11
    const isHighSeason = month >= 8 && month <= 10; // سبتمبر-نوفمبر
    const seasonMultiplier = isHighSeason ? 1.05 : 1.0;

    // عامل المخزون (كثير = سعر أقل، قليل = سعر أعلى)
    let stockMultiplier = 1.0;
    if (availableStock > 20) stockMultiplier = 0.95; // كثير - خصم
    else if (availableStock <= 3 && salesVelocity > 2) stockMultiplier = 1.08; // قليل ومطلوب - زيادة
    else if (availableStock === 0) stockMultiplier = 1.10;

    // عامل سرعة البيع
    let demandMultiplier = 1.0;
    if (salesVelocity >= 10) demandMultiplier = 1.05; // مبيعات عالية
    else if (salesVelocity <= 1) demandMultiplier = 0.95; // مبيعات بطيئة

    // الهامش المستهدف (15-25%)
    const targetMargin = 0.18;
    const basePrice = costPrice > 0 ? costPrice * (1 + targetMargin) : currentPrice;

    // السعر المقترح
    const suggestedPrice = Math.round(basePrice * seasonMultiplier * stockMultiplier * demandMultiplier / 1000) * 1000;

    // مقارنة
    const priceDiff = suggestedPrice - currentPrice;
    const priceDiffPercent = currentPrice > 0 ? Math.round((priceDiff / currentPrice) * 100) : 0;

    return c.json({
      success: true,
      data: {
        product: {
          id: product.id,
          name: product.nameAr || product.name,
          model: product.model,
          brand: product.brand,
        },
        pricing: {
          costPrice,
          currentPrice,
          suggestedPrice,
          priceDifference: priceDiff,
          priceDifferencePercent: priceDiffPercent,
          recommendation: priceDiff > 0 ? "ارفع السعر" : priceDiff < 0 ? "خفض السعر" : "السعر مناسب",
        },
        factors: {
          season: { isHighSeason, multiplier: seasonMultiplier, note: isHighSeason ? "موسم الدراسة - طلب عالي" : "موسم عادي" },
          stock: { available: availableStock, multiplier: stockMultiplier, note: availableStock > 20 ? "مخزون كثير" : availableStock <= 3 ? "مخزون قليل" : "مخزون معتدل" },
          demand: { salesVelocity: Math.round(salesVelocity * 10) / 10, multiplier: demandMultiplier, note: salesVelocity >= 10 ? "طلب عالي" : salesVelocity <= 1 ? "طلب منخفض" : "طلب متوسط" },
          margin: { current: currentPrice > 0 && costPrice > 0 ? Math.round(((currentPrice - costPrice) / currentPrice) * 100) : 0, target: targetMargin * 100 },
        },
        analysis: {
          avgRecentSalePrice: Math.round(avgSalePrice),
          salesLast90Days: salesCount,
          monthlyVelocity: Math.round(salesVelocity * 10) / 10,
        },
      },
    });
  } catch (error) {
    console.error("Smart pricing error:", error);
    return c.json({ error: "فشل في حساب السعر المقترح" }, 500);
  }
});

/**
 * اقتراحات تسعير لكل المنتجات
 */
app.get("/suggestions", async (c) => {
  try {
    const allProducts = await db
      .select({
        id: products.id,
        name: products.nameAr,
        model: products.model,
        brand: products.brand,
        costPrice: products.costPrice,
        sellingPrice: products.sellingPrice,
      })
      .from(products)
      .where(and(eq(products.isActive, 1), eq(products.isDeleted, 0)));

    const suggestions = [];

    for (const product of allProducts) {
      const cost = Number(product.costPrice) || 0;
      const price = Number(product.sellingPrice) || 0;

      if (cost <= 0 || price <= 0) continue;

      const margin = ((price - cost) / price) * 100;

      // فقط المنتجات اللي تحتاج تعديل
      if (margin < 8) {
        suggestions.push({
          productId: product.id,
          name: product.name || product.model,
          brand: product.brand,
          currentPrice: price,
          costPrice: cost,
          currentMargin: Math.round(margin * 10) / 10,
          suggestedPrice: Math.round(cost * 1.18 / 1000) * 1000,
          action: "raise",
          urgency: margin < 3 ? "critical" : "high",
          reason: `هامش الربح ${Math.round(margin)}% فقط - يجب رفع السعر`,
        });
      } else if (margin > 35) {
        suggestions.push({
          productId: product.id,
          name: product.name || product.model,
          brand: product.brand,
          currentPrice: price,
          costPrice: cost,
          currentMargin: Math.round(margin * 10) / 10,
          suggestedPrice: Math.round(cost * 1.25 / 1000) * 1000,
          action: "lower",
          urgency: "low",
          reason: `هامش ${Math.round(margin)}% - ممكن تخفيض لزيادة المبيعات`,
        });
      }
    }

    // ترتيب حسب الأولوية
    suggestions.sort((a, b) => {
      const urgencyOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
      return (urgencyOrder[a.urgency] || 4) - (urgencyOrder[b.urgency] || 4);
    });

    return c.json({
      success: true,
      data: suggestions,
      summary: {
        total: suggestions.length,
        raiseCount: suggestions.filter((s) => s.action === "raise").length,
        lowerCount: suggestions.filter((s) => s.action === "lower").length,
        criticalCount: suggestions.filter((s) => s.urgency === "critical").length,
      },
    });
  } catch (error) {
    console.error("Pricing suggestions error:", error);
    return c.json({ error: "فشل في جلب الاقتراحات" }, 500);
  }
});

export default app;

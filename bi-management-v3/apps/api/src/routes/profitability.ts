/**
 * تحليل الربحية - Product Profitability API
 * ─────────────────────────────────────────────
 * ربح كل جهاز الحقيقي = سعر البيع - (سعر الشراء + مصاريف)
 */
import { Hono } from "hono";
import {
  db,
  invoices,
  invoiceItems,
  products,
  serialNumbers,
  returns,
  suppliers,
} from "@bi-management/database";
import { eq, desc, sql, and, count, sum, gte, lte, ne } from "drizzle-orm";

const app = new Hono();

/**
 * تحليل ربحية كل المنتجات
 */
app.get("/products", async (c) => {
  try {
    const period = c.req.query("period") || "month";
    const limit = parseInt(c.req.query("limit") || "50");

    // حساب تكلفة ومبيعات كل منتج
    const productStats = await db
      .select({
        productId: invoiceItems.productId,
        productName: products.nameAr,
        productModel: products.model,
        brand: products.brand,
        costPrice: products.costPrice,
        sellingPrice: products.sellingPrice,
        totalSold: count(),
        totalRevenue: sum(invoiceItems.total),
        totalCost: sum(invoiceItems.costPrice),
      })
      .from(invoiceItems)
      .innerJoin(products, eq(invoiceItems.productId, products.id))
      .innerJoin(invoices, eq(invoiceItems.invoiceId, invoices.id))
      .where(
        and(
          eq(invoices.isDeleted, 0),
          ne(invoices.status, "cancelled"),
          sql`${invoices.type} IN ('sale', 'cash', 'credit', 'installment')`
        )
      )
      .groupBy(invoiceItems.productId, products.nameAr, products.model, products.brand, products.costPrice, products.sellingPrice)
      .orderBy(desc(sum(invoiceItems.total)))
      .limit(limit);

    // حساب الربح الحقيقي
    const results = productStats.map((p) => {
      const revenue = Number(p.totalRevenue) || 0;
      const cost = Number(p.totalCost) || (Number(p.costPrice) || 0) * Number(p.totalSold);
      const profit = revenue - cost;
      const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

      return {
        productId: p.productId,
        productName: p.productName || p.productModel || "غير محدد",
        model: p.productModel,
        brand: p.brand,
        unitCost: Number(p.costPrice) || 0,
        unitPrice: Number(p.sellingPrice) || 0,
        totalSold: Number(p.totalSold),
        totalRevenue: Math.round(revenue),
        totalCost: Math.round(cost),
        grossProfit: Math.round(profit),
        profitMargin: Math.round(margin * 10) / 10,
        avgProfitPerUnit: Number(p.totalSold) > 0 ? Math.round(profit / Number(p.totalSold)) : 0,
        status: margin >= 20 ? "excellent" : margin >= 10 ? "good" : margin >= 5 ? "fair" : "poor",
      };
    });

    // ملخص
    const totalRevenue = results.reduce((s, r) => s + r.totalRevenue, 0);
    const totalCost = results.reduce((s, r) => s + r.totalCost, 0);
    const totalProfit = totalRevenue - totalCost;

    return c.json({
      success: true,
      data: results,
      summary: {
        totalProducts: results.length,
        totalRevenue,
        totalCost,
        totalProfit,
        avgMargin: totalRevenue > 0 ? Math.round((totalProfit / totalRevenue) * 1000) / 10 : 0,
        excellentCount: results.filter((r) => r.status === "excellent").length,
        poorCount: results.filter((r) => r.status === "poor").length,
      },
    });
  } catch (error) {
    console.error("Product profitability error:", error);
    return c.json({ error: "فشل في تحليل الربحية" }, 500);
  }
});

/**
 * تحليل ربحية جهاز معين بالسيريال
 */
app.get("/device/:serialNumber", async (c) => {
  try {
    const serialNum = c.req.param("serialNumber");

    // بيانات السيريال
    const [device] = await db
      .select({
        id: serialNumbers.id,
        serialNumber: serialNumbers.serialNumber,
        productId: serialNumbers.productId,
        productName: products.nameAr,
        model: products.model,
        brand: products.brand,
        costPrice: serialNumbers.purchasePrice,
        status: serialNumbers.status,
        createdAt: serialNumbers.createdAt,
      })
      .from(serialNumbers)
      .innerJoin(products, eq(serialNumbers.productId, products.id))
      .where(eq(serialNumbers.serialNumber, serialNum));

    if (!device) {
      return c.json({ error: "الجهاز غير موجود" }, 404);
    }

    // فاتورة البيع
    const saleItem = await db
      .select({
        invoiceId: invoiceItems.invoiceId,
        invoiceNumber: invoices.invoiceNumber,
        unitPrice: invoiceItems.unitPrice,
        costPrice: invoiceItems.costPrice,
        total: invoiceItems.total,
        discount: invoiceItems.discount,
        createdAt: invoices.createdAt,
      })
      .from(invoiceItems)
      .innerJoin(invoices, eq(invoiceItems.invoiceId, invoices.id))
      .where(eq(invoiceItems.serialId, device.id))
      .orderBy(desc(invoices.createdAt))
      .limit(1);

    const sale = saleItem[0];
    const purchaseCost = Number(device.costPrice) || 0;
    const salePrice = sale ? Number(sale.total) || 0 : 0;
    const profit = salePrice - purchaseCost;
    const margin = salePrice > 0 ? (profit / salePrice) * 100 : 0;

    // عمر الجهاز بالمخزن (بالأيام)
    const daysInStock = device.createdAt
      ? Math.floor((Date.now() - new Date(device.createdAt).getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    return c.json({
      success: true,
      data: {
        serialNumber: device.serialNumber,
        product: device.productName || device.model,
        brand: device.brand,
        status: device.status,
        purchaseCost,
        salePrice,
        profit: Math.round(profit),
        profitMargin: Math.round(margin * 10) / 10,
        daysInStock,
        isSold: !!sale,
        saleDate: sale?.createdAt,
        invoiceNumber: sale?.invoiceNumber,
      },
    });
  } catch (error) {
    console.error("Device profitability error:", error);
    return c.json({ error: "فشل في تحليل ربحية الجهاز" }, 500);
  }
});

/**
 * أفضل وأسوأ المنتجات ربحاً
 */
app.get("/rankings", async (c) => {
  try {
    const topN = parseInt(c.req.query("top") || "10");

    const productStats = await db
      .select({
        productId: invoiceItems.productId,
        productName: products.nameAr,
        model: products.model,
        brand: products.brand,
        costPrice: products.costPrice,
        totalSold: count(),
        totalRevenue: sum(invoiceItems.total),
        totalCost: sum(invoiceItems.costPrice),
      })
      .from(invoiceItems)
      .innerJoin(products, eq(invoiceItems.productId, products.id))
      .innerJoin(invoices, eq(invoiceItems.invoiceId, invoices.id))
      .where(and(eq(invoices.isDeleted, 0), ne(invoices.status, "cancelled")))
      .groupBy(invoiceItems.productId, products.nameAr, products.model, products.brand, products.costPrice)
      .orderBy(desc(sum(invoiceItems.total)));

    const withProfit = productStats.map((p) => {
      const revenue = Number(p.totalRevenue) || 0;
      const cost = Number(p.totalCost) || (Number(p.costPrice) || 0) * Number(p.totalSold);
      const profit = revenue - cost;
      const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
      return {
        productId: p.productId,
        name: p.productName || p.model || "غير محدد",
        brand: p.brand,
        sold: Number(p.totalSold),
        revenue: Math.round(revenue),
        profit: Math.round(profit),
        margin: Math.round(margin * 10) / 10,
      };
    });

    // ترتيب حسب الربح
    const sortedByProfit = [...withProfit].sort((a, b) => b.profit - a.profit);

    return c.json({
      success: true,
      data: {
        topProfitable: sortedByProfit.slice(0, topN),
        leastProfitable: sortedByProfit.slice(-topN).reverse(),
        topByVolume: [...withProfit].sort((a, b) => b.sold - a.sold).slice(0, topN),
        topByMargin: [...withProfit].filter((p) => p.sold >= 3).sort((a, b) => b.margin - a.margin).slice(0, topN),
      },
    });
  } catch (error) {
    console.error("Rankings error:", error);
    return c.json({ error: "فشل في جلب الترتيب" }, 500);
  }
});

/**
 * Dead Stock - الأجهزة الراكدة
 */
app.get("/dead-stock", async (c) => {
  try {
    const daysThreshold = parseInt(c.req.query("days") || "60");
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysThreshold);

    const deadStock = await db
      .select({
        id: serialNumbers.id,
        serialNumber: serialNumbers.serialNumber,
        productName: products.nameAr,
        model: products.model,
        brand: products.brand,
        costPrice: serialNumbers.purchasePrice,
        sellingPrice: products.sellingPrice,
        createdAt: serialNumbers.createdAt,
        warehouseId: serialNumbers.warehouseId,
      })
      .from(serialNumbers)
      .innerJoin(products, eq(serialNumbers.productId, products.id))
      .where(
        and(
          eq(serialNumbers.status, "available"),
          lte(serialNumbers.createdAt, cutoffDate)
        )
      )
      .orderBy(serialNumbers.createdAt);

    const results = deadStock.map((d) => {
      const daysInStock = Math.floor((Date.now() - new Date(d.createdAt!).getTime()) / (1000 * 60 * 60 * 24));
      const cost = Number(d.costPrice) || 0;
      // اقتراح خصم بناء على عمر المخزون
      let suggestedDiscount = 0;
      if (daysInStock > 180) suggestedDiscount = 20;
      else if (daysInStock > 120) suggestedDiscount = 15;
      else if (daysInStock > 90) suggestedDiscount = 10;
      else if (daysInStock > 60) suggestedDiscount = 5;

      return {
        ...d,
        daysInStock,
        suggestedDiscount,
        suggestedPrice: cost > 0 ? Math.round(cost * (1 + (0.1 - suggestedDiscount / 100))) : Number(d.sellingPrice) || 0,
        urgency: daysInStock > 120 ? "critical" : daysInStock > 90 ? "high" : "medium",
      };
    });

    const totalValue = results.reduce((s, r) => s + (Number(r.costPrice) || 0), 0);

    return c.json({
      success: true,
      data: results,
      summary: {
        totalDevices: results.length,
        totalValue: Math.round(totalValue),
        criticalCount: results.filter((r) => r.urgency === "critical").length,
        highCount: results.filter((r) => r.urgency === "high").length,
        avgDaysInStock: results.length > 0 ? Math.round(results.reduce((s, r) => s + r.daysInStock, 0) / results.length) : 0,
      },
    });
  } catch (error) {
    console.error("Dead stock error:", error);
    return c.json({ error: "فشل في جلب المخزون الراكد" }, 500);
  }
});

export default app;

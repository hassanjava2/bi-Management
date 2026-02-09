/**
 * لوحة التحكم - API Routes
 * ─────────────────────────
 * إحصائيات شاملة ورسوم بيانية
 */
import { Hono } from "hono";
import {
  db,
  products,
  categories,
  customers,
  invoices,
  invoiceItems,
  serialNumbers,
  maintenanceOrders,
  employees,
  shipments,
  purchaseBatches,
} from "@bi-management/database";
import { eq, desc, sql, and, gte, lte, count, sum } from "drizzle-orm";
import { authMiddleware } from "../lib/auth.js";

const app = new Hono();

app.use("*", authMiddleware);

/**
 * إحصائيات عامة للوحة التحكم
 */
app.get("/overview", async (c) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfYear = new Date(today.getFullYear(), 0, 1);

    // إحصائيات أساسية
    const [
      productsCount,
      customersCount,
      devicesCount,
      maintenanceCount,
    ] = await Promise.all([
      db.select({ count: count() }).from(products),
      db.select({ count: count() }).from(customers),
      db.select({ count: count() }).from(serialNumbers),
      db.select({ count: count() }).from(maintenanceOrders).where(
        sql`${maintenanceOrders.status} NOT IN ('delivered', 'cancelled')`
      ),
    ]);

    // مبيعات اليوم
    const [todaySales] = await db
      .select({
        count: count(),
        total: sum(invoices.total),
      })
      .from(invoices)
      .where(
        and(
          eq(invoices.type, "sale"),
          gte(invoices.createdAt, today)
        )
      );

    // مبيعات الشهر
    const [monthSales] = await db
      .select({
        count: count(),
        total: sum(invoices.total),
      })
      .from(invoices)
      .where(
        and(
          eq(invoices.type, "sale"),
          gte(invoices.createdAt, startOfMonth)
        )
      );

    // مبيعات السنة
    const [yearSales] = await db
      .select({
        count: count(),
        total: sum(invoices.total),
      })
      .from(invoices)
      .where(
        and(
          eq(invoices.type, "sale"),
          gte(invoices.createdAt, startOfYear)
        )
      );

    // أجهزة حسب الحالة
    const devicesByStatus = await db
      .select({
        status: serialNumbers.status,
        count: count(),
      })
      .from(serialNumbers)
      .groupBy(serialNumbers.status);

    // شحنات معلقة
    const [pendingShipments] = await db
      .select({ count: count() })
      .from(shipments)
      .where(sql`${shipments.status} NOT IN ('delivered', 'returned')`);

    // وجبات شراء معلقة
    const [pendingPurchases] = await db
      .select({ count: count() })
      .from(purchaseBatches)
      .where(sql`${purchaseBatches.status} != 'completed'`);

    return c.json({
      counts: {
        products: productsCount[0]?.count || 0,
        customers: customersCount[0]?.count || 0,
        devices: devicesCount[0]?.count || 0,
        activeMaintenance: maintenanceCount[0]?.count || 0,
        pendingShipments: pendingShipments?.count || 0,
        pendingPurchases: pendingPurchases?.count || 0,
      },
      sales: {
        today: {
          count: todaySales?.count || 0,
          total: Number(todaySales?.total) || 0,
        },
        month: {
          count: monthSales?.count || 0,
          total: Number(monthSales?.total) || 0,
        },
        year: {
          count: yearSales?.count || 0,
          total: Number(yearSales?.total) || 0,
        },
      },
      devicesByStatus,
    });
  } catch (error) {
    console.error("Dashboard overview error:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

/**
 * مبيعات آخر 7 أيام (للرسم البياني)
 */
app.get("/sales-chart", async (c) => {
  try {
    const days = parseInt(c.req.query("days") || "7");
    const data = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const [result] = await db
        .select({
          count: count(),
          total: sum(invoices.total),
        })
        .from(invoices)
        .where(
          and(
            eq(invoices.type, "sale"),
            gte(invoices.createdAt, date),
            lte(invoices.createdAt, nextDate)
          )
        );

      data.push({
        date: date.toISOString().split("T")[0],
        day: date.toLocaleDateString("ar-IQ", { weekday: "short" }),
        count: result?.count || 0,
        total: Number(result?.total) || 0,
      });
    }

    return c.json({ data });
  } catch (error) {
    console.error("Sales chart error:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

/**
 * أحدث الفواتير
 */
app.get("/recent-invoices", async (c) => {
  try {
    const limit = parseInt(c.req.query("limit") || "10");

    const recentInvoices = await db
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        type: invoices.type,
        customerName: customers.name,
        total: invoices.total,
        status: invoices.status,
        createdAt: invoices.createdAt,
      })
      .from(invoices)
      .leftJoin(customers, eq(invoices.customerId, customers.id))
      .orderBy(desc(invoices.createdAt))
      .limit(limit);

    return c.json({ invoices: recentInvoices });
  } catch (error) {
    console.error("Recent invoices error:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

/**
 * أحدث طلبات الصيانة
 */
app.get("/recent-maintenance", async (c) => {
  try {
    const limit = parseInt(c.req.query("limit") || "10");

    const recentMaintenance = await db
      .select({
        id: maintenanceOrders.id,
        orderNumber: maintenanceOrders.orderNumber,
        customerName: customers.name,
        issueDescription: maintenanceOrders.issueDescription,
        status: maintenanceOrders.status,
        createdAt: maintenanceOrders.createdAt,
      })
      .from(maintenanceOrders)
      .leftJoin(customers, eq(maintenanceOrders.customerId, customers.id))
      .orderBy(desc(maintenanceOrders.createdAt))
      .limit(limit);

    return c.json({ maintenance: recentMaintenance });
  } catch (error) {
    console.error("Recent maintenance error:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

/**
 * المنتجات الأكثر مبيعاً
 */
app.get("/top-products", async (c) => {
  try {
    const limit = parseInt(c.req.query("limit") || "10");

    const topProducts = await db
      .select({
        productId: invoiceItems.productId,
        productName: products.nameAr,
        totalQty: sum(invoiceItems.quantity),
        totalSales: sum(invoiceItems.total),
      })
      .from(invoiceItems)
      .innerJoin(invoices, eq(invoiceItems.invoiceId, invoices.id))
      .innerJoin(products, eq(invoiceItems.productId, products.id))
      .where(eq(invoices.type, "sale"))
      .groupBy(invoiceItems.productId, products.nameAr)
      .orderBy(desc(sum(invoiceItems.quantity)))
      .limit(limit);

    return c.json({ products: topProducts });
  } catch (error) {
    console.error("Top products error:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

/**
 * أفضل العملاء
 */
app.get("/top-customers", async (c) => {
  try {
    const limit = parseInt(c.req.query("limit") || "10");

    const topCustomers = await db
      .select({
        customerId: invoices.customerId,
        customerName: customers.name,
        customerPhone: customers.phone,
        totalPurchases: count(),
        totalAmount: sum(invoices.total),
      })
      .from(invoices)
      .innerJoin(customers, eq(invoices.customerId, customers.id))
      .where(eq(invoices.type, "sale"))
      .groupBy(invoices.customerId, customers.name, customers.phone)
      .orderBy(desc(sum(invoices.total)))
      .limit(limit);

    return c.json({ customers: topCustomers });
  } catch (error) {
    console.error("Top customers error:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

/**
 * تنبيهات وإشعارات
 */
app.get("/alerts", async (c) => {
  try {
    const alerts = [];

    // أجهزة الضمان التي ستنتهي قريباً
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const [expiringWarranty] = await db
      .select({ count: count() })
      .from(serialNumbers)
      .where(
        and(
          sql`${serialNumbers.warrantyEnd} IS NOT NULL`,
          lte(serialNumbers.warrantyEnd, thirtyDaysFromNow),
          gte(serialNumbers.warrantyEnd, new Date())
        )
      );

    if (expiringWarranty?.count > 0) {
      alerts.push({
        type: "warning",
        title: "ضمانات تنتهي قريباً",
        message: `${expiringWarranty.count} جهاز ستنتهي ضماناتهم خلال 30 يوم`,
        link: "/devices?warranty=expiring",
      });
    }

    // طلبات صيانة متأخرة
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const [delayedMaintenance] = await db
      .select({ count: count() })
      .from(maintenanceOrders)
      .where(
        and(
          sql`${maintenanceOrders.status} NOT IN ('delivered', 'cancelled', 'completed')`,
          lte(maintenanceOrders.createdAt, threeDaysAgo)
        )
      );

    if (delayedMaintenance?.count > 0) {
      alerts.push({
        type: "error",
        title: "طلبات صيانة متأخرة",
        message: `${delayedMaintenance.count} طلب صيانة متأخر أكثر من 3 أيام`,
        link: "/maintenance?delayed=true",
      });
    }

    // شحنات معلقة
    const [pendingShipments] = await db
      .select({ count: count() })
      .from(shipments)
      .where(eq(shipments.status, "ready"));

    if (pendingShipments?.count > 0) {
      alerts.push({
        type: "info",
        title: "شحنات جاهزة للتسليم",
        message: `${pendingShipments.count} شحنة جاهزة للتسليم للمندوب`,
        link: "/delivery/shipments?status=ready",
      });
    }

    return c.json({ alerts });
  } catch (error) {
    console.error("Alerts error:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

/**
 * ملخص المخزون
 */
app.get("/inventory-summary", async (c) => {
  try {
    // أجهزة متاحة للبيع
    const [available] = await db
      .select({ count: count() })
      .from(serialNumbers)
      .where(eq(serialNumbers.status, "available"));

    // أجهزة محجوزة
    const [reserved] = await db
      .select({ count: count() })
      .from(serialNumbers)
      .where(eq(serialNumbers.status, "reserved"));

    // أجهزة في الصيانة
    const [inMaintenance] = await db
      .select({ count: count() })
      .from(serialNumbers)
      .where(eq(serialNumbers.status, "in_maintenance"));

    // أجهزة في العهدة
    const [inCustody] = await db
      .select({ count: count() })
      .from(serialNumbers)
      .where(eq(serialNumbers.status, "in_custody"));

    // تصنيفات المنتجات
    const categoriesCount = await db
      .select({
        categoryId: products.categoryId,
        categoryName: categories.nameAr,
        count: count(),
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .groupBy(products.categoryId, categories.nameAr)
      .orderBy(desc(count()))
      .limit(10);

    return c.json({
      devices: {
        available: available?.count || 0,
        reserved: reserved?.count || 0,
        inMaintenance: inMaintenance?.count || 0,
        inCustody: inCustody?.count || 0,
      },
      categoriesCount,
    });
  } catch (error) {
    console.error("Inventory summary error:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

export default app;

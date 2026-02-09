/**
 * API Routes - نظام التنبيهات الذكية
 */
import { Hono } from "hono";
import { 
  db, products, serialNumbers, purchaseBatches, maintenanceOrders,
  invoices, customers, suppliers, users, returnRequests
} from "@bi-management/database";
import { eq, and, lt, gt, gte, lte, count, sql, desc, or, isNull } from "drizzle-orm";
import { authMiddleware } from "../lib/auth.js";

const app = new Hono();


interface Alert {
  id: string;
  type: string;
  category: string;
  severity: "info" | "warning" | "critical";
  title: string;
  message: string;
  count?: number;
  actionUrl?: string;
  actionLabel?: string;
  metadata?: any;
}

/**
 * جلب جميع التنبيهات
 */
app.get("/", async (c) => {
  try {
    const alerts: Alert[] = [];

    // 1. تنبيهات المخزون المنخفض
    const lowStockAlerts = await getLowStockAlerts();
    alerts.push(...lowStockAlerts);

    // 2. تنبيهات الصيانة المعلقة
    const maintenanceAlerts = await getPendingMaintenanceAlerts();
    alerts.push(...maintenanceAlerts);

    // 3. تنبيهات المشتريات المعلقة
    const purchaseAlerts = await getPendingPurchaseAlerts();
    alerts.push(...purchaseAlerts);

    // 4. تنبيهات الفواتير غير المدفوعة
    const invoiceAlerts = await getUnpaidInvoiceAlerts();
    alerts.push(...invoiceAlerts);

    // 5. تنبيهات المرتجعات المعلقة
    const returnAlerts = await getPendingReturnAlerts();
    alerts.push(...returnAlerts);

    // 6. تنبيهات العهد طويلة المدة
    const custodyAlerts = await getLongCustodyAlerts();
    alerts.push(...custodyAlerts);

    // ترتيب حسب الأهمية
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    return c.json({
      alerts,
      summary: {
        total: alerts.length,
        critical: alerts.filter((a) => a.severity === "critical").length,
        warning: alerts.filter((a) => a.severity === "warning").length,
        info: alerts.filter((a) => a.severity === "info").length,
      },
    });
  } catch (error) {
    console.error("Alerts error:", error);
    return c.json({ error: "فشل في جلب التنبيهات" }, 500);
  }
});

/**
 * تنبيهات المخزون المنخفض
 */
async function getLowStockAlerts(): Promise<Alert[]> {
  const alerts: Alert[] = [];

  try {
    // منتجات بدون مخزون
    const outOfStock = await db
      .select({
        productId: products.id,
        productName: products.nameAr,
        totalCount: count(serialNumbers.id),
        availableCount: sql<number>`COUNT(CASE WHEN ${serialNumbers.status} = 'available' THEN 1 END)`,
      })
      .from(products)
      .leftJoin(serialNumbers, eq(serialNumbers.productId, products.id))
      .groupBy(products.id, products.nameAr)
      .having(sql`COUNT(CASE WHEN ${serialNumbers.status} = 'available' THEN 1 END) = 0`);

    if (outOfStock.length > 0) {
      alerts.push({
        id: "low_stock_zero",
        type: "low_stock",
        category: "inventory",
        severity: "critical",
        title: "منتجات نفذت من المخزون",
        message: `${outOfStock.length} منتج بدون مخزون متاح`,
        count: outOfStock.length,
        actionUrl: "/products?stock=zero",
        actionLabel: "عرض المنتجات",
        metadata: { products: outOfStock.slice(0, 5) },
      });
    }

    // منتجات بمخزون منخفض (أقل من 5)
    const lowStock = await db
      .select({
        productId: products.id,
        productName: products.nameAr,
        availableCount: sql<number>`COUNT(CASE WHEN ${serialNumbers.status} = 'available' THEN 1 END)`,
      })
      .from(products)
      .leftJoin(serialNumbers, eq(serialNumbers.productId, products.id))
      .groupBy(products.id, products.nameAr)
      .having(sql`COUNT(CASE WHEN ${serialNumbers.status} = 'available' THEN 1 END) BETWEEN 1 AND 5`);

    if (lowStock.length > 0) {
      alerts.push({
        id: "low_stock_warning",
        type: "low_stock",
        category: "inventory",
        severity: "warning",
        title: "مخزون منخفض",
        message: `${lowStock.length} منتج بمخزون أقل من 5 وحدات`,
        count: lowStock.length,
        actionUrl: "/products?stock=low",
        actionLabel: "عرض المنتجات",
        metadata: { products: lowStock.slice(0, 5) },
      });
    }
  } catch (error) {
    console.error("Low stock alerts error:", error);
  }

  return alerts;
}

/**
 * تنبيهات الصيانة المعلقة
 */
async function getPendingMaintenanceAlerts(): Promise<Alert[]> {
  const alerts: Alert[] = [];

  try {
    // صيانات قديمة (أكثر من 7 أيام)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const oldMaintenance = await db
      .select({ count: count() })
      .from(maintenanceOrders)
      .where(
        and(
          or(
            eq(maintenanceOrders.status, "received"),
            eq(maintenanceOrders.status, "diagnosing"),
            eq(maintenanceOrders.status, "in_progress")
          ),
          lte(maintenanceOrders.receivedAt, sevenDaysAgo)
        )
      );

    if (oldMaintenance[0]?.count > 0) {
      alerts.push({
        id: "maintenance_old",
        type: "pending_maintenance",
        category: "maintenance",
        severity: "critical",
        title: "صيانات متأخرة",
        message: `${oldMaintenance[0].count} أمر صيانة معلق منذ أكثر من 7 أيام`,
        count: oldMaintenance[0].count,
        actionUrl: "/maintenance?status=pending&old=true",
        actionLabel: "عرض الصيانات",
      });
    }

    // صيانات بانتظار موافقة العميل
    const [waitingApproval] = await db
      .select({ count: count() })
      .from(maintenanceOrders)
      .where(eq(maintenanceOrders.status, "waiting_approval"));

    if (waitingApproval?.count > 0) {
      alerts.push({
        id: "maintenance_approval",
        type: "pending_approval",
        category: "maintenance",
        severity: "warning",
        title: "بانتظار موافقة العميل",
        message: `${waitingApproval.count} أمر صيانة بانتظار موافقة العميل`,
        count: waitingApproval.count,
        actionUrl: "/maintenance?status=waiting_approval",
        actionLabel: "عرض الصيانات",
      });
    }

    // صيانات جاهزة للتسليم
    const [readyForDelivery] = await db
      .select({ count: count() })
      .from(maintenanceOrders)
      .where(eq(maintenanceOrders.status, "completed"));

    if (readyForDelivery?.count > 0) {
      alerts.push({
        id: "maintenance_ready",
        type: "ready_delivery",
        category: "maintenance",
        severity: "info",
        title: "جاهزة للتسليم",
        message: `${readyForDelivery.count} أمر صيانة جاهز للتسليم للعميل`,
        count: readyForDelivery.count,
        actionUrl: "/maintenance?status=completed",
        actionLabel: "عرض الصيانات",
      });
    }
  } catch (error) {
    console.error("Maintenance alerts error:", error);
  }

  return alerts;
}

/**
 * تنبيهات المشتريات المعلقة
 */
async function getPendingPurchaseAlerts(): Promise<Alert[]> {
  const alerts: Alert[] = [];

  try {
    // وجبات شراء بانتظار الاستلام
    const [pendingReceipt] = await db
      .select({ count: count() })
      .from(purchaseBatches)
      .where(eq(purchaseBatches.status, "ready_for_receiving"));

    if (pendingReceipt?.count > 0) {
      alerts.push({
        id: "purchase_pending",
        type: "pending_purchase",
        category: "purchases",
        severity: "info",
        title: "وجبات بانتظار الاستلام",
        message: `${pendingReceipt.count} وجبة شراء جاهزة للاستلام`,
        count: pendingReceipt.count,
        actionUrl: "/purchases?status=ready_for_receiving",
        actionLabel: "عرض الوجبات",
      });
    }

    // وجبات شراء بانتظار الأسعار (أكثر من 3 أيام)
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const [oldDrafts] = await db
      .select({ count: count() })
      .from(purchaseBatches)
      .where(
        and(
          eq(purchaseBatches.status, "awaiting_prices"),
          lte(purchaseBatches.createdAt, threeDaysAgo)
        )
      );

    if (oldDrafts?.count > 0) {
      alerts.push({
        id: "purchase_draft",
        type: "old_awaiting_prices",
        category: "purchases",
        severity: "warning",
        title: "وجبات بانتظار الأسعار",
        message: `${oldDrafts.count} وجبة شراء بانتظار تحديد الأسعار منذ 3 أيام`,
        count: oldDrafts.count,
        actionUrl: "/purchases?status=awaiting_prices",
        actionLabel: "عرض الوجبات",
      });
    }
  } catch (error) {
    console.error("Purchase alerts error:", error);
  }

  return alerts;
}

/**
 * تنبيهات الفواتير غير المدفوعة
 */
async function getUnpaidInvoiceAlerts(): Promise<Alert[]> {
  const alerts: Alert[] = [];

  try {
    // فواتير غير مدفوعة
    const unpaid = await db
      .select({
        count: count(),
        totalAmount: sql<number>`SUM(CAST(${invoices.total} AS DECIMAL) - COALESCE(CAST(${invoices.paidAmount} AS DECIMAL), 0))`,
      })
      .from(invoices)
      .where(
        and(
          eq(invoices.type, "sale"),
          or(eq(invoices.status, "pending"), eq(invoices.status, "partial"))
        )
      );

    if (unpaid[0]?.count > 0) {
      alerts.push({
        id: "invoice_unpaid",
        type: "unpaid_invoices",
        category: "sales",
        severity: "warning",
        title: "فواتير غير مدفوعة",
        message: `${unpaid[0].count} فاتورة بمبلغ إجمالي ${Number(unpaid[0].totalAmount || 0).toLocaleString()} IQD`,
        count: unpaid[0].count,
        actionUrl: "/invoices?status=unpaid",
        actionLabel: "عرض الفواتير",
        metadata: { totalAmount: unpaid[0].totalAmount },
      });
    }

    // فواتير متأخرة (أكثر من 30 يوم)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [overdue] = await db
      .select({ count: count() })
      .from(invoices)
      .where(
        and(
          eq(invoices.type, "sale"),
          or(eq(invoices.status, "pending"), eq(invoices.status, "partial")),
          lte(invoices.createdAt, thirtyDaysAgo)
        )
      );

    if (overdue?.count > 0) {
      alerts.push({
        id: "invoice_overdue",
        type: "overdue_invoices",
        category: "sales",
        severity: "critical",
        title: "فواتير متأخرة",
        message: `${overdue.count} فاتورة متأخرة أكثر من 30 يوم`,
        count: overdue.count,
        actionUrl: "/invoices?status=overdue",
        actionLabel: "عرض الفواتير",
      });
    }
  } catch (error) {
    console.error("Invoice alerts error:", error);
  }

  return alerts;
}

/**
 * تنبيهات المرتجعات المعلقة
 */
async function getPendingReturnAlerts(): Promise<Alert[]> {
  const alerts: Alert[] = [];

  try {
    // مرتجعات معلقة
    const [pendingReturns] = await db
      .select({ count: count() })
      .from(returnRequests)
      .where(eq(returnRequests.status, "pending"));

    if (pendingReturns?.count > 0) {
      alerts.push({
        id: "returns_pending",
        type: "pending_returns",
        category: "purchases",
        severity: "warning",
        title: "مرتجعات معلقة",
        message: `${pendingReturns.count} طلب مرتجعات بانتظار الإرسال للمورد`,
        count: pendingReturns.count,
        actionUrl: "/returns?status=pending",
        actionLabel: "عرض المرتجعات",
      });
    }

    // مرتجعات مرسلة قديمة (أكثر من 14 يوم)
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const [oldSentReturns] = await db
      .select({ count: count() })
      .from(returnRequests)
      .where(
        and(
          eq(returnRequests.status, "sent"),
          lte(returnRequests.sentAt, twoWeeksAgo)
        )
      );

    if (oldSentReturns?.count > 0) {
      alerts.push({
        id: "returns_old",
        type: "old_returns",
        category: "purchases",
        severity: "critical",
        title: "مرتجعات متأخرة",
        message: `${oldSentReturns.count} طلب مرتجعات مرسل منذ أكثر من أسبوعين`,
        count: oldSentReturns.count,
        actionUrl: "/returns?status=sent&old=true",
        actionLabel: "عرض المرتجعات",
      });
    }
  } catch (error) {
    console.error("Return alerts error:", error);
  }

  return alerts;
}

/**
 * تنبيهات العهد طويلة المدة
 */
async function getLongCustodyAlerts(): Promise<Alert[]> {
  const alerts: Alert[] = [];

  try {
    // عهد أكثر من 30 يوم
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const longCustody = await db
      .select({ count: count() })
      .from(serialNumbers)
      .where(
        and(
          eq(serialNumbers.status, "in_custody"),
          lte(serialNumbers.custodySince, thirtyDaysAgo)
        )
      );

    if (longCustody[0]?.count > 0) {
      alerts.push({
        id: "custody_long",
        type: "long_custody",
        category: "hr",
        severity: "warning",
        title: "عهد طويلة المدة",
        message: `${longCustody[0].count} جهاز في العهدة منذ أكثر من 30 يوم`,
        count: longCustody[0].count,
        actionUrl: "/custody?old=true",
        actionLabel: "عرض العهد",
      });
    }
  } catch (error) {
    console.error("Custody alerts error:", error);
  }

  return alerts;
}

/**
 * ملخص التنبيهات للـ Dashboard
 */
app.get("/summary", async (c) => {
  try {
    const alerts: { category: string; count: number; severity: string }[] = [];

    // مخزون
    const [zeroStock] = await db
      .select({
        count: sql<number>`COUNT(DISTINCT ${products.id})`,
      })
      .from(products)
      .leftJoin(serialNumbers, eq(serialNumbers.productId, products.id))
      .where(
        or(
          isNull(serialNumbers.id),
          sql`NOT EXISTS (
            SELECT 1 FROM serial_numbers sn 
            WHERE sn.product_id = ${products.id} 
            AND sn.status = 'available'
          )`
        )
      );

    if (zeroStock?.count > 0) {
      alerts.push({ category: "inventory", count: Number(zeroStock.count), severity: "critical" });
    }

    // صيانة
    const [pendingMaintenance] = await db
      .select({ count: count() })
      .from(maintenanceOrders)
      .where(
        or(
          eq(maintenanceOrders.status, "received"),
          eq(maintenanceOrders.status, "diagnosing"),
          eq(maintenanceOrders.status, "in_progress"),
          eq(maintenanceOrders.status, "waiting_approval")
        )
      );

    if (pendingMaintenance?.count > 0) {
      alerts.push({ category: "maintenance", count: pendingMaintenance.count, severity: "warning" });
    }

    // فواتير
    const [unpaidInvoices] = await db
      .select({ count: count() })
      .from(invoices)
      .where(
        and(
          eq(invoices.type, "sale"),
          or(eq(invoices.status, "pending"), eq(invoices.status, "partial"))
        )
      );

    if (unpaidInvoices?.count > 0) {
      alerts.push({ category: "sales", count: unpaidInvoices.count, severity: "warning" });
    }

    return c.json({
      alerts,
      totalAlerts: alerts.reduce((sum, a) => sum + a.count, 0),
    });
  } catch (error) {
    console.error("Summary error:", error);
    return c.json({ error: "فشل في جلب الملخص" }, 500);
  }
});

/**
 * فئات التنبيهات
 */
app.get("/categories", async (c) => {
  const categories = [
    { id: "inventory", label: "المخزون", icon: "📦", color: "blue" },
    { id: "maintenance", label: "الصيانة", icon: "🔧", color: "orange" },
    { id: "purchases", label: "المشتريات", icon: "🛒", color: "green" },
    { id: "sales", label: "المبيعات", icon: "💰", color: "purple" },
    { id: "hr", label: "الموارد البشرية", icon: "👥", color: "pink" },
  ];

  return c.json(categories);
});

export default app;

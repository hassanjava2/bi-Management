/**
 * بوابة العميل - Customer Portal API
 * ──────────────────────────────────────
 * واجهة للعميل يشوف فواتيره، أقساطه، ضماناته، نقاطه
 */
import { Hono } from "hono";
import {
  db,
  customers,
  invoices,
  invoiceItems,
  installmentSchedules,
  productWarranties,
  warrantyClaims,
  products,
  customerLoyaltyAccounts,
  loyaltyTransactions,
} from "@bi-management/database";
import { eq, desc, and, sql, count, sum } from "drizzle-orm";

const app = new Hono();

/**
 * بحث بالهاتف - تسجيل دخول بسيط
 */
app.post("/login", async (c) => {
  try {
    const body = await c.req.json();
    const { phone } = body;

    if (!phone) return c.json({ error: "رقم الهاتف مطلوب" }, 400);

    const cleanPhone = phone.replace(/\D/g, "").slice(-10);

    const [customer] = await db
      .select()
      .from(customers)
      .where(sql`REPLACE(${customers.phone}, '-', '') LIKE ${"%" + cleanPhone}`);

    if (!customer) {
      return c.json({ error: "رقم الهاتف غير مسجل" }, 404);
    }

    return c.json({
      success: true,
      data: {
        customerId: customer.id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
      },
    });
  } catch (error) {
    console.error("Customer login error:", error);
    return c.json({ error: "فشل في البحث" }, 500);
  }
});

/**
 * ملخص حساب العميل
 */
app.get("/:customerId/summary", async (c) => {
  try {
    const customerId = c.req.param("customerId");

    // بيانات العميل
    const [customer] = await db.select().from(customers).where(eq(customers.id, customerId));
    if (!customer) return c.json({ error: "العميل غير موجود" }, 404);

    // عدد الفواتير والمبلغ الإجمالي
    const [invoiceStats] = await db
      .select({
        count: count(),
        totalAmount: sum(invoices.total),
        paidAmount: sum(invoices.paidAmount),
        remainingAmount: sum(invoices.remainingAmount),
      })
      .from(invoices)
      .where(and(eq(invoices.customerId, customerId), eq(invoices.isDeleted, 0)));

    // الأقساط المعلقة
    const pendingInstallments = await db
      .select({
        id: installmentSchedules.id,
        invoiceId: installmentSchedules.invoiceId,
        installmentNumber: installmentSchedules.installmentNumber,
        amount: installmentSchedules.amount,
        dueDate: installmentSchedules.dueDate,
        status: installmentSchedules.status,
        paidAmount: installmentSchedules.paidAmount,
      })
      .from(installmentSchedules)
      .innerJoin(invoices, eq(installmentSchedules.invoiceId, invoices.id))
      .where(
        and(
          eq(invoices.customerId, customerId),
          eq(installmentSchedules.status, "pending")
        )
      )
      .orderBy(installmentSchedules.dueDate);

    // الضمانات النشطة
    const [warrantyCount] = await db
      .select({ count: count() })
      .from(productWarranties)
      .where(and(eq(productWarranties.customerId, customerId), eq(productWarranties.status, "active")));

    // نقاط الولاء
    const [loyaltyAccount] = await db
      .select()
      .from(customerLoyaltyAccounts)
      .where(eq(customerLoyaltyAccounts.customerId, customerId));

    return c.json({
      success: true,
      data: {
        customer: {
          id: customer.id,
          name: customer.name,
          phone: customer.phone,
        },
        invoices: {
          total: Number(invoiceStats?.count) || 0,
          totalAmount: Math.round(Number(invoiceStats?.totalAmount) || 0),
          paidAmount: Math.round(Number(invoiceStats?.paidAmount) || 0),
          remainingAmount: Math.round(Number(invoiceStats?.remainingAmount) || 0),
        },
        installments: {
          pending: pendingInstallments.length,
          nextDue: pendingInstallments[0] || null,
          totalPending: pendingInstallments.reduce((s, i) => s + (Number(i.amount) - Number(i.paidAmount || 0)), 0),
        },
        warranties: { activeCount: Number(warrantyCount?.count) || 0 },
        loyalty: {
          currentPoints: loyaltyAccount?.currentPoints || 0,
          totalEarned: loyaltyAccount?.totalEarnedPoints || 0,
          tier: loyaltyAccount?.tierId || "standard",
        },
      },
    });
  } catch (error) {
    console.error("Customer summary error:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

/**
 * فواتير العميل
 */
app.get("/:customerId/invoices", async (c) => {
  try {
    const customerId = c.req.param("customerId");

    const customerInvoices = await db
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        type: invoices.type,
        paymentType: invoices.paymentType,
        total: invoices.total,
        paidAmount: invoices.paidAmount,
        remainingAmount: invoices.remainingAmount,
        status: invoices.status,
        paymentStatus: invoices.paymentStatus,
        createdAt: invoices.createdAt,
      })
      .from(invoices)
      .where(and(eq(invoices.customerId, customerId), eq(invoices.isDeleted, 0)))
      .orderBy(desc(invoices.createdAt));

    return c.json({ success: true, data: customerInvoices });
  } catch (error) {
    return c.json({ error: "فشل في جلب الفواتير" }, 500);
  }
});

/**
 * أقساط العميل
 */
app.get("/:customerId/installments", async (c) => {
  try {
    const customerId = c.req.param("customerId");

    const allInstallments = await db
      .select({
        id: installmentSchedules.id,
        invoiceId: installmentSchedules.invoiceId,
        invoiceNumber: invoices.invoiceNumber,
        installmentNumber: installmentSchedules.installmentNumber,
        amount: installmentSchedules.amount,
        dueDate: installmentSchedules.dueDate,
        status: installmentSchedules.status,
        paidAmount: installmentSchedules.paidAmount,
        paidDate: installmentSchedules.paidDate,
        lateFee: installmentSchedules.lateFee,
      })
      .from(installmentSchedules)
      .innerJoin(invoices, eq(installmentSchedules.invoiceId, invoices.id))
      .where(eq(invoices.customerId, customerId))
      .orderBy(installmentSchedules.dueDate);

    // تصنيف: مدفوع، قادم، متأخر
    const now = new Date().toISOString().split("T")[0];
    const categorized = allInstallments.map((inst) => ({
      ...inst,
      category: inst.status === "paid" ? "paid" : inst.dueDate < now ? "overdue" : "upcoming",
    }));

    return c.json({
      success: true,
      data: categorized,
      summary: {
        total: categorized.length,
        paid: categorized.filter((i) => i.category === "paid").length,
        upcoming: categorized.filter((i) => i.category === "upcoming").length,
        overdue: categorized.filter((i) => i.category === "overdue").length,
      },
    });
  } catch (error) {
    return c.json({ error: "فشل في جلب الأقساط" }, 500);
  }
});

/**
 * ضمانات العميل
 */
app.get("/:customerId/warranties", async (c) => {
  try {
    const customerId = c.req.param("customerId");

    const warranties = await db
      .select({
        id: productWarranties.id,
        warrantyNumber: productWarranties.warrantyNumber,
        serialNumber: productWarranties.serialNumber,
        productName: products.nameAr,
        model: products.model,
        startDate: productWarranties.startDate,
        endDate: productWarranties.endDate,
        status: productWarranties.status,
        claimsCount: productWarranties.claimsCount,
      })
      .from(productWarranties)
      .leftJoin(products, eq(productWarranties.productId, products.id))
      .where(eq(productWarranties.customerId, customerId))
      .orderBy(desc(productWarranties.endDate));

    const now = new Date();
    const result = warranties.map((w) => {
      const endDate = new Date(w.endDate!);
      const isExpired = endDate < now;
      const daysLeft = isExpired ? 0 : Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      return {
        ...w,
        isExpired,
        daysLeft,
        statusLabel: isExpired ? "منتهي" : daysLeft <= 7 ? "ينتهي قريباً" : "ساري",
      };
    });

    return c.json({ success: true, data: result });
  } catch (error) {
    return c.json({ error: "فشل في جلب الضمانات" }, 500);
  }
});

/**
 * نقاط ولاء العميل
 */
app.get("/:customerId/loyalty", async (c) => {
  try {
    const customerId = c.req.param("customerId");

    const [account] = await db
      .select()
      .from(customerLoyaltyAccounts)
      .where(eq(customerLoyaltyAccounts.customerId, customerId));

    if (!account) {
      return c.json({ success: true, data: { hasAccount: false, points: 0 } });
    }

    // آخر المعاملات
    const transactions = await db
      .select()
      .from(loyaltyTransactions)
      .where(eq(loyaltyTransactions.customerId, customerId))
      .orderBy(desc(loyaltyTransactions.createdAt))
      .limit(20);

    return c.json({
      success: true,
      data: {
        hasAccount: true,
        currentPoints: account.currentPoints,
        totalEarned: account.totalEarnedPoints,
        totalRedeemed: account.totalRedeemedPoints,
        tier: account.tierId || "standard",
        transactions,
      },
    });
  } catch (error) {
    return c.json({ error: "فشل في جلب النقاط" }, 500);
  }
});

export default app;

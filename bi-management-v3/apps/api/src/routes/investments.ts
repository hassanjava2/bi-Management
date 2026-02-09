/**
 * API routes للمحافظ والاستثمارات
 */
import { Hono } from "hono";
import {
  db,
  investmentPortfolios,
  investments,
  investmentTransactions,
  portfolioValuations,
  investmentGoals,
  investmentAlerts,
} from "@bi-management/database";
import { eq, desc, and, or, ilike, count, sum, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { authMiddleware } from "../lib/auth.js";

const app = new Hono();

// توليد الأرقام
function generateNumber(prefix: string) {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
  return `${prefix}-${year}-${random}`;
}

// إحصائيات المحافظ
app.get("/stats", async (c) => {
  try {
    const [portfolioStats] = await db.select({
      totalPortfolios: count(),
      activePortfolios: count(sql`CASE WHEN status = 'active' THEN 1 END`),
    }).from(investmentPortfolios);

    const [valueStats] = await db.select({
      totalValue: sum(investmentPortfolios.currentValue),
      totalInvested: sum(investmentPortfolios.totalInvested),
    }).from(investmentPortfolios).where(eq(investmentPortfolios.status, "active"));

    const [investmentStats] = await db.select({
      totalInvestments: count(),
      activeInvestments: count(sql`CASE WHEN status = 'active' THEN 1 END`),
    }).from(investments);

    const [goalStats] = await db.select({
      totalGoals: count(),
      activeGoals: count(sql`CASE WHEN status = 'active' THEN 1 END`),
    }).from(investmentGoals);

    return c.json({
      portfolios: {
        total: portfolioStats.totalPortfolios,
        active: portfolioStats.activePortfolios || 0,
      },
      values: {
        totalValue: parseFloat(valueStats.totalValue?.toString() || "0"),
        totalInvested: parseFloat(valueStats.totalInvested?.toString() || "0"),
        totalGain: parseFloat(valueStats.totalValue?.toString() || "0") - parseFloat(valueStats.totalInvested?.toString() || "0"),
      },
      investments: {
        total: investmentStats.totalInvestments,
        active: investmentStats.activeInvestments || 0,
      },
      goals: {
        total: goalStats.totalGoals,
        active: goalStats.activeGoals || 0,
      },
    });
  } catch (error) {
    console.error("Error fetching investment stats:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

// ====== المحافظ ======

// قائمة المحافظ
app.get("/portfolios", async (c) => {
  try {
    const { status, type } = c.req.query();

    let query = db.select().from(investmentPortfolios);
    const conditions = [];

    if (status) conditions.push(eq(investmentPortfolios.status, status));
    if (type) conditions.push(eq(investmentPortfolios.portfolioType, type));

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    const items = await query.orderBy(desc(investmentPortfolios.currentValue)).limit(50);
    return c.json(items);
  } catch (error) {
    console.error("Error fetching portfolios:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

// إنشاء محفظة
app.post("/portfolios", async (c) => {
  try {
    const body = await c.req.json();
    const id = `pf_${nanoid(12)}`;
    const portfolioNumber = generateNumber("PF");

    await db.insert(investmentPortfolios).values({
      id,
      portfolioNumber,
      name: body.name,
      description: body.description || null,
      portfolioType: body.portfolioType || "mixed",
      riskProfile: body.riskProfile || "moderate",
      investmentStrategy: body.investmentStrategy || null,
      initialValue: body.initialValue,
      currentValue: body.initialValue,
      totalInvested: body.initialValue,
      currency: body.currency || "IQD",
      targetValue: body.targetValue || null,
      targetDate: body.targetDate ? new Date(body.targetDate) : null,
      targetReturnRate: body.targetReturnRate || null,
      status: "active",
      allocationStrategy: body.allocationStrategy || null,
      managerId: body.managerId || null,
      ownerDepartmentId: body.ownerDepartmentId || null,
      custodianAccount: body.custodianAccount || null,
      inceptionDate: new Date(body.inceptionDate || Date.now()),
      autoRebalance: body.autoRebalance || false,
      rebalanceThreshold: body.rebalanceThreshold || null,
      notes: body.notes || null,
      createdBy: body.createdBy || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return c.json({ id, portfolioNumber }, 201);
  } catch (error) {
    console.error("Error creating portfolio:", error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

// تفاصيل محفظة
app.get("/portfolios/:id", async (c) => {
  try {
    const { id } = c.req.param();
    const [portfolio] = await db.select().from(investmentPortfolios).where(eq(investmentPortfolios.id, id));
    if (!portfolio) return c.json({ error: "غير موجود" }, 404);

    const portfolioInvestments = await db.select().from(investments)
      .where(and(eq(investments.portfolioId, id), eq(investments.status, "active")))
      .orderBy(desc(investments.currentValue));

    const recentTransactions = await db.select().from(investmentTransactions)
      .where(eq(investmentTransactions.portfolioId, id))
      .orderBy(desc(investmentTransactions.transactionDate))
      .limit(20);

    const goals = await db.select().from(investmentGoals)
      .where(eq(investmentGoals.portfolioId, id));

    const [latestValuation] = await db.select().from(portfolioValuations)
      .where(eq(portfolioValuations.portfolioId, id))
      .orderBy(desc(portfolioValuations.valuationDate))
      .limit(1);

    return c.json({
      ...portfolio,
      investments: portfolioInvestments,
      recentTransactions,
      goals,
      latestValuation,
    });
  } catch (error) {
    console.error("Error fetching portfolio details:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

// تحديث قيمة المحفظة
app.post("/portfolios/:id/valuate", async (c) => {
  try {
    const { id } = c.req.param();
    const body = await c.req.json();

    const [portfolio] = await db.select().from(investmentPortfolios).where(eq(investmentPortfolios.id, id));
    if (!portfolio) return c.json({ error: "غير موجود" }, 404);

    // حساب القيمة الإجمالية من الاستثمارات
    const [valueSum] = await db.select({
      total: sum(investments.currentValue),
    }).from(investments)
      .where(and(eq(investments.portfolioId, id), eq(investments.status, "active")));

    const totalValue = parseFloat(valueSum.total?.toString() || "0");
    const totalInvested = parseFloat(portfolio.totalInvested?.toString() || "0");
    const unrealizedGain = totalValue - totalInvested;

    // تحديث المحفظة
    await db.update(investmentPortfolios).set({
      currentValue: totalValue.toString(),
      unrealizedGain: unrealizedGain.toString(),
      lastValuationDate: new Date(),
      updatedAt: new Date(),
    }).where(eq(investmentPortfolios.id, id));

    // إنشاء سجل تقييم
    const valuationId = `pv_${nanoid(12)}`;
    await db.insert(portfolioValuations).values({
      id: valuationId,
      portfolioId: id,
      valuationDate: new Date(),
      totalValue: totalValue.toString(),
      totalCost: totalInvested.toString(),
      unrealizedGain: unrealizedGain.toString(),
      valuedBy: body.valuedBy || null,
      createdAt: new Date(),
    });

    return c.json({ totalValue, unrealizedGain, valuationId });
  } catch (error) {
    console.error("Error valuating portfolio:", error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

// ====== الاستثمارات ======

// قائمة الاستثمارات
app.get("/investments", async (c) => {
  try {
    const { portfolioId, status, type } = c.req.query();

    let query = db.select().from(investments);
    const conditions = [];

    if (portfolioId) conditions.push(eq(investments.portfolioId, portfolioId));
    if (status) conditions.push(eq(investments.status, status));
    if (type) conditions.push(eq(investments.investmentType, type));

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    const items = await query.orderBy(desc(investments.currentValue)).limit(100);
    return c.json(items);
  } catch (error) {
    console.error("Error fetching investments:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

// شراء استثمار
app.post("/investments", async (c) => {
  try {
    const body = await c.req.json();
    const id = `inv_${nanoid(12)}`;
    const investmentNumber = generateNumber("INV");

    const quantity = parseFloat(body.quantity);
    const purchasePrice = parseFloat(body.purchasePrice);
    const purchaseValue = quantity * purchasePrice;
    const commission = parseFloat(body.commission || "0");
    const fees = parseFloat(body.fees || "0");

    await db.insert(investments).values({
      id,
      investmentNumber,
      portfolioId: body.portfolioId,
      name: body.name,
      description: body.description || null,
      investmentType: body.investmentType || "stock",
      assetClass: body.assetClass || "equity",
      ticker: body.ticker || null,
      exchange: body.exchange || null,
      isin: body.isin || null,
      sector: body.sector || null,
      country: body.country || null,
      quantity: quantity.toString(),
      purchasePrice: purchasePrice.toString(),
      currentPrice: purchasePrice.toString(),
      currency: body.currency || "IQD",
      purchaseValue: purchaseValue.toString(),
      currentValue: purchaseValue.toString(),
      unrealizedGain: "0",
      unrealizedGainPercent: "0",
      purchaseDate: new Date(body.purchaseDate || Date.now()),
      settlementDate: body.settlementDate ? new Date(body.settlementDate) : null,
      maturityDate: body.maturityDate ? new Date(body.maturityDate) : null,
      status: "active",
      dividendYield: body.dividendYield || null,
      couponRate: body.couponRate || null,
      brokerId: body.brokerId || null,
      brokerName: body.brokerName || null,
      commission: commission.toString(),
      fees: fees.toString(),
      notes: body.notes || null,
      createdBy: body.createdBy || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // تسجيل معاملة الشراء
    const transactionId = `tr_${nanoid(12)}`;
    const totalAmount = purchaseValue + commission + fees;

    await db.insert(investmentTransactions).values({
      id: transactionId,
      transactionNumber: generateNumber("TRX"),
      portfolioId: body.portfolioId,
      investmentId: id,
      transactionType: "buy",
      quantity: quantity.toString(),
      price: purchasePrice.toString(),
      amount: purchaseValue.toString(),
      currency: body.currency || "IQD",
      commission: commission.toString(),
      fees: fees.toString(),
      netAmount: totalAmount.toString(),
      transactionDate: new Date(body.purchaseDate || Date.now()),
      settlementDate: body.settlementDate ? new Date(body.settlementDate) : null,
      status: "completed",
      referenceNumber: body.referenceNumber || null,
      notes: body.notes || null,
      createdBy: body.createdBy || null,
      createdAt: new Date(),
    });

    // تحديث إجمالي المحفظة
    const [portfolio] = await db.select().from(investmentPortfolios).where(eq(investmentPortfolios.id, body.portfolioId));
    if (portfolio) {
      const newTotalInvested = parseFloat(portfolio.totalInvested?.toString() || "0") + totalAmount;
      await db.update(investmentPortfolios).set({
        totalInvested: newTotalInvested.toString(),
        updatedAt: new Date(),
      }).where(eq(investmentPortfolios.id, body.portfolioId));
    }

    return c.json({ id, investmentNumber, transactionId }, 201);
  } catch (error) {
    console.error("Error creating investment:", error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

// تحديث سعر الاستثمار
app.patch("/investments/:id/price", async (c) => {
  try {
    const { id } = c.req.param();
    const { currentPrice } = await c.req.json();

    const [investment] = await db.select().from(investments).where(eq(investments.id, id));
    if (!investment) return c.json({ error: "غير موجود" }, 404);

    const quantity = parseFloat(investment.quantity?.toString() || "0");
    const newPrice = parseFloat(currentPrice);
    const purchaseValue = parseFloat(investment.purchaseValue?.toString() || "0");
    const newValue = quantity * newPrice;
    const unrealizedGain = newValue - purchaseValue;
    const unrealizedGainPercent = purchaseValue > 0 ? (unrealizedGain / purchaseValue) * 100 : 0;

    await db.update(investments).set({
      currentPrice: newPrice.toString(),
      currentValue: newValue.toString(),
      unrealizedGain: unrealizedGain.toString(),
      unrealizedGainPercent: unrealizedGainPercent.toString(),
      updatedAt: new Date(),
    }).where(eq(investments.id, id));

    return c.json({ currentValue: newValue, unrealizedGain, unrealizedGainPercent });
  } catch (error) {
    console.error("Error updating investment price:", error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

// بيع استثمار
app.post("/investments/:id/sell", async (c) => {
  try {
    const { id } = c.req.param();
    const body = await c.req.json();

    const [investment] = await db.select().from(investments).where(eq(investments.id, id));
    if (!investment) return c.json({ error: "غير موجود" }, 404);

    const sellQuantity = parseFloat(body.quantity);
    const sellPrice = parseFloat(body.price);
    const totalQuantity = parseFloat(investment.quantity?.toString() || "0");
    const purchasePrice = parseFloat(investment.purchasePrice?.toString() || "0");

    if (sellQuantity > totalQuantity) {
      return c.json({ error: "الكمية المباعة أكبر من المتاحة" }, 400);
    }

    const sellValue = sellQuantity * sellPrice;
    const costBasis = sellQuantity * purchasePrice;
    const realizedGain = sellValue - costBasis;
    const commission = parseFloat(body.commission || "0");
    const fees = parseFloat(body.fees || "0");
    const netAmount = sellValue - commission - fees;

    // تسجيل معاملة البيع
    const transactionId = `tr_${nanoid(12)}`;
    await db.insert(investmentTransactions).values({
      id: transactionId,
      transactionNumber: generateNumber("TRX"),
      portfolioId: investment.portfolioId,
      investmentId: id,
      transactionType: "sell",
      quantity: sellQuantity.toString(),
      price: sellPrice.toString(),
      amount: sellValue.toString(),
      currency: investment.currency || "IQD",
      realizedGain: realizedGain.toString(),
      costBasis: costBasis.toString(),
      commission: commission.toString(),
      fees: fees.toString(),
      netAmount: netAmount.toString(),
      transactionDate: new Date(),
      status: "completed",
      notes: body.notes || null,
      createdBy: body.createdBy || null,
      createdAt: new Date(),
    });

    // تحديث الاستثمار
    const remainingQuantity = totalQuantity - sellQuantity;
    if (remainingQuantity <= 0) {
      await db.update(investments).set({
        quantity: "0",
        currentValue: "0",
        status: "sold",
        updatedAt: new Date(),
      }).where(eq(investments.id, id));
    } else {
      const remainingValue = remainingQuantity * parseFloat(investment.currentPrice?.toString() || "0");
      await db.update(investments).set({
        quantity: remainingQuantity.toString(),
        currentValue: remainingValue.toString(),
        purchaseValue: (remainingQuantity * purchasePrice).toString(),
        updatedAt: new Date(),
      }).where(eq(investments.id, id));
    }

    // تحديث المحفظة
    const [portfolio] = await db.select().from(investmentPortfolios).where(eq(investmentPortfolios.id, investment.portfolioId));
    if (portfolio) {
      const newRealizedGain = parseFloat(portfolio.realizedGain?.toString() || "0") + realizedGain;
      await db.update(investmentPortfolios).set({
        realizedGain: newRealizedGain.toString(),
        totalWithdrawn: (parseFloat(portfolio.totalWithdrawn?.toString() || "0") + netAmount).toString(),
        updatedAt: new Date(),
      }).where(eq(investmentPortfolios.id, investment.portfolioId));
    }

    return c.json({ transactionId, realizedGain, netAmount });
  } catch (error) {
    console.error("Error selling investment:", error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

// ====== المعاملات ======

app.get("/transactions", async (c) => {
  try {
    const { portfolioId, investmentId, type } = c.req.query();

    let query = db.select().from(investmentTransactions);
    const conditions = [];

    if (portfolioId) conditions.push(eq(investmentTransactions.portfolioId, portfolioId));
    if (investmentId) conditions.push(eq(investmentTransactions.investmentId, investmentId));
    if (type) conditions.push(eq(investmentTransactions.transactionType, type));

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    const items = await query.orderBy(desc(investmentTransactions.transactionDate)).limit(100);
    return c.json(items);
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

// ====== الأهداف ======

app.get("/goals", async (c) => {
  try {
    const { portfolioId, status } = c.req.query();

    let query = db.select().from(investmentGoals);
    const conditions = [];

    if (portfolioId) conditions.push(eq(investmentGoals.portfolioId, portfolioId));
    if (status) conditions.push(eq(investmentGoals.status, status));

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    const items = await query.orderBy(desc(investmentGoals.targetDate));
    return c.json(items);
  } catch (error) {
    console.error("Error fetching investment goals:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.post("/goals", async (c) => {
  try {
    const body = await c.req.json();
    const id = `ig_${nanoid(12)}`;

    await db.insert(investmentGoals).values({
      id,
      portfolioId: body.portfolioId,
      name: body.name,
      description: body.description || null,
      goalType: body.goalType || "accumulation",
      targetAmount: body.targetAmount,
      currentAmount: body.currentAmount || "0",
      currency: body.currency || "IQD",
      targetDate: body.targetDate ? new Date(body.targetDate) : null,
      startDate: new Date(body.startDate || Date.now()),
      monthlyContribution: body.monthlyContribution || null,
      contributionFrequency: body.contributionFrequency || "monthly",
      status: "active",
      priority: body.priority || "medium",
      notes: body.notes || null,
      createdBy: body.createdBy || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return c.json({ id }, 201);
  } catch (error) {
    console.error("Error creating investment goal:", error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

export default app;

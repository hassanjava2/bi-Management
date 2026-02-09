/**
 * API Routes - نظام برامج الولاء
 */
import { Hono } from "hono";
import {
  db, loyaltyPrograms, loyaltyTiers, customerLoyaltyAccounts, loyaltyTransactions,
  loyaltyRewards, rewardRedemptions, loyaltyBonusRules, customers
} from "@bi-management/database";
import { eq, and, desc, count, sql, gte, lte, or } from "drizzle-orm";
import { nanoid } from "nanoid";
import { authMiddleware } from "../lib/auth.js";

const app = new Hono();

// ========== البرامج ==========

app.get("/programs", async (c) => {
  try {
    const programs = await db.select().from(loyaltyPrograms).orderBy(desc(loyaltyPrograms.createdAt));
    return c.json(programs);
  } catch (error) {
    console.error("Get programs error:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.get("/programs/active", async (c) => {
  try {
    const [program] = await db.select().from(loyaltyPrograms)
      .where(and(eq(loyaltyPrograms.isActive, true), eq(loyaltyPrograms.isDefault, true)))
      .limit(1);
    
    if (!program) {
      const [any] = await db.select().from(loyaltyPrograms).where(eq(loyaltyPrograms.isActive, true)).limit(1);
      return c.json(any || null);
    }
    return c.json(program);
  } catch (error) {
    console.error("Get active program error:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.post("/programs", async (c) => {
  try {
    const body = await c.req.json();
    const id = `lp_${nanoid(12)}`;

    await db.insert(loyaltyPrograms).values({
      id,
      name: body.name,
      description: body.description || null,
      isActive: body.isActive ?? true,
      isDefault: body.isDefault || false,
      pointsPerAmount: body.pointsPerAmount || 1,
      amountPerPoint: body.amountPerPoint || "1000",
      pointValue: body.pointValue || "100",
      minRedeemPoints: body.minRedeemPoints || 100,
      maxRedeemPercentage: body.maxRedeemPercentage || 50,
      pointsExpiryMonths: body.pointsExpiryMonths || null,
      createdBy: body.createdBy || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return c.json({ id }, 201);
  } catch (error) {
    console.error("Create program error:", error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

// ========== المستويات ==========

app.get("/tiers/:programId", async (c) => {
  try {
    const { programId } = c.req.param();
    const tiers = await db.select().from(loyaltyTiers)
      .where(eq(loyaltyTiers.programId, programId))
      .orderBy(loyaltyTiers.sortOrder);
    return c.json(tiers);
  } catch (error) {
    console.error("Get tiers error:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.post("/tiers", async (c) => {
  try {
    const body = await c.req.json();
    const id = `lt_${nanoid(12)}`;

    await db.insert(loyaltyTiers).values({
      id,
      programId: body.programId,
      name: body.name,
      description: body.description || null,
      minPoints: body.minPoints,
      minSpend: body.minSpend || null,
      pointsMultiplier: body.pointsMultiplier || "1",
      discountPercentage: body.discountPercentage || null,
      freeShipping: body.freeShipping || false,
      prioritySupport: body.prioritySupport || false,
      benefits: body.benefits || null,
      color: body.color || null,
      icon: body.icon || null,
      sortOrder: body.sortOrder || 0,
      isActive: true,
      createdAt: new Date(),
    });

    return c.json({ id }, 201);
  } catch (error) {
    console.error("Create tier error:", error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

// ========== حسابات العملاء ==========

app.get("/accounts", async (c) => {
  try {
    const { programId, tierId } = c.req.query();
    const conditions = [];
    if (programId) conditions.push(eq(customerLoyaltyAccounts.programId, programId));
    if (tierId) conditions.push(eq(customerLoyaltyAccounts.tierId, tierId));

    const accounts = await db.select({
      account: customerLoyaltyAccounts,
      customer: { id: customers.id, fullName: customers.name, phone: customers.phone },
      tier: { id: loyaltyTiers.id, name: loyaltyTiers.name, color: loyaltyTiers.color },
    }).from(customerLoyaltyAccounts)
      .leftJoin(customers, eq(customerLoyaltyAccounts.customerId, customers.id))
      .leftJoin(loyaltyTiers, eq(customerLoyaltyAccounts.tierId, loyaltyTiers.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(customerLoyaltyAccounts.currentPoints))
      .limit(100);

    return c.json(accounts.map(a => ({ ...a.account, customer: a.customer, tier: a.tier })));
  } catch (error) {
    console.error("Get accounts error:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.get("/accounts/customer/:customerId", async (c) => {
  try {
    const { customerId } = c.req.param();
    const [account] = await db.select({
      account: customerLoyaltyAccounts,
      tier: loyaltyTiers,
      program: loyaltyPrograms,
    }).from(customerLoyaltyAccounts)
      .leftJoin(loyaltyTiers, eq(customerLoyaltyAccounts.tierId, loyaltyTiers.id))
      .leftJoin(loyaltyPrograms, eq(customerLoyaltyAccounts.programId, loyaltyPrograms.id))
      .where(eq(customerLoyaltyAccounts.customerId, customerId))
      .limit(1);

    if (!account) return c.json(null);

    // جلب آخر المعاملات
    const transactions = await db.select().from(loyaltyTransactions)
      .where(eq(loyaltyTransactions.customerId, customerId))
      .orderBy(desc(loyaltyTransactions.createdAt)).limit(20);

    return c.json({ ...account.account, tier: account.tier, program: account.program, transactions });
  } catch (error) {
    console.error("Get customer account error:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

/**
 * إنشاء أو جلب حساب ولاء للعميل
 */
app.post("/accounts/ensure", async (c) => {
  try {
    const { customerId, programId } = await c.req.json();

    // التحقق من وجود حساب
    const [existing] = await db.select().from(customerLoyaltyAccounts)
      .where(and(eq(customerLoyaltyAccounts.customerId, customerId), eq(customerLoyaltyAccounts.programId, programId)));

    if (existing) return c.json(existing);

    // إنشاء حساب جديد
    const id = `cla_${nanoid(12)}`;
    await db.insert(customerLoyaltyAccounts).values({
      id,
      customerId,
      programId,
      currentPoints: 0,
      totalEarnedPoints: 0,
      totalRedeemedPoints: 0,
      totalExpiredPoints: 0,
      totalSpend: "0",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const [newAccount] = await db.select().from(customerLoyaltyAccounts).where(eq(customerLoyaltyAccounts.id, id));
    return c.json(newAccount, 201);
  } catch (error) {
    console.error("Ensure account error:", error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

// ========== كسب النقاط ==========

app.post("/earn", async (c) => {
  try {
    const { customerId, programId, amount, sourceType, sourceId, description, processedBy } = await c.req.json();

    // جلب البرنامج
    const [program] = await db.select().from(loyaltyPrograms).where(eq(loyaltyPrograms.id, programId));
    if (!program) return c.json({ error: "البرنامج غير موجود" }, 404);

    // حساب النقاط
    const amountNum = parseFloat(amount);
    const amountPerPoint = parseFloat(program.amountPerPoint || "1000");
    let points = Math.floor(amountNum / amountPerPoint) * (program.pointsPerAmount || 1);

    if (points <= 0) return c.json({ points: 0, message: "المبلغ غير كافٍ لكسب نقاط" });

    // جلب أو إنشاء حساب العميل
    let [account] = await db.select().from(customerLoyaltyAccounts)
      .where(and(eq(customerLoyaltyAccounts.customerId, customerId), eq(customerLoyaltyAccounts.programId, programId)));

    if (!account) {
      const accountId = `cla_${nanoid(12)}`;
      await db.insert(customerLoyaltyAccounts).values({
        id: accountId, customerId, programId,
        currentPoints: 0, totalEarnedPoints: 0, totalRedeemedPoints: 0, totalExpiredPoints: 0,
        totalSpend: "0", isActive: true, createdAt: new Date(), updatedAt: new Date(),
      });
      [account] = await db.select().from(customerLoyaltyAccounts).where(eq(customerLoyaltyAccounts.id, accountId));
    }

    // تطبيق مضاعف المستوى
    if (account.tierId) {
      const [tier] = await db.select().from(loyaltyTiers).where(eq(loyaltyTiers.id, account.tierId));
      if (tier?.pointsMultiplier) {
        points = Math.floor(points * parseFloat(tier.pointsMultiplier));
      }
    }

    const newBalance = (account.currentPoints || 0) + points;

    // تحديث الحساب
    await db.update(customerLoyaltyAccounts).set({
      currentPoints: newBalance,
      totalEarnedPoints: (account.totalEarnedPoints || 0) + points,
      totalSpend: String(parseFloat(account.totalSpend || "0") + amountNum),
      lastEarnedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(customerLoyaltyAccounts.id, account.id));

    // تسجيل المعاملة
    const expiresAt = program.pointsExpiryMonths ? new Date(Date.now() + program.pointsExpiryMonths * 30 * 24 * 60 * 60 * 1000) : null;
    
    await db.insert(loyaltyTransactions).values({
      id: `lt_${nanoid(12)}`,
      accountId: account.id,
      customerId,
      transactionType: "earn",
      points,
      balanceAfter: newBalance,
      sourceType: sourceType || "invoice",
      sourceId,
      description: description || `كسب نقاط من فاتورة ${sourceId || ""}`,
      amountSpent: amount,
      expiresAt,
      processedBy,
      createdAt: new Date(),
    });

    // التحقق من ترقية المستوى
    await checkTierUpgrade(account.id, programId);

    return c.json({ points, newBalance });
  } catch (error) {
    console.error("Earn points error:", error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

// ========== استرداد النقاط ==========

app.post("/redeem", async (c) => {
  try {
    const { customerId, programId, points, sourceType, sourceId, description, processedBy } = await c.req.json();

    // جلب الحساب
    const [account] = await db.select().from(customerLoyaltyAccounts)
      .where(and(eq(customerLoyaltyAccounts.customerId, customerId), eq(customerLoyaltyAccounts.programId, programId)));

    if (!account) return c.json({ error: "الحساب غير موجود" }, 404);
    if ((account.currentPoints || 0) < points) return c.json({ error: "رصيد النقاط غير كافٍ" }, 400);

    // جلب البرنامج لحساب القيمة
    const [program] = await db.select().from(loyaltyPrograms).where(eq(loyaltyPrograms.id, programId));
    const redeemValue = points * parseFloat(program?.pointValue || "100");

    const newBalance = (account.currentPoints || 0) - points;

    // تحديث الحساب
    await db.update(customerLoyaltyAccounts).set({
      currentPoints: newBalance,
      totalRedeemedPoints: (account.totalRedeemedPoints || 0) + points,
      lastRedeemedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(customerLoyaltyAccounts.id, account.id));

    // تسجيل المعاملة
    await db.insert(loyaltyTransactions).values({
      id: `lt_${nanoid(12)}`,
      accountId: account.id,
      customerId,
      transactionType: "redeem",
      points: -points,
      balanceAfter: newBalance,
      sourceType: sourceType || "invoice",
      sourceId,
      description: description || "استرداد نقاط",
      amountRedeemed: String(redeemValue),
      processedBy,
      createdAt: new Date(),
    });

    return c.json({ points, redeemValue, newBalance });
  } catch (error) {
    console.error("Redeem points error:", error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

// ========== حساب قيمة الاسترداد ==========

app.post("/calculate-redeem", async (c) => {
  try {
    const { customerId, programId, points, orderAmount } = await c.req.json();

    const [account] = await db.select().from(customerLoyaltyAccounts)
      .where(and(eq(customerLoyaltyAccounts.customerId, customerId), eq(customerLoyaltyAccounts.programId, programId)));

    if (!account) return c.json({ canRedeem: false, error: "لا يوجد حساب ولاء" });

    const [program] = await db.select().from(loyaltyPrograms).where(eq(loyaltyPrograms.id, programId));
    if (!program) return c.json({ canRedeem: false, error: "البرنامج غير موجود" });

    const availablePoints = account.currentPoints || 0;
    const pointValue = parseFloat(program.pointValue || "100");
    const minRedeem = program.minRedeemPoints || 100;
    const maxPercentage = program.maxRedeemPercentage || 50;

    if (availablePoints < minRedeem) {
      return c.json({ canRedeem: false, error: `الحد الأدنى ${minRedeem} نقطة` });
    }

    const requestedValue = points * pointValue;
    const maxRedeemValue = orderAmount ? parseFloat(orderAmount) * (maxPercentage / 100) : requestedValue;
    const actualValue = Math.min(requestedValue, maxRedeemValue);
    const actualPoints = Math.floor(actualValue / pointValue);

    return c.json({
      canRedeem: true,
      availablePoints,
      requestedPoints: points,
      actualPoints: Math.min(actualPoints, availablePoints),
      redeemValue: actualPoints * pointValue,
      maxRedeemValue,
    });
  } catch (error) {
    console.error("Calculate redeem error:", error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

// ========== المكافآت ==========

app.get("/rewards/:programId", async (c) => {
  try {
    const { programId } = c.req.param();
    const now = new Date();

    const rewards = await db.select().from(loyaltyRewards)
      .where(and(
        eq(loyaltyRewards.programId, programId),
        eq(loyaltyRewards.isActive, true),
        or(lte(loyaltyRewards.startDate, now), sql`${loyaltyRewards.startDate} IS NULL`),
        or(gte(loyaltyRewards.endDate, now), sql`${loyaltyRewards.endDate} IS NULL`)
      ))
      .orderBy(loyaltyRewards.pointsCost);

    return c.json(rewards);
  } catch (error) {
    console.error("Get rewards error:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.post("/rewards", async (c) => {
  try {
    const body = await c.req.json();
    const id = `lr_${nanoid(12)}`;

    await db.insert(loyaltyRewards).values({
      id,
      programId: body.programId,
      name: body.name,
      description: body.description || null,
      rewardType: body.rewardType,
      pointsCost: body.pointsCost,
      discountValue: body.discountValue || null,
      discountType: body.discountType || null,
      productId: body.productId || null,
      voucherValue: body.voucherValue || null,
      stockLimit: body.stockLimit || null,
      perCustomerLimit: body.perCustomerLimit || null,
      minTierId: body.minTierId || null,
      minOrderAmount: body.minOrderAmount || null,
      startDate: body.startDate ? new Date(body.startDate) : null,
      endDate: body.endDate ? new Date(body.endDate) : null,
      isActive: true,
      image: body.image || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return c.json({ id }, 201);
  } catch (error) {
    console.error("Create reward error:", error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

/**
 * استرداد مكافأة
 */
app.post("/rewards/:rewardId/redeem", async (c) => {
  try {
    const { rewardId } = c.req.param();
    const { customerId, accountId } = await c.req.json();

    const [reward] = await db.select().from(loyaltyRewards).where(eq(loyaltyRewards.id, rewardId));
    if (!reward) return c.json({ error: "المكافأة غير موجودة" }, 404);

    const [account] = await db.select().from(customerLoyaltyAccounts).where(eq(customerLoyaltyAccounts.id, accountId));
    if (!account) return c.json({ error: "الحساب غير موجود" }, 404);

    if ((account.currentPoints || 0) < reward.pointsCost) {
      return c.json({ error: "رصيد النقاط غير كافٍ" }, 400);
    }

    // التحقق من الحد
    if (reward.stockLimit && reward.redeemedCount >= reward.stockLimit) {
      return c.json({ error: "نفذت الكمية المتاحة" }, 400);
    }

    const newBalance = (account.currentPoints || 0) - reward.pointsCost;

    // تحديث الحساب
    await db.update(customerLoyaltyAccounts).set({
      currentPoints: newBalance,
      totalRedeemedPoints: (account.totalRedeemedPoints || 0) + reward.pointsCost,
      lastRedeemedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(customerLoyaltyAccounts.id, accountId));

    // تحديث عداد المكافأة
    await db.update(loyaltyRewards).set({
      redeemedCount: (reward.redeemedCount || 0) + 1,
    }).where(eq(loyaltyRewards.id, rewardId));

    // تسجيل الاسترداد
    const redemptionCode = `RWD-${nanoid(8).toUpperCase()}`;
    await db.insert(rewardRedemptions).values({
      id: `rr_${nanoid(12)}`,
      rewardId,
      customerId,
      accountId,
      pointsUsed: reward.pointsCost,
      status: "pending",
      redemptionCode,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 يوم
      createdAt: new Date(),
    });

    // تسجيل المعاملة
    await db.insert(loyaltyTransactions).values({
      id: `lt_${nanoid(12)}`,
      accountId,
      customerId,
      transactionType: "redeem",
      points: -reward.pointsCost,
      balanceAfter: newBalance,
      sourceType: "reward",
      sourceId: rewardId,
      description: `استرداد مكافأة: ${reward.name}`,
      createdAt: new Date(),
    });

    return c.json({ redemptionCode, newBalance });
  } catch (error) {
    console.error("Redeem reward error:", error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

// ========== الإحصائيات ==========

app.get("/stats/:programId", async (c) => {
  try {
    const { programId } = c.req.param();

    const [totalMembers] = await db.select({ count: count() }).from(customerLoyaltyAccounts)
      .where(eq(customerLoyaltyAccounts.programId, programId));

    const [totalPoints] = await db.select({
      current: sql<number>`SUM(${customerLoyaltyAccounts.currentPoints})`,
      earned: sql<number>`SUM(${customerLoyaltyAccounts.totalEarnedPoints})`,
      redeemed: sql<number>`SUM(${customerLoyaltyAccounts.totalRedeemedPoints})`,
    }).from(customerLoyaltyAccounts).where(eq(customerLoyaltyAccounts.programId, programId));

    // توزيع المستويات
    const tierDistribution = await db.select({
      tierId: customerLoyaltyAccounts.tierId,
      tierName: loyaltyTiers.name,
      count: count(),
    }).from(customerLoyaltyAccounts)
      .leftJoin(loyaltyTiers, eq(customerLoyaltyAccounts.tierId, loyaltyTiers.id))
      .where(eq(customerLoyaltyAccounts.programId, programId))
      .groupBy(customerLoyaltyAccounts.tierId, loyaltyTiers.name);

    return c.json({
      totalMembers: totalMembers?.count || 0,
      totalCurrentPoints: totalPoints?.current || 0,
      totalEarnedPoints: totalPoints?.earned || 0,
      totalRedeemedPoints: totalPoints?.redeemed || 0,
      tierDistribution,
    });
  } catch (error) {
    console.error("Get stats error:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

// ========== Helper Functions ==========

async function checkTierUpgrade(accountId: string, programId: string) {
  try {
    const [account] = await db.select().from(customerLoyaltyAccounts).where(eq(customerLoyaltyAccounts.id, accountId));
    if (!account) return;

    const tiers = await db.select().from(loyaltyTiers)
      .where(and(eq(loyaltyTiers.programId, programId), eq(loyaltyTiers.isActive, true)))
      .orderBy(desc(loyaltyTiers.minPoints));

    for (const tier of tiers) {
      if ((account.totalEarnedPoints || 0) >= tier.minPoints) {
        if (account.tierId !== tier.id) {
          await db.update(customerLoyaltyAccounts).set({
            tierId: tier.id,
            tierAchievedAt: new Date(),
          }).where(eq(customerLoyaltyAccounts.id, accountId));
        }
        break;
      }
    }
  } catch (error) {
    console.error("Tier upgrade check error:", error);
  }
}

export default app;

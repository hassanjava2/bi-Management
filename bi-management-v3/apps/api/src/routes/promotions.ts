/**
 * API Routes - نظام الخصومات والعروض الترويجية
 */
import { Hono } from "hono";
import {
  db, promotions, discountCodes, promotionUsages, productBundles, bundleItems,
  customerPricing, products, customers, categories
} from "@bi-management/database";
import { eq, and, or, desc, asc, count, sql, like, gte, lte, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";
import { authMiddleware } from "../lib/auth.js";

const app = new Hono();

// ========== العروض الترويجية ==========

/**
 * جلب جميع العروض
 */
app.get("/", async (c) => {
  try {
    const { status, type, active, page = "1", limit = "20" } = c.req.query();
    const conditions = [];

    if (status) conditions.push(inArray(promotions.status, status.split(",")));
    if (type) conditions.push(eq(promotions.type, type));
    if (active === "true") {
      const now = new Date();
      conditions.push(eq(promotions.status, "active"));
      conditions.push(lte(promotions.startDate, now));
      conditions.push(gte(promotions.endDate, now));
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    const promos = await db.select().from(promotions)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(promotions.priority), desc(promotions.createdAt))
      .limit(limitNum).offset((pageNum - 1) * limitNum);

    const [total] = await db.select({ count: count() }).from(promotions)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    return c.json({
      promotions: promos,
      pagination: { page: pageNum, limit: limitNum, total: total?.count || 0 },
    });
  } catch (error) {
    console.error("Promotions error:", error);
    return c.json({ error: "فشل في جلب العروض" }, 500);
  }
});

/**
 * إحصائيات العروض
 */
app.get("/stats", async (c) => {
  try {
    const now = new Date();
    
    const [activeCount] = await db.select({ count: count() }).from(promotions)
      .where(and(eq(promotions.status, "active"), lte(promotions.startDate, now), gte(promotions.endDate, now)));

    const [totalUsage] = await db.select({ count: count(), totalDiscount: sql<number>`SUM(CAST(${promotionUsages.discountAmount} AS DECIMAL))` })
      .from(promotionUsages);

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [monthlyUsage] = await db.select({ count: count(), totalDiscount: sql<number>`SUM(CAST(${promotionUsages.discountAmount} AS DECIMAL))` })
      .from(promotionUsages).where(gte(promotionUsages.createdAt, startOfMonth));

    const [codesCount] = await db.select({ count: count() }).from(discountCodes).where(eq(discountCodes.isActive, true));

    return c.json({
      activePromotions: activeCount?.count || 0,
      activeCodes: codesCount?.count || 0,
      totalUsageCount: totalUsage?.count || 0,
      totalDiscountGiven: totalUsage?.totalDiscount || 0,
      monthlyUsageCount: monthlyUsage?.count || 0,
      monthlyDiscountGiven: monthlyUsage?.totalDiscount || 0,
    });
  } catch (error) {
    return c.json({ error: "فشل في جلب الإحصائيات" }, 500);
  }
});

/**
 * تفاصيل عرض
 */
app.get("/:id", async (c) => {
  try {
    const { id } = c.req.param();
    const [promo] = await db.select().from(promotions).where(eq(promotions.id, id));
    if (!promo) return c.json({ error: "العرض غير موجود" }, 404);

    const usageHistory = await db.select({
      usage: promotionUsages,
      customer: { fullName: customers.name },
    }).from(promotionUsages)
      .leftJoin(customers, eq(promotionUsages.customerId, customers.id))
      .where(eq(promotionUsages.promotionId, id))
      .orderBy(desc(promotionUsages.createdAt)).limit(50);

    return c.json({ ...promo, usageHistory: usageHistory.map(u => ({ ...u.usage, customer: u.customer })) });
  } catch (error) {
    return c.json({ error: "فشل في جلب العرض" }, 500);
  }
});

/**
 * إنشاء عرض
 */
app.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const id = `promo_${nanoid(12)}`;

    await db.insert(promotions).values({
      id,
      code: body.code || null,
      name: body.name,
      description: body.description || null,
      type: body.type,
      discountValue: body.discountValue || null,
      maxDiscountAmount: body.maxDiscountAmount || null,
      buyQuantity: body.buyQuantity || null,
      getQuantity: body.getQuantity || null,
      getFreeProduct: body.getFreeProduct || null,
      minimumOrderAmount: body.minimumOrderAmount || null,
      minimumQuantity: body.minimumQuantity || null,
      appliesTo: body.appliesTo || "all",
      applicableProducts: body.applicableProducts || null,
      applicableCategories: body.applicableCategories || null,
      applicableCustomers: body.applicableCustomers || null,
      excludedProducts: body.excludedProducts || null,
      applicableBranches: body.applicableBranches || null,
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
      usageLimit: body.usageLimit || null,
      usageLimitPerCustomer: body.usageLimitPerCustomer || null,
      status: body.status || "draft",
      isAutomatic: body.isAutomatic || false,
      priority: body.priority || 0,
      stackable: body.stackable || false,
      bannerImage: body.bannerImage || null,
      badgeText: body.badgeText || null,
      badgeColor: body.badgeColor || null,
      createdBy: body.createdBy || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return c.json({ id, message: "تم إنشاء العرض بنجاح" }, 201);
  } catch (error) {
    console.error("Create promotion error:", error);
    return c.json({ error: "فشل في إنشاء العرض" }, 500);
  }
});

/**
 * تحديث عرض
 */
app.patch("/:id", async (c) => {
  try {
    const { id } = c.req.param();
    const body = await c.req.json();

    const [existing] = await db.select().from(promotions).where(eq(promotions.id, id));
    if (!existing) return c.json({ error: "العرض غير موجود" }, 404);

    const updates: any = { updatedAt: new Date() };
    const fields = ["name", "description", "type", "discountValue", "maxDiscountAmount", "minimumOrderAmount",
      "minimumQuantity", "appliesTo", "applicableProducts", "applicableCategories", "startDate", "endDate",
      "usageLimit", "usageLimitPerCustomer", "status", "isAutomatic", "priority", "stackable", "bannerImage", "badgeText", "badgeColor"];
    
    fields.forEach(f => { if (body[f] !== undefined) updates[f] = body[f]; });
    if (body.startDate) updates.startDate = new Date(body.startDate);
    if (body.endDate) updates.endDate = new Date(body.endDate);

    await db.update(promotions).set(updates).where(eq(promotions.id, id));
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: "فشل في تحديث العرض" }, 500);
  }
});

/**
 * حذف عرض
 */
app.delete("/:id", async (c) => {
  try {
    const { id } = c.req.param();
    await db.delete(promotions).where(eq(promotions.id, id));
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: "فشل في حذف العرض" }, 500);
  }
});

// ========== أكواد الخصم ==========

app.get("/codes/list", async (c) => {
  try {
    const { active, promotionId } = c.req.query();
    const conditions = [];
    if (active === "true") conditions.push(eq(discountCodes.isActive, true));
    if (promotionId) conditions.push(eq(discountCodes.promotionId, promotionId));

    const codes = await db.select().from(discountCodes)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(discountCodes.createdAt));

    return c.json(codes);
  } catch (error) {
    return c.json({ error: "فشل في جلب الأكواد" }, 500);
  }
});

app.post("/codes", async (c) => {
  try {
    const body = await c.req.json();
    const id = `code_${nanoid(12)}`;

    // التحقق من عدم تكرار الكود
    const [existing] = await db.select().from(discountCodes).where(eq(discountCodes.code, body.code.toUpperCase()));
    if (existing) return c.json({ error: "الكود موجود مسبقاً" }, 400);

    await db.insert(discountCodes).values({
      id,
      code: body.code.toUpperCase(),
      promotionId: body.promotionId || null,
      codeType: body.codeType || "single",
      discountType: body.discountType || null,
      discountValue: body.discountValue || null,
      maxDiscountAmount: body.maxDiscountAmount || null,
      minimumOrderAmount: body.minimumOrderAmount || null,
      startDate: body.startDate ? new Date(body.startDate) : null,
      endDate: body.endDate ? new Date(body.endDate) : null,
      usageLimit: body.usageLimit || null,
      usageLimitPerCustomer: body.usageLimitPerCustomer || 1,
      isActive: body.isActive ?? true,
      customerId: body.customerId || null,
      createdBy: body.createdBy || null,
      createdAt: new Date(),
    });

    return c.json({ id, code: body.code.toUpperCase() }, 201);
  } catch (error) {
    console.error("Create code error:", error);
    return c.json({ error: "فشل في إنشاء الكود" }, 500);
  }
});

/**
 * التحقق من كود خصم
 */
app.post("/codes/validate", async (c) => {
  try {
    const { code, orderAmount, customerId, productIds } = await c.req.json();

    const [discountCode] = await db.select().from(discountCodes)
      .where(and(eq(discountCodes.code, code.toUpperCase()), eq(discountCodes.isActive, true)));

    if (!discountCode) return c.json({ valid: false, error: "كود غير صالح" });

    const now = new Date();

    // التحقق من التاريخ
    if (discountCode.startDate && new Date(discountCode.startDate) > now) {
      return c.json({ valid: false, error: "الكود لم يبدأ بعد" });
    }
    if (discountCode.endDate && new Date(discountCode.endDate) < now) {
      return c.json({ valid: false, error: "الكود منتهي الصلاحية" });
    }

    // التحقق من الاستخدام
    if (discountCode.usageLimit && discountCode.currentUsageCount >= discountCode.usageLimit) {
      return c.json({ valid: false, error: "تم استنفاد الكود" });
    }

    // التحقق من استخدام العميل
    if (customerId && discountCode.usageLimitPerCustomer) {
      const [customerUsage] = await db.select({ count: count() }).from(promotionUsages)
        .where(and(eq(promotionUsages.discountCodeId, discountCode.id), eq(promotionUsages.customerId, customerId)));
      
      if (customerUsage && customerUsage.count >= discountCode.usageLimitPerCustomer) {
        return c.json({ valid: false, error: "لقد استخدمت هذا الكود من قبل" });
      }
    }

    // التحقق من الحد الأدنى
    if (discountCode.minimumOrderAmount && orderAmount < parseFloat(discountCode.minimumOrderAmount)) {
      return c.json({ valid: false, error: `الحد الأدنى للطلب ${discountCode.minimumOrderAmount}` });
    }

    // حساب الخصم
    let discount = 0;
    if (discountCode.discountType === "percentage") {
      discount = orderAmount * (parseFloat(discountCode.discountValue || "0") / 100);
      if (discountCode.maxDiscountAmount) {
        discount = Math.min(discount, parseFloat(discountCode.maxDiscountAmount));
      }
    } else if (discountCode.discountType === "fixed_amount") {
      discount = parseFloat(discountCode.discountValue || "0");
    }

    return c.json({
      valid: true,
      discount,
      discountType: discountCode.discountType,
      discountValue: discountCode.discountValue,
      codeId: discountCode.id,
    });
  } catch (error) {
    console.error("Validate code error:", error);
    return c.json({ error: "فشل في التحقق" }, 500);
  }
});

/**
 * تطبيق كود خصم
 */
app.post("/codes/apply", async (c) => {
  try {
    const { codeId, invoiceId, invoiceNumber, customerId, discountAmount, orderAmount, branchId, appliedBy } = await c.req.json();

    const [discountCode] = await db.select().from(discountCodes).where(eq(discountCodes.id, codeId));
    if (!discountCode) return c.json({ error: "الكود غير موجود" }, 404);

    // تسجيل الاستخدام
    await db.insert(promotionUsages).values({
      id: `pu_${nanoid(12)}`,
      promotionId: discountCode.promotionId,
      discountCodeId: codeId,
      invoiceId, invoiceNumber, customerId,
      discountAmount: String(discountAmount),
      orderAmount: String(orderAmount),
      branchId, appliedBy, createdAt: new Date(),
    });

    // تحديث عداد الاستخدام
    await db.update(discountCodes).set({
      currentUsageCount: (discountCode.currentUsageCount || 0) + 1,
    }).where(eq(discountCodes.id, codeId));

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: "فشل في تطبيق الكود" }, 500);
  }
});

// ========== الباقات ==========

app.get("/bundles/list", async (c) => {
  try {
    const { active } = c.req.query();
    const conditions = [];
    if (active === "true") conditions.push(eq(productBundles.isActive, true));

    const bundles = await db.select().from(productBundles)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(productBundles.createdAt));

    // جلب عناصر كل باقة
    const bundlesWithItems = await Promise.all(bundles.map(async (bundle) => {
      const items = await db.select({
        item: bundleItems,
        product: { id: products.id, nameAr: products.nameAr, price: products.price },
      }).from(bundleItems)
        .leftJoin(products, eq(bundleItems.productId, products.id))
        .where(eq(bundleItems.bundleId, bundle.id))
        .orderBy(asc(bundleItems.sortOrder));

      return { ...bundle, items: items.map(i => ({ ...i.item, product: i.product })) };
    }));

    return c.json(bundlesWithItems);
  } catch (error) {
    return c.json({ error: "فشل في جلب الباقات" }, 500);
  }
});

app.post("/bundles", async (c) => {
  try {
    const body = await c.req.json();
    const id = `bundle_${nanoid(12)}`;

    // حساب السعر الأصلي
    let originalPrice = 0;
    if (body.items?.length > 0) {
      for (const item of body.items) {
        const [product] = await db.select({ price: products.price }).from(products).where(eq(products.id, item.productId));
        if (product?.price) originalPrice += parseFloat(product.price) * (item.quantity || 1);
      }
    }

    const bundlePrice = parseFloat(body.bundlePrice) || 0;
    const savingsAmount = originalPrice - bundlePrice;
    const savingsPercentage = originalPrice > 0 ? ((savingsAmount / originalPrice) * 100).toFixed(1) : "0";

    await db.insert(productBundles).values({
      id,
      name: body.name,
      description: body.description || null,
      originalPrice: String(originalPrice),
      bundlePrice: String(bundlePrice),
      savingsAmount: String(savingsAmount),
      savingsPercentage,
      startDate: body.startDate ? new Date(body.startDate) : null,
      endDate: body.endDate ? new Date(body.endDate) : null,
      isActive: body.isActive ?? true,
      stockLimit: body.stockLimit || null,
      image: body.image || null,
      createdBy: body.createdBy || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // إضافة العناصر
    if (body.items?.length > 0) {
      const itemsData = body.items.map((item: any, index: number) => ({
        id: `bi_${nanoid(12)}`,
        bundleId: id,
        productId: item.productId,
        quantity: item.quantity || 1,
        sortOrder: index,
      }));
      await db.insert(bundleItems).values(itemsData);
    }

    return c.json({ id }, 201);
  } catch (error) {
    console.error("Create bundle error:", error);
    return c.json({ error: "فشل في إنشاء الباقة" }, 500);
  }
});

// ========== العروض النشطة للمنتج ==========

app.get("/for-product/:productId", async (c) => {
  try {
    const { productId } = c.req.param();
    const now = new Date();

    const activePromos = await db.select().from(promotions)
      .where(and(
        eq(promotions.status, "active"),
        lte(promotions.startDate, now),
        gte(promotions.endDate, now),
        or(
          eq(promotions.appliesTo, "all"),
          sql`${promotions.applicableProducts}::jsonb ? ${productId}`
        )
      ))
      .orderBy(desc(promotions.priority));

    return c.json(activePromos);
  } catch (error) {
    return c.json({ error: "فشل في جلب العروض" }, 500);
  }
});

export default app;

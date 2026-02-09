/**
 * العروض والباقات - Bundles & Offers API
 * ─────────────────────────────────────────
 * لابتوب + شنطة + ماوس = خصم، عروض موسمية
 */
import { Hono } from "hono";
import { db, products, promotions } from "@bi-management/database";
import { eq, desc, sql, and, gte, lte } from "drizzle-orm";
import { nanoid } from "nanoid";

const app = new Hono();

// In-memory bundles store (supplement DB promotions)
interface Bundle {
  id: string;
  name: string;
  description: string;
  items: Array<{ productId: string; productName: string; originalPrice: number }>;
  bundlePrice: number;
  totalOriginalPrice: number;
  discountAmount: number;
  discountPercent: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  maxUses: number | null;
  usedCount: number;
  createdAt: string;
}

const bundles: Bundle[] = [];

// ─── قائمة الباقات ───

app.get("/", async (c) => {
  try {
    const activeOnly = c.req.query("active") === "true";
    const now = new Date().toISOString();

    let result = [...bundles];
    if (activeOnly) {
      result = result.filter((b) => b.isActive && (!b.endDate || b.endDate >= now));
    }

    return c.json({ success: true, data: result });
  } catch (error) {
    console.error("Bundles list error:", error);
    return c.json({ error: "فشل في جلب الباقات" }, 500);
  }
});

// ─── باقة بالتفصيل ───

app.get("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const bundle = bundles.find((b) => b.id === id);
    if (!bundle) return c.json({ error: "الباقة غير موجودة" }, 404);
    return c.json({ success: true, data: bundle });
  } catch (error) {
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

// ─── إنشاء باقة ───

app.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const { name, description, items, bundlePrice, startDate, endDate, maxUses } = body;

    if (!name || !items || !Array.isArray(items) || items.length < 2) {
      return c.json({ error: "الاسم والعناصر مطلوبة (حد أدنى عنصرين)" }, 400);
    }

    // جلب بيانات المنتجات
    const bundleItems = [];
    let totalOriginal = 0;

    for (const item of items) {
      const [product] = await db.select().from(products).where(eq(products.id, item.productId));
      if (product) {
        const price = Number(product.sellingPrice) || 0;
        bundleItems.push({
          productId: product.id,
          productName: product.nameAr || product.name || product.model || "منتج",
          originalPrice: price,
        });
        totalOriginal += price;
      }
    }

    const finalPrice = bundlePrice || Math.round(totalOriginal * 0.9); // خصم 10% افتراضي
    const discountAmount = totalOriginal - finalPrice;
    const discountPercent = totalOriginal > 0 ? Math.round((discountAmount / totalOriginal) * 100) : 0;

    const bundle: Bundle = {
      id: `bnd_${nanoid(12)}`,
      name,
      description: description || "",
      items: bundleItems,
      bundlePrice: finalPrice,
      totalOriginalPrice: totalOriginal,
      discountAmount,
      discountPercent,
      startDate: startDate || new Date().toISOString(),
      endDate: endDate || "",
      isActive: true,
      maxUses: maxUses || null,
      usedCount: 0,
      createdAt: new Date().toISOString(),
    };

    bundles.push(bundle);

    return c.json({ success: true, data: bundle, message: "تم إنشاء الباقة بنجاح" }, 201);
  } catch (error) {
    console.error("Create bundle error:", error);
    return c.json({ error: "فشل في إنشاء الباقة" }, 500);
  }
});

// ─── تحديث باقة ───

app.put("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();
    const bundle = bundles.find((b) => b.id === id);
    if (!bundle) return c.json({ error: "الباقة غير موجودة" }, 404);

    if (body.name) bundle.name = body.name;
    if (body.description !== undefined) bundle.description = body.description;
    if (body.bundlePrice) {
      bundle.bundlePrice = body.bundlePrice;
      bundle.discountAmount = bundle.totalOriginalPrice - body.bundlePrice;
      bundle.discountPercent = Math.round((bundle.discountAmount / bundle.totalOriginalPrice) * 100);
    }
    if (body.startDate) bundle.startDate = body.startDate;
    if (body.endDate !== undefined) bundle.endDate = body.endDate;
    if (typeof body.isActive === "boolean") bundle.isActive = body.isActive;

    return c.json({ success: true, data: bundle });
  } catch (error) {
    return c.json({ error: "فشل في التحديث" }, 500);
  }
});

// ─── حذف باقة ───

app.delete("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const index = bundles.findIndex((b) => b.id === id);
    if (index === -1) return c.json({ error: "الباقة غير موجودة" }, 404);
    bundles.splice(index, 1);
    return c.json({ success: true, message: "تم حذف الباقة" });
  } catch (error) {
    return c.json({ error: "فشل في الحذف" }, 500);
  }
});

// ─── إحصائيات العروض ───

app.get("/stats/summary", async (c) => {
  try {
    const now = new Date().toISOString();
    const active = bundles.filter((b) => b.isActive && (!b.endDate || b.endDate >= now));
    const totalSaved = bundles.reduce((s, b) => s + b.discountAmount * b.usedCount, 0);

    return c.json({
      success: true,
      data: {
        totalBundles: bundles.length,
        activeBundles: active.length,
        totalUsed: bundles.reduce((s, b) => s + b.usedCount, 0),
        totalCustomerSavings: Math.round(totalSaved),
        avgDiscount: bundles.length > 0 ? Math.round(bundles.reduce((s, b) => s + b.discountPercent, 0) / bundles.length) : 0,
      },
    });
  } catch (error) {
    return c.json({ error: "فشل في جلب الإحصائيات" }, 500);
  }
});

export default app;

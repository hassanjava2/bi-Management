/**
 * API Routes - نظام الباركود و QR Code
 */
import { Hono } from "hono";
import { db, products, serialNumbers, categories } from "@bi-management/database";
import { eq, like, or, inArray } from "drizzle-orm";
import { authMiddleware } from "../lib/auth.js";

const app = new Hono();

/**
 * توليد بيانات الباركود لمنتج
 */
app.get("/product/:id", async (c) => {
  try {
    const { id } = c.req.param();
    
    const [product] = await db.select({
      id: products.id,
      nameAr: products.nameAr,
      name: products.name,
      sku: products.sku,
      barcode: products.barcode,
      price: products.price,
      categoryId: products.categoryId,
    })
    .from(products)
    .where(eq(products.id, id));
    
    if (!product) {
      return c.json({ error: "المنتج غير موجود" }, 404);
    }
    
    // جلب اسم الفئة
    let categoryName = "";
    if (product.categoryId) {
      const [cat] = await db.select({ nameAr: categories.nameAr })
        .from(categories)
        .where(eq(categories.id, product.categoryId));
      categoryName = cat?.nameAr || "";
    }
    
    return c.json({
      type: "product",
      data: {
        ...product,
        categoryName,
        barcodeValue: product.barcode || product.sku || product.id,
      }
    });
  } catch (error) {
    console.error("Product barcode error:", error);
    return c.json({ error: "فشل في جلب بيانات المنتج" }, 500);
  }
});

/**
 * توليد بيانات الباركود لسيريال
 */
app.get("/serial/:serialNumber", async (c) => {
  try {
    const { serialNumber } = c.req.param();
    
    const [serial] = await db.select({
      id: serialNumbers.id,
      serialNumber: serialNumbers.serialNumber,
      productId: serialNumbers.productId,
      status: serialNumbers.status,
      createdAt: serialNumbers.createdAt,
    })
    .from(serialNumbers)
    .where(eq(serialNumbers.serialNumber, serialNumber));
    
    if (!serial) {
      return c.json({ error: "السيريال غير موجود" }, 404);
    }
    
    // جلب معلومات المنتج
    let productInfo = null;
    if (serial.productId) {
      const [prod] = await db.select({
        nameAr: products.nameAr,
        sku: products.sku,
        price: products.price,
      })
      .from(products)
      .where(eq(products.id, serial.productId));
      productInfo = prod;
    }
    
    return c.json({
      type: "serial",
      data: {
        ...serial,
        productName: productInfo?.nameAr,
        productSku: productInfo?.sku,
        price: productInfo?.price,
        barcodeValue: serial.serialNumber,
        qrValue: JSON.stringify({
          type: "BI_SERIAL",
          sn: serial.serialNumber,
          product: productInfo?.nameAr,
          sku: productInfo?.sku,
        }),
      }
    });
  } catch (error) {
    console.error("Serial barcode error:", error);
    return c.json({ error: "فشل في جلب بيانات السيريال" }, 500);
  }
});

/**
 * البحث بالباركود أو السيريال
 */
app.get("/scan", async (c) => {
  try {
    const code = c.req.query("code");
    
    if (!code) {
      return c.json({ error: "الكود مطلوب" }, 400);
    }
    
    // البحث في السيريالات أولاً
    const [serial] = await db.select({
      id: serialNumbers.id,
      serialNumber: serialNumbers.serialNumber,
      productId: serialNumbers.productId,
      status: serialNumbers.status,
      warehouseId: serialNumbers.warehouseId,
    })
    .from(serialNumbers)
    .where(eq(serialNumbers.serialNumber, code));
    
    if (serial) {
      // جلب معلومات المنتج
      let productInfo = null;
      if (serial.productId) {
        const [prod] = await db.select().from(products).where(eq(products.id, serial.productId));
        productInfo = prod;
      }
      
      return c.json({
        found: true,
        type: "serial",
        data: {
          serial,
          product: productInfo,
        }
      });
    }
    
    // البحث في المنتجات (بالباركود أو SKU)
    const [product] = await db.select()
      .from(products)
      .where(or(
        eq(products.barcode, code),
        eq(products.sku, code)
      ));
    
    if (product) {
      return c.json({
        found: true,
        type: "product",
        data: { product }
      });
    }
    
    return c.json({
      found: false,
      message: "لم يتم العثور على نتائج",
    });
  } catch (error) {
    console.error("Scan error:", error);
    return c.json({ error: "فشل في البحث" }, 500);
  }
});

/**
 * توليد بيانات طباعة متعددة
 */
app.post("/batch", async (c) => {
  try {
    const body = await c.req.json();
    const { type, ids, copies = 1 } = body;
    
    if (!type || !ids || !Array.isArray(ids) || ids.length === 0) {
      return c.json({ error: "بيانات غير صحيحة" }, 400);
    }
    
    const items: any[] = [];
    
    if (type === "products") {
      const productsList = await db.select({
        id: products.id,
        nameAr: products.nameAr,
        sku: products.sku,
        barcode: products.barcode,
        price: products.price,
      })
      .from(products)
      .where(inArray(products.id, ids));
      
      for (const prod of productsList) {
        for (let i = 0; i < copies; i++) {
          items.push({
            type: "product",
            id: prod.id,
            name: prod.nameAr,
            sku: prod.sku,
            barcode: prod.barcode || prod.sku || prod.id,
            price: prod.price,
          });
        }
      }
    } else if (type === "serials") {
      const serialsList = await db.select({
        id: serialNumbers.id,
        serialNumber: serialNumbers.serialNumber,
        productId: serialNumbers.productId,
      })
      .from(serialNumbers)
      .where(inArray(serialNumbers.id, ids));
      
      // جلب معلومات المنتجات
      const productIds = [...new Set(serialsList.map(s => s.productId).filter(Boolean))];
      const productsMap: Record<string, any> = {};
      
      if (productIds.length > 0) {
        const prods = await db.select({
          id: products.id,
          nameAr: products.nameAr,
          sku: products.sku,
        })
        .from(products)
        .where(inArray(products.id, productIds as string[]));
        
        prods.forEach(p => { productsMap[p.id] = p; });
      }
      
      for (const serial of serialsList) {
        const prod = serial.productId ? productsMap[serial.productId] : null;
        for (let i = 0; i < copies; i++) {
          items.push({
            type: "serial",
            id: serial.id,
            serialNumber: serial.serialNumber,
            productName: prod?.nameAr,
            sku: prod?.sku,
            barcode: serial.serialNumber,
            qrData: JSON.stringify({
              type: "BI_SERIAL",
              sn: serial.serialNumber,
              product: prod?.nameAr,
            }),
          });
        }
      }
    }
    
    return c.json({
      success: true,
      count: items.length,
      items,
    });
  } catch (error) {
    console.error("Batch barcode error:", error);
    return c.json({ error: "فشل في توليد الباركود" }, 500);
  }
});

/**
 * قائمة المنتجات للطباعة
 */
app.get("/products", async (c) => {
  try {
    const search = c.req.query("search") || "";
    const categoryId = c.req.query("categoryId");
    
    let query = db.select({
      id: products.id,
      nameAr: products.nameAr,
      sku: products.sku,
      barcode: products.barcode,
      price: products.price,
      categoryId: products.categoryId,
    }).from(products);
    
    const conditions = [];
    if (search) {
      conditions.push(or(
        like(products.nameAr, `%${search}%`),
        like(products.sku, `%${search}%`),
        like(products.barcode, `%${search}%`)
      ));
    }
    if (categoryId) {
      conditions.push(eq(products.categoryId, categoryId));
    }
    
    if (conditions.length > 0) {
      query = query.where(conditions.length === 1 ? conditions[0] : or(...conditions)) as any;
    }
    
    const result = await query.limit(100);
    
    return c.json(result);
  } catch (error) {
    console.error("Products list error:", error);
    return c.json({ error: "فشل في جلب المنتجات" }, 500);
  }
});

/**
 * قائمة السيريالات للطباعة
 */
app.get("/serials", async (c) => {
  try {
    const search = c.req.query("search") || "";
    const productId = c.req.query("productId");
    const status = c.req.query("status");
    
    let query = db.select({
      id: serialNumbers.id,
      serialNumber: serialNumbers.serialNumber,
      productId: serialNumbers.productId,
      status: serialNumbers.status,
    }).from(serialNumbers);
    
    const conditions = [];
    if (search) {
      conditions.push(like(serialNumbers.serialNumber, `%${search}%`));
    }
    if (productId) {
      conditions.push(eq(serialNumbers.productId, productId));
    }
    if (status) {
      conditions.push(eq(serialNumbers.status, status));
    }
    
    if (conditions.length > 0) {
      query = query.where(conditions.length === 1 ? conditions[0] : or(...conditions)) as any;
    }
    
    const result = await query.limit(100);
    
    // جلب أسماء المنتجات
    const productIds = [...new Set(result.map(s => s.productId).filter(Boolean))];
    const productsMap: Record<string, string> = {};
    
    if (productIds.length > 0) {
      const prods = await db.select({ id: products.id, nameAr: products.nameAr })
        .from(products)
        .where(inArray(products.id, productIds as string[]));
      prods.forEach(p => { productsMap[p.id] = p.nameAr || ""; });
    }
    
    const enriched = result.map(s => ({
      ...s,
      productName: s.productId ? productsMap[s.productId] : null,
    }));
    
    return c.json(enriched);
  } catch (error) {
    console.error("Serials list error:", error);
    return c.json({ error: "فشل في جلب السيريالات" }, 500);
  }
});

/**
 * إعدادات الطباعة
 */
app.get("/print-settings", async (c) => {
  // إعدادات افتراضية لأحجام الملصقات
  const presets = [
    {
      id: "small",
      name: "صغير",
      width: 40,
      height: 25,
      unit: "mm",
      description: "ملصق صغير 40x25mm",
    },
    {
      id: "medium",
      name: "متوسط",
      width: 60,
      height: 40,
      unit: "mm",
      description: "ملصق متوسط 60x40mm",
    },
    {
      id: "large",
      name: "كبير",
      width: 100,
      height: 60,
      unit: "mm",
      description: "ملصق كبير 100x60mm",
    },
    {
      id: "shelf",
      name: "رف المنتج",
      width: 80,
      height: 30,
      unit: "mm",
      description: "ملصق رف 80x30mm",
    },
  ];
  
  return c.json({
    presets,
    barcodeFormats: ["CODE128", "EAN13", "EAN8", "UPC", "CODE39"],
    defaultFormat: "CODE128",
  });
});

export default app;

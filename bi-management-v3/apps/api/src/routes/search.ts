/**
 * API Routes - نظام البحث الشامل
 */
import { Hono } from "hono";
import { 
  db, products, serialNumbers, customers, suppliers, 
  users, invoices, purchaseBatches, maintenanceOrders,
  categories, warehouses
} from "@bi-management/database";
import { like, or, eq, desc, sql } from "drizzle-orm";
import { authMiddleware } from "../lib/auth.js";

const app = new Hono();

interface SearchResult {
  type: string;
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  url: string;
  icon: string;
  metadata?: Record<string, any>;
}

/**
 * البحث الشامل
 */
app.get("/", async (c) => {
  try {
    const query = c.req.query("q")?.trim();
    const type = c.req.query("type"); // filter by type
    const limit = parseInt(c.req.query("limit") || "20");

    if (!query || query.length < 2) {
      return c.json({ results: [], total: 0 });
    }

    const searchPattern = `%${query}%`;
    const results: SearchResult[] = [];

    // البحث في المنتجات
    if (!type || type === "products") {
      const productResults = await db
        .select({
          id: products.id,
          nameAr: products.nameAr,
          name: products.name,
          sku: products.sku,
          barcode: products.barcode,
          price: products.price,
        })
        .from(products)
        .where(
          or(
            like(products.nameAr, searchPattern),
            like(products.name, searchPattern),
            like(products.sku, searchPattern),
            like(products.barcode, searchPattern)
          )
        )
        .limit(limit);

      productResults.forEach((p) => {
        results.push({
          type: "product",
          id: p.id,
          title: p.nameAr || p.name || "",
          subtitle: `SKU: ${p.sku || "-"}`,
          description: p.barcode ? `باركود: ${p.barcode}` : undefined,
          url: `/products/${p.id}`,
          icon: "📦",
          metadata: { price: p.price },
        });
      });
    }

    // البحث في السيريالات
    if (!type || type === "serials") {
      const serialResults = await db
        .select({
          id: serialNumbers.id,
          serialNumber: serialNumbers.serialNumber,
          productId: serialNumbers.productId,
          status: serialNumbers.status,
        })
        .from(serialNumbers)
        .where(like(serialNumbers.serialNumber, searchPattern))
        .limit(limit);

      // جلب أسماء المنتجات
      const productIds = [...new Set(serialResults.map((s) => s.productId).filter(Boolean))];
      const productsMap: Record<string, string> = {};
      if (productIds.length > 0) {
        const prods = await db
          .select({ id: products.id, nameAr: products.nameAr })
          .from(products)
          .where(sql`${products.id} IN ${productIds}`);
        prods.forEach((p) => { productsMap[p.id] = p.nameAr || ""; });
      }

      serialResults.forEach((s) => {
        results.push({
          type: "serial",
          id: s.id,
          title: s.serialNumber,
          subtitle: s.productId ? productsMap[s.productId] : "منتج غير محدد",
          description: `الحالة: ${s.status}`,
          url: `/devices/${s.serialNumber}`,
          icon: "🔢",
          metadata: { status: s.status },
        });
      });
    }

    // البحث في العملاء
    if (!type || type === "customers") {
      const customerResults = await db
        .select({
          id: customers.id,
          fullName: customers.name,
          phone: customers.phone,
          email: customers.email,
        })
        .from(customers)
        .where(
          or(
            like(customers.name, searchPattern),
            like(customers.phone, searchPattern),
            like(customers.email, searchPattern)
          )
        )
        .limit(limit);

      customerResults.forEach((c) => {
        results.push({
          type: "customer",
          id: c.id,
          title: c.fullName || "",
          subtitle: c.phone || c.email || "",
          url: `/customers/${c.id}`,
          icon: "👤",
        });
      });
    }

    // البحث في الموردين
    if (!type || type === "suppliers") {
      const supplierResults = await db
        .select({
          id: suppliers.id,
          companyName: suppliers.name,
          contactPerson: suppliers.contactPerson,
          phone: suppliers.phone,
        })
        .from(suppliers)
        .where(
          or(
            like(suppliers.name, searchPattern),
            like(suppliers.contactPerson, searchPattern),
            like(suppliers.phone, searchPattern)
          )
        )
        .limit(limit);

      supplierResults.forEach((s) => {
        results.push({
          type: "supplier",
          id: s.id,
          title: s.name || "",
          subtitle: s.contactPerson || s.phone || "",
          url: `/suppliers/${s.id}`,
          icon: "🏭",
        });
      });
    }

    // البحث في الفواتير
    if (!type || type === "invoices") {
      const invoiceResults = await db
        .select({
          id: invoices.id,
          invoiceNumber: invoices.invoiceNumber,
          customerId: invoices.customerId,
          total: invoices.total,
          status: invoices.status,
          createdAt: invoices.createdAt,
        })
        .from(invoices)
        .where(like(invoices.invoiceNumber, searchPattern))
        .limit(limit);

      invoiceResults.forEach((inv) => {
        results.push({
          type: "invoice",
          id: inv.id,
          title: `فاتورة ${inv.invoiceNumber}`,
          subtitle: inv.total ? `${Number(inv.total).toLocaleString()} IQD` : "",
          description: inv.status || "",
          url: `/invoices/${inv.id}`,
          icon: "🧾",
          metadata: { status: inv.status, date: inv.createdAt },
        });
      });
    }

    // البحث في طلبات الشراء
    if (!type || type === "purchases") {
      const purchaseResults = await db
        .select({
          id: purchaseBatches.id,
          batchNumber: purchaseBatches.batchNumber,
          supplierId: purchaseBatches.supplierId,
          totalCost: purchaseBatches.totalCost,
          status: purchaseBatches.status,
        })
        .from(purchaseBatches)
        .where(like(purchaseBatches.batchNumber, searchPattern))
        .limit(limit);

      purchaseResults.forEach((p) => {
        results.push({
          type: "purchase",
          id: p.id,
          title: `وجبة شراء ${p.batchNumber}`,
          subtitle: p.totalCost ? `${Number(p.totalCost).toLocaleString()} IQD` : "",
          description: p.status || "",
          url: `/purchases`,
          icon: "🛒",
          metadata: { status: p.status },
        });
      });
    }

    // البحث في أوامر الصيانة
    if (!type || type === "maintenance") {
      const maintenanceResults = await db
        .select({
          id: maintenanceOrders.id,
          orderNumber: maintenanceOrders.orderNumber,
          customerId: maintenanceOrders.customerId,
          customerName: customers.name,
          type: maintenanceOrders.type,
          status: maintenanceOrders.status,
        })
        .from(maintenanceOrders)
        .leftJoin(customers, eq(customers.id, maintenanceOrders.customerId))
        .where(
          or(
            like(maintenanceOrders.orderNumber, searchPattern),
            like(customers.name, searchPattern),
            like(customers.phone, searchPattern)
          )
        )
        .limit(limit);

      maintenanceResults.forEach((m) => {
        results.push({
          type: "maintenance",
          id: m.id,
          title: `صيانة ${m.orderNumber}`,
          subtitle: m.customerName || "",
          description: m.type || "",
          url: `/maintenance/${m.id}`,
          icon: "🔧",
          metadata: { status: m.status },
        });
      });
    }

    // البحث في المستخدمين
    if (!type || type === "users") {
      const userResults = await db
        .select({
          id: users.id,
          fullName: users.fullName,
          email: users.email,
          phone: users.phone,
          role: users.role,
        })
        .from(users)
        .where(
          or(
            like(users.fullName, searchPattern),
            like(users.email, searchPattern),
            like(users.phone, searchPattern)
          )
        )
        .limit(limit);

      userResults.forEach((u) => {
        results.push({
          type: "user",
          id: u.id,
          title: u.fullName || "",
          subtitle: u.email || u.phone || "",
          description: u.role || "",
          url: `/users/${u.id}/edit`,
          icon: "👥",
        });
      });
    }

    return c.json({
      results: results.slice(0, limit),
      total: results.length,
      query,
    });
  } catch (error) {
    console.error("Search error:", error);
    return c.json({ error: "فشل في البحث" }, 500);
  }
});

/**
 * البحث السريع (للـ autocomplete)
 */
app.get("/quick", async (c) => {
  try {
    const query = c.req.query("q")?.trim();

    if (!query || query.length < 2) {
      return c.json([]);
    }

    const searchPattern = `%${query}%`;
    const results: { type: string; label: string; value: string; url: string }[] = [];

    // منتجات
    const prods = await db
      .select({ id: products.id, nameAr: products.nameAr, sku: products.sku })
      .from(products)
      .where(or(like(products.nameAr, searchPattern), like(products.sku, searchPattern)))
      .limit(5);
    
    prods.forEach((p) => {
      results.push({
        type: "product",
        label: `📦 ${p.nameAr} (${p.sku || "-"})`,
        value: p.id,
        url: `/products/${p.id}`,
      });
    });

    // سيريالات
    const serials = await db
      .select({ serialNumber: serialNumbers.serialNumber })
      .from(serialNumbers)
      .where(like(serialNumbers.serialNumber, searchPattern))
      .limit(5);
    
    serials.forEach((s) => {
      results.push({
        type: "serial",
        label: `🔢 ${s.serialNumber}`,
        value: s.serialNumber,
        url: `/devices/${s.serialNumber}`,
      });
    });

    // عملاء
    const custs = await db
      .select({ id: customers.id, fullName: customers.name })
      .from(customers)
      .where(like(customers.name, searchPattern))
      .limit(3);
    
    custs.forEach((c) => {
      results.push({
        type: "customer",
        label: `👤 ${c.fullName}`,
        value: c.id,
        url: `/customers/${c.id}`,
      });
    });

    return c.json(results.slice(0, 10));
  } catch (error) {
    console.error("Quick search error:", error);
    return c.json([]);
  }
});

/**
 * أنواع البحث المتاحة
 */
app.get("/types", async (c) => {
  const types = [
    { id: "products", label: "المنتجات", icon: "📦" },
    { id: "serials", label: "السيريالات", icon: "🔢" },
    { id: "customers", label: "العملاء", icon: "👤" },
    { id: "suppliers", label: "الموردين", icon: "🏭" },
    { id: "invoices", label: "الفواتير", icon: "🧾" },
    { id: "purchases", label: "طلبات الشراء", icon: "🛒" },
    { id: "maintenance", label: "الصيانة", icon: "🔧" },
    { id: "users", label: "المستخدمين", icon: "👥" },
  ];

  return c.json(types);
});

/**
 * عمليات البحث الأخيرة
 */
app.get("/recent", async (c) => {
  // يمكن تخزين هذا في Redis أو في جدول
  // حالياً نرجع قائمة فارغة
  return c.json([]);
});

export default app;

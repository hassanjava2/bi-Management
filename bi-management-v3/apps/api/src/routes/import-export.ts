/**
 * API Routes - نظام الاستيراد والتصدير
 */
import { Hono } from "hono";
import { 
  db, products, categories, customers, suppliers, 
  users, warehouses, serialNumbers
} from "@bi-management/database";
import { eq, desc, count } from "drizzle-orm";
import { nanoid } from "nanoid";
import { authMiddleware } from "../lib/auth.js";

const app = new Hono();

// ==================== التصدير ====================

/**
 * أنواع التصدير المتاحة
 */
app.get("/export/types", async (c) => {
  const types = [
    { 
      id: "products", 
      label: "المنتجات", 
      icon: "📦",
      fields: ["id", "name", "nameAr", "sku", "barcode", "price", "costPrice", "categoryId", "description"]
    },
    { 
      id: "categories", 
      label: "التصنيفات", 
      icon: "📁",
      fields: ["id", "name", "nameAr", "parentId", "description"]
    },
    { 
      id: "customers", 
      label: "العملاء", 
      icon: "👤",
      fields: ["id", "fullName", "phone", "email", "address", "city", "notes"]
    },
    { 
      id: "suppliers", 
      label: "الموردين", 
      icon: "🏭",
      fields: ["id", "companyName", "contactPerson", "phone", "email", "address", "notes"]
    },
    { 
      id: "serials", 
      label: "السيريالات", 
      icon: "🔢",
      fields: ["id", "serialNumber", "productId", "warehouseId", "status", "purchaseDate", "notes"]
    },
    { 
      id: "warehouses", 
      label: "المخازن", 
      icon: "🏪",
      fields: ["id", "name", "address", "phone", "managerId"]
    },
  ];

  return c.json(types);
});

/**
 * تصدير البيانات
 */
app.post("/export", async (c) => {
  try {
    const body = await c.req.json();
    const { type, format = "csv", fields } = body;

    let data: any[] = [];
    let headers: string[] = [];

    switch (type) {
      case "products":
        data = await db.select().from(products).orderBy(products.nameAr);
        headers = fields || ["id", "nameAr", "nameEn", "sku", "barcode", "price", "costPrice", "description"];
        break;

      case "categories":
        data = await db.select().from(categories).orderBy(categories.nameAr);
        headers = fields || ["id", "name", "nameAr", "parentId", "description"];
        break;

      case "customers":
        data = await db.select().from(customers).orderBy(customers.name);
        headers = fields || ["id", "fullName", "phone", "email", "address", "city"];
        break;

      case "suppliers":
        data = await db.select().from(suppliers).orderBy(suppliers.name);
        headers = fields || ["id", "companyName", "contactPerson", "phone", "email", "address"];
        break;

      case "serials":
        data = await db.select().from(serialNumbers).orderBy(desc(serialNumbers.createdAt)).limit(10000);
        headers = fields || ["id", "serialNumber", "productId", "warehouseId", "status", "notes"];
        break;

      case "warehouses":
        data = await db.select().from(warehouses).orderBy(warehouses.name);
        headers = fields || ["id", "name", "address", "phone"];
        break;

      default:
        return c.json({ error: "نوع غير صحيح" }, 400);
    }

    if (format === "csv") {
      const csv = generateCSV(data, headers);
      const base64 = Buffer.from(csv, "utf-8").toString("base64");

      return c.json({
        success: true,
        data: base64,
        filename: `${type}_${new Date().toISOString().split("T")[0]}.csv`,
        mimeType: "text/csv",
        count: data.length,
      });
    } else if (format === "json") {
      return c.json({
        success: true,
        data: data.map((row) => {
          const filtered: any = {};
          headers.forEach((h) => { filtered[h] = row[h]; });
          return filtered;
        }),
        count: data.length,
      });
    }

    return c.json({ error: "صيغة غير مدعومة" }, 400);
  } catch (error) {
    console.error("Export error:", error);
    return c.json({ error: "فشل في تصدير البيانات" }, 500);
  }
});

/**
 * تحويل البيانات إلى CSV
 */
function generateCSV(data: any[], headers: string[]): string {
  const headerLabels: Record<string, string> = {
    id: "المعرف",
    nameAr: "الاسم عربي",
    name: "الاسم",
    sku: "SKU",
    barcode: "الباركود",
    price: "السعر",
    costPrice: "التكلفة",
    description: "الوصف",
    fullName: "الاسم الكامل",
    phone: "الهاتف",
    email: "البريد",
    address: "العنوان",
    city: "المدينة",
    notes: "ملاحظات",
    name: "اسم الشركة",
    contactPerson: "جهة الاتصال",
    serialNumber: "رقم السيريال",
    productId: "معرف المنتج",
    warehouseId: "معرف المخزن",
    status: "الحالة",
    parentId: "المعرف الأب",
    name: "الاسم",
    categoryId: "معرف التصنيف",
    purchaseDate: "تاريخ الشراء",
    managerId: "معرف المدير",
  };

  const csvHeaders = headers.map((h) => headerLabels[h] || h);
  
  const rows = data.map((row) =>
    headers.map((h) => {
      const val = row[h];
      if (val === null || val === undefined) return "";
      if (typeof val === "string" && (val.includes(",") || val.includes('"') || val.includes("\n"))) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return String(val);
    }).join(",")
  );

  return [csvHeaders.join(","), ...rows].join("\n");
}

/**
 * قالب الاستيراد
 */
app.get("/import/template/:type", async (c) => {
  const { type } = c.req.param();

  const templates: Record<string, { headers: string[]; sample: any[] }> = {
    products: {
      headers: ["name", "nameAr", "sku", "barcode", "price", "costPrice", "categoryId", "description"],
      sample: [
        { name: "Sample Product", nameAr: "منتج تجريبي", sku: "SKU001", barcode: "123456789", price: 100000, costPrice: 80000, categoryId: "", description: "وصف المنتج" }
      ]
    },
    categories: {
      headers: ["name", "nameAr", "parentId", "description"],
      sample: [
        { name: "New Category", nameAr: "تصنيف جديد", parentId: "", description: "وصف التصنيف" }
      ]
    },
    customers: {
      headers: ["fullName", "phone", "email", "address", "city", "notes"],
      sample: [
        { fullName: "عميل تجريبي", phone: "07701234567", email: "test@example.com", address: "العنوان", city: "بغداد", notes: "" }
      ]
    },
    suppliers: {
      headers: ["name", "contactPerson", "phone", "email", "address", "notes"],
      sample: [
        { name: "شركة تجريبية", contactPerson: "أحمد", phone: "07701234567", email: "supplier@example.com", address: "العنوان", notes: "" }
      ]
    },
  };

  const template = templates[type];
  if (!template) {
    return c.json({ error: "نوع غير صحيح" }, 400);
  }

  const csv = generateCSV(template.sample, template.headers);
  const base64 = Buffer.from(csv, "utf-8").toString("base64");

  return c.json({
    success: true,
    data: base64,
    filename: `template_${type}.csv`,
    headers: template.headers,
  });
});

// ==================== الاستيراد ====================

/**
 * استيراد البيانات
 */
app.post("/import", async (c) => {
  try {
    const body = await c.req.json();
    const { type, data, mode = "insert" } = body; // mode: insert, update, upsert

    if (!data || !Array.isArray(data) || data.length === 0) {
      return c.json({ error: "لا توجد بيانات للاستيراد" }, 400);
    }

    let imported = 0;
    let updated = 0;
    let errors: { row: number; error: string }[] = [];

    switch (type) {
      case "products":
        for (let i = 0; i < data.length; i++) {
          try {
            const row = data[i];
            if (!row.nameAr && !row.name) {
              errors.push({ row: i + 1, error: "الاسم مطلوب" });
              continue;
            }

            const id = `prod_${nanoid(12)}`;
            await db.insert(products).values({
              id,
              name: row.name || row.nameAr || "",
              nameAr: row.nameAr || null,
              sku: row.sku || null,
              barcode: row.barcode || null,
              price: row.price ? String(row.price) : null,
              costPrice: row.costPrice ? String(row.costPrice) : null,
              categoryId: row.categoryId || null,
              description: row.description || null,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
            imported++;
          } catch (err: any) {
            console.error("Import error (products):", err);
            errors.push({ row: i + 1, error: "فشل في استيراد البيانات" });
          }
        }
        break;

      case "categories":
        for (let i = 0; i < data.length; i++) {
          try {
            const row = data[i];
            if (!row.nameAr && !row.name) {
              errors.push({ row: i + 1, error: "الاسم مطلوب" });
              continue;
            }

            const id = `cat_${nanoid(12)}`;
            await db.insert(categories).values({
              id,
              name: row.name || row.nameAr || "",
              nameAr: row.nameAr || null,
              parentId: row.parentId || null,
              description: row.description || null,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
            imported++;
          } catch (err: any) {
            console.error("Import error (categories):", err);
            errors.push({ row: i + 1, error: "فشل في استيراد البيانات" });
          }
        }
        break;

      case "customers":
        for (let i = 0; i < data.length; i++) {
          try {
            const row = data[i];
            if (!row.fullName) {
              errors.push({ row: i + 1, error: "الاسم مطلوب" });
              continue;
            }

            const id = `cust_${nanoid(12)}`;
            await db.insert(customers).values({
              id,
              fullName: row.fullName,
              phone: row.phone || null,
              email: row.email || null,
              address: row.address || null,
              city: row.city || null,
              notes: row.notes || null,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
            imported++;
          } catch (err: any) {
            console.error("Import error (customers):", err);
            errors.push({ row: i + 1, error: "فشل في استيراد البيانات" });
          }
        }
        break;

      case "suppliers":
        for (let i = 0; i < data.length; i++) {
          try {
            const row = data[i];
            if (!row.name) {
              errors.push({ row: i + 1, error: "اسم الشركة مطلوب" });
              continue;
            }

            const id = `sup_${nanoid(12)}`;
            await db.insert(suppliers).values({
              id,
              name: row.name,
              contactPerson: row.contactPerson || null,
              phone: row.phone || null,
              email: row.email || null,
              address: row.address || null,
              notes: row.notes || null,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
            imported++;
          } catch (err: any) {
            console.error("Import error (suppliers):", err);
            errors.push({ row: i + 1, error: "فشل في استيراد البيانات" });
          }
        }
        break;

      default:
        return c.json({ error: "نوع غير مدعوم للاستيراد" }, 400);
    }

    return c.json({
      success: true,
      imported,
      updated,
      errors: errors.slice(0, 50), // أول 50 خطأ فقط
      totalErrors: errors.length,
    });
  } catch (error) {
    console.error("Import error:", error);
    return c.json({ error: "فشل في استيراد البيانات" }, 500);
  }
});

/**
 * تحليل ملف CSV
 */
app.post("/import/parse", async (c) => {
  try {
    const body = await c.req.json();
    const { content, delimiter = "," } = body;

    if (!content) {
      return c.json({ error: "المحتوى مطلوب" }, 400);
    }

    // فك base64 إذا لزم الأمر
    let csvContent = content;
    if (content.includes("base64,")) {
      csvContent = Buffer.from(content.split("base64,")[1], "base64").toString("utf-8");
    } else if (!content.includes(",") && !content.includes("\n")) {
      try {
        csvContent = Buffer.from(content, "base64").toString("utf-8");
      } catch {}
    }

    const lines = csvContent.split(/\r?\n/).filter((line: string) => line.trim());
    if (lines.length < 2) {
      return c.json({ error: "الملف فارغ أو لا يحتوي على بيانات" }, 400);
    }

    const headers = parseCSVLine(lines[0], delimiter);
    const data = lines.slice(1).map((line: string) => {
      const values = parseCSVLine(line, delimiter);
      const row: Record<string, any> = {};
      headers.forEach((h, i) => {
        row[h] = values[i] || "";
      });
      return row;
    });

    return c.json({
      success: true,
      headers,
      data,
      rowCount: data.length,
    });
  } catch (error) {
    console.error("Parse error:", error);
    return c.json({ error: "فشل في تحليل الملف" }, 500);
  }
});

/**
 * تحليل سطر CSV
 */
function parseCSVLine(line: string, delimiter: string = ","): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

/**
 * إحصائيات البيانات
 */
app.get("/stats", async (c) => {
  try {
    const [productsCount] = await db.select({ count: count() }).from(products);
    const [categoriesCount] = await db.select({ count: count() }).from(categories);
    const [customersCount] = await db.select({ count: count() }).from(customers);
    const [suppliersCount] = await db.select({ count: count() }).from(suppliers);
    const [serialsCount] = await db.select({ count: count() }).from(serialNumbers);
    const [warehousesCount] = await db.select({ count: count() }).from(warehouses);

    return c.json({
      products: productsCount?.count || 0,
      categories: categoriesCount?.count || 0,
      customers: customersCount?.count || 0,
      suppliers: suppliersCount?.count || 0,
      serials: serialsCount?.count || 0,
      warehouses: warehousesCount?.count || 0,
    });
  } catch (error) {
    console.error("Stats error:", error);
    return c.json({ error: "فشل في جلب الإحصائيات" }, 500);
  }
});

export default app;

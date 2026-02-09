/**
 * API Routes - نظام التقارير المتقدمة
 */
import { Hono } from "hono";
import { 
  db, reportTemplates, savedReports, reportExecutions,
  customDashboards, kpiDefinitions,
  // Data sources
  products, serialNumbers, purchaseBatches, purchaseBatchItems,
  users, invoices, maintenanceOrders,
  warehouses, categories, suppliers, customers
} from "@bi-management/database";
import { eq, desc, and, sql, count, sum, gte, lte, like, or, isNull, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";
import { authMiddleware } from "../lib/auth.js";

const app = new Hono();

// ==================== قوالب التقارير ====================

/**
 * قائمة قوالب التقارير
 */
app.get("/templates", async (c) => {
  try {
    const category = c.req.query("category");
    
    let query = db.select().from(reportTemplates).where(eq(reportTemplates.isActive, true));
    
    if (category) {
      query = query.where(eq(reportTemplates.category, category)) as any;
    }
    
    const templates = await query.orderBy(reportTemplates.category, reportTemplates.name);
    
    return c.json(templates);
  } catch (error) {
    console.error("Templates list error:", error);
    return c.json({ error: "فشل في جلب القوالب" }, 500);
  }
});

/**
 * تفاصيل قالب
 */
app.get("/templates/:id", async (c) => {
  try {
    const { id } = c.req.param();
    
    const [template] = await db.select().from(reportTemplates).where(eq(reportTemplates.id, id));
    
    if (!template) {
      return c.json({ error: "القالب غير موجود" }, 404);
    }
    
    return c.json(template);
  } catch (error) {
    console.error("Template detail error:", error);
    return c.json({ error: "فشل في جلب القالب" }, 500);
  }
});

/**
 * إنشاء قالب جديد
 */
app.post("/templates", async (c) => {
  try {
    const body = await c.req.json();
    
    const id = `rpt_tmpl_${nanoid(12)}`;
    await db.insert(reportTemplates).values({
      id,
      ...body,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    
    return c.json({ success: true, id });
  } catch (error) {
    console.error("Create template error:", error);
    return c.json({ error: "فشل في إنشاء القالب" }, 500);
  }
});

// ==================== تنفيذ التقارير ====================

/**
 * تنفيذ تقرير
 */
app.post("/execute", async (c) => {
  try {
    const currentUser = c.get("user");
    const body = await c.req.json();
    const { templateId, reportId, filters, columns, sort, groupBy, limit = 1000 } = body;
    
    const startTime = Date.now();
    
    // جلب القالب
    let template: any;
    if (reportId) {
      const [saved] = await db.select().from(savedReports).where(eq(savedReports.id, reportId));
      if (saved?.templateId) {
        [template] = await db.select().from(reportTemplates).where(eq(reportTemplates.id, saved.templateId));
      }
    } else if (templateId) {
      [template] = await db.select().from(reportTemplates).where(eq(reportTemplates.id, templateId));
    }
    
    if (!template) {
      return c.json({ error: "القالب غير موجود" }, 404);
    }
    
    // تنفيذ التقرير حسب المصدر
    const data = await executeReport(template.dataSource, filters, columns, sort, groupBy, limit);
    
    const executionTime = Date.now() - startTime;
    
    // تسجيل التنفيذ
    const executionId = `rpt_exec_${nanoid(12)}`;
    await db.insert(reportExecutions).values({
      id: executionId,
      templateId,
      reportId,
      userId: currentUser?.id,
      filters,
      rowCount: data.length,
      executionTimeMs: executionTime,
      status: "completed",
      createdAt: new Date(),
    });
    
    return c.json({
      data,
      meta: {
        rowCount: data.length,
        executionTimeMs: executionTime,
        executionId,
      }
    });
  } catch (error) {
    console.error("Execute report error:", error);
    return c.json({ error: "فشل في تنفيذ التقرير" }, 500);
  }
});

/**
 * دالة تنفيذ التقرير
 */
async function executeReport(
  dataSource: string,
  filters: Record<string, any> = {},
  columns?: string[],
  sort?: { field: string; direction: "asc" | "desc" }[],
  groupBy?: string,
  limit: number = 1000
): Promise<any[]> {
  
  switch (dataSource) {
    case "inventory_summary":
      return await getInventorySummary(filters);
    
    case "purchases_report":
      return await getPurchasesReport(filters);
    
    case "sales_report":
      return await getSalesReport(filters);
    
    case "serial_movements_report":
      return await getSerialMovementsReport(filters);
    
    case "maintenance_report":
      return await getMaintenanceReport(filters);
    
    case "employees_report":
      return await getEmployeesReport(filters);
    
    case "products_list":
      return await getProductsList(filters);
    
    default:
      return [];
  }
}

// ==================== التقارير المحددة مسبقاً ====================

/**
 * تقرير ملخص المخزون
 */
async function getInventorySummary(filters: Record<string, any>) {
  const conditions = [];
  
  if (filters.categoryId) {
    conditions.push(eq(products.categoryId, filters.categoryId));
  }
  if (filters.warehouseId) {
    conditions.push(eq(serialNumbers.warehouseId, filters.warehouseId));
  }
  
  const result = await db.select({
    productId: products.id,
    productName: products.nameAr,
    sku: products.sku,
    categoryId: products.categoryId,
    totalQuantity: count(serialNumbers.id),
    availableQuantity: sql<number>`COUNT(CASE WHEN ${serialNumbers.status} = 'available' THEN 1 END)`,
    soldQuantity: sql<number>`COUNT(CASE WHEN ${serialNumbers.status} = 'sold' THEN 1 END)`,
    inCustody: sql<number>`COUNT(CASE WHEN ${serialNumbers.status} = 'in_custody' THEN 1 END)`,
    defective: sql<number>`COUNT(CASE WHEN ${serialNumbers.status} = 'defective' THEN 1 END)`,
  })
  .from(products)
  .leftJoin(serialNumbers, eq(serialNumbers.productId, products.id))
  .where(conditions.length > 0 ? and(...conditions) : undefined)
  .groupBy(products.id, products.nameAr, products.sku, products.categoryId)
  .orderBy(desc(count(serialNumbers.id)));
  
  return result;
}

/**
 * تقرير المشتريات
 */
async function getPurchasesReport(filters: Record<string, any>) {
  const conditions = [];
  
  if (filters.dateFrom) {
    conditions.push(gte(purchaseBatches.createdAt, new Date(filters.dateFrom)));
  }
  if (filters.dateTo) {
    conditions.push(lte(purchaseBatches.createdAt, new Date(filters.dateTo)));
  }
  if (filters.supplierId) {
    conditions.push(eq(purchaseBatches.supplierId, filters.supplierId));
  }
  if (filters.status) {
    conditions.push(eq(purchaseBatches.status, filters.status));
  }
  
  const result = await db.select({
    id: purchaseBatches.id,
    batchNumber: purchaseBatches.batchNumber,
    createdAt: purchaseBatches.createdAt,
    supplierId: purchaseBatches.supplierId,
    supplierName: suppliers.name,
    status: purchaseBatches.status,
    totalCost: purchaseBatches.totalCost,
    itemsCount: sql<number>`(SELECT COUNT(*) FROM purchase_batch_items WHERE batch_id = ${purchaseBatches.id})`,
  })
  .from(purchaseBatches)
  .leftJoin(suppliers, eq(suppliers.id, purchaseBatches.supplierId))
  .where(conditions.length > 0 ? and(...conditions) : undefined)
  .orderBy(desc(purchaseBatches.createdAt));
  
  return result;
}

/**
 * تقرير المبيعات
 */
async function getSalesReport(filters: Record<string, any>) {
  const conditions = [eq(invoices.type, "sale")];
  
  if (filters.dateFrom) {
    conditions.push(gte(invoices.createdAt, new Date(filters.dateFrom)));
  }
  if (filters.dateTo) {
    conditions.push(lte(invoices.createdAt, new Date(filters.dateTo)));
  }
  if (filters.customerId) {
    conditions.push(eq(invoices.customerId, filters.customerId));
  }
  
  const result = await db.select({
    id: invoices.id,
    invoiceNumber: invoices.invoiceNumber,
    createdAt: invoices.createdAt,
    customerId: invoices.customerId,
    customerName: customers.name,
    total: invoices.total,
    paidAmount: invoices.paidAmount,
    status: invoices.status,
  })
  .from(invoices)
  .leftJoin(customers, eq(customers.id, invoices.customerId))
  .where(and(...conditions))
  .orderBy(desc(invoices.createdAt));
  
  return result;
}

/**
 * تقرير حركة السيريالات
 */
async function getSerialMovementsReport(filters: Record<string, any>) {
  const { serialMovements } = await import("@bi-management/database");
  const conditions = [];
  
  if (filters.dateFrom) {
    conditions.push(gte(serialMovements.performedAt, new Date(filters.dateFrom)));
  }
  if (filters.dateTo) {
    conditions.push(lte(serialMovements.performedAt, new Date(filters.dateTo)));
  }
  if (filters.movementType) {
    conditions.push(eq(serialMovements.movementType, filters.movementType));
  }
  if (filters.productId) {
    conditions.push(eq(serialNumbers.productId, filters.productId));
  }
  
  const result = await db.select({
    id: serialMovements.id,
    serialNumber: serialNumbers.serialNumber,
    productName: products.nameAr,
    movementType: serialMovements.movementType,
    fromStatus: serialMovements.fromStatus,
    toStatus: serialMovements.toStatus,
    performedAt: serialMovements.performedAt,
    performedByName: users.fullName,
    notes: serialMovements.notes,
  })
  .from(serialMovements)
  .innerJoin(serialNumbers, eq(serialNumbers.id, serialMovements.serialId))
  .leftJoin(products, eq(products.id, serialNumbers.productId))
  .leftJoin(users, eq(users.id, serialMovements.performedBy))
  .where(conditions.length > 0 ? and(...conditions) : undefined)
  .orderBy(desc(serialMovements.performedAt))
  .limit(1000);
  
  return result;
}

/**
 * تقرير الصيانة
 */
async function getMaintenanceReport(filters: Record<string, any>) {
  const conditions = [];
  
  if (filters.dateFrom) {
    conditions.push(gte(maintenanceOrders.createdAt, new Date(filters.dateFrom)));
  }
  if (filters.dateTo) {
    conditions.push(lte(maintenanceOrders.createdAt, new Date(filters.dateTo)));
  }
  if (filters.status) {
    conditions.push(eq(maintenanceOrders.status, filters.status));
  }
  
  const result = await db.select({
    id: maintenanceOrders.id,
    orderNumber: maintenanceOrders.orderNumber,
    customerId: maintenanceOrders.customerId,
    customerName: customers.name,
    type: maintenanceOrders.type,
    issueDescription: maintenanceOrders.issueDescription,
    status: maintenanceOrders.status,
    createdAt: maintenanceOrders.createdAt,
    completedAt: maintenanceOrders.completedAt,
    estimatedCost: maintenanceOrders.estimatedCost,
    totalCost: maintenanceOrders.totalCost,
    assignedTo: maintenanceOrders.assignedTo,
    technicianName: users.fullName,
  })
  .from(maintenanceOrders)
  .leftJoin(customers, eq(customers.id, maintenanceOrders.customerId))
  .leftJoin(users, eq(users.id, maintenanceOrders.assignedTo))
  .where(conditions.length > 0 ? and(...conditions) : undefined)
  .orderBy(desc(maintenanceOrders.createdAt));
  
  return result;
}

/**
 * تقرير الموظفين
 */
async function getEmployeesReport(filters: Record<string, any>) {
  const conditions = [];
  
  if (filters.department) {
    conditions.push(eq(users.department, filters.department));
  }
  if (filters.status) {
    conditions.push(eq(users.status, filters.status));
  }
  
  const result = await db.select({
    id: users.id,
    fullName: users.fullName,
    email: users.email,
    phone: users.phone,
    role: users.role,
    department: users.department,
    jobTitle: users.jobTitle,
    status: users.status,
    hireDate: users.hireDate,
    salary: users.salary,
  })
  .from(users)
  .where(conditions.length > 0 ? and(...conditions) : undefined)
  .orderBy(users.fullName);
  
  return result;
}

/**
 * قائمة المنتجات
 */
async function getProductsList(filters: Record<string, any>) {
  const conditions = [];
  
  if (filters.categoryId) {
    conditions.push(eq(products.categoryId, filters.categoryId));
  }
  if (filters.search) {
    conditions.push(or(
      like(products.nameAr, `%${filters.search}%`),
      like(products.name, `%${filters.search}%`),
      like(products.sku, `%${filters.search}%`)
    ));
  }
  
  const result = await db.select({
    id: products.id,
    nameAr: products.nameAr,
    name: products.name,
    sku: products.sku,
    categoryId: products.categoryId,
    categoryName: categories.nameAr,
    price: products.price,
    costPrice: products.costPrice,
    description: products.description,
  })
  .from(products)
  .leftJoin(categories, eq(categories.id, products.categoryId))
  .where(conditions.length > 0 ? and(...conditions) : undefined)
  .orderBy(products.nameAr);
  
  return result;
}

// ==================== التقارير المحفوظة ====================

/**
 * قائمة التقارير المحفوظة
 */
app.get("/saved", async (c) => {
  try {
    const currentUser = c.get("user");
    
    const reports = await db.select({
      id: savedReports.id,
      name: savedReports.name,
      description: savedReports.description,
      templateId: savedReports.templateId,
      templateName: reportTemplates.name,
      isPublic: savedReports.isPublic,
      lastRunAt: savedReports.lastRunAt,
      hasSchedule: sql<boolean>`${savedReports.schedule}->>'enabled' = 'true'`,
      createdAt: savedReports.createdAt,
    })
    .from(savedReports)
    .leftJoin(reportTemplates, eq(reportTemplates.id, savedReports.templateId))
    .where(or(
      eq(savedReports.userId, currentUser?.id),
      eq(savedReports.isPublic, true)
    ))
    .orderBy(desc(savedReports.createdAt));
    
    return c.json(reports);
  } catch (error) {
    console.error("Saved reports error:", error);
    return c.json({ error: "فشل في جلب التقارير" }, 500);
  }
});

/**
 * حفظ تقرير
 */
app.post("/saved", async (c) => {
  try {
    const currentUser = c.get("user");
    const body = await c.req.json();
    
    const id = `rpt_${nanoid(12)}`;
    await db.insert(savedReports).values({
      id,
      ...body,
      userId: currentUser?.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    
    return c.json({ success: true, id });
  } catch (error) {
    console.error("Save report error:", error);
    return c.json({ error: "فشل في حفظ التقرير" }, 500);
  }
});

/**
 * حذف تقرير محفوظ
 */
app.delete("/saved/:id", async (c) => {
  try {
    const { id } = c.req.param();
    const currentUser = c.get("user");
    
    await db.delete(savedReports)
      .where(and(
        eq(savedReports.id, id),
        eq(savedReports.userId, currentUser?.id)
      ));
    
    return c.json({ success: true });
  } catch (error) {
    console.error("Delete report error:", error);
    return c.json({ error: "فشل في حذف التقرير" }, 500);
  }
});

// ==================== تصدير التقارير ====================

/**
 * تصدير تقرير CSV
 */
app.post("/export/csv", async (c) => {
  try {
    const body = await c.req.json();
    const { data, columns, filename = "report" } = body;
    
    if (!data || !Array.isArray(data) || data.length === 0) {
      return c.json({ error: "لا توجد بيانات للتصدير" }, 400);
    }
    
    // إنشاء CSV
    const headers = columns || Object.keys(data[0]);
    const csvRows = [
      headers.join(","),
      ...data.map(row => 
        headers.map(h => {
          const val = row[h];
          if (val === null || val === undefined) return "";
          if (typeof val === "string" && (val.includes(",") || val.includes('"'))) {
            return `"${val.replace(/"/g, '""')}"`;
          }
          return val;
        }).join(",")
      )
    ];
    
    const csv = csvRows.join("\n");
    
    // إرجاع CSV كـ base64
    const base64 = Buffer.from(csv, "utf-8").toString("base64");
    
    return c.json({
      success: true,
      data: base64,
      filename: `${filename}.csv`,
      mimeType: "text/csv",
    });
  } catch (error) {
    console.error("Export CSV error:", error);
    return c.json({ error: "فشل في التصدير" }, 500);
  }
});

// ==================== لوحات المعلومات ====================

/**
 * قائمة لوحات المعلومات
 */
app.get("/dashboards", async (c) => {
  try {
    const currentUser = c.get("user");
    
    const dashboards = await db.select()
      .from(customDashboards)
      .where(or(
        eq(customDashboards.userId, currentUser?.id),
        eq(customDashboards.isPublic, true)
      ))
      .orderBy(desc(customDashboards.isDefault), customDashboards.name);
    
    return c.json(dashboards);
  } catch (error) {
    console.error("Dashboards list error:", error);
    return c.json({ error: "فشل في جلب اللوحات" }, 500);
  }
});

/**
 * حفظ لوحة معلومات
 */
app.post("/dashboards", async (c) => {
  try {
    const currentUser = c.get("user");
    const body = await c.req.json();
    
    const id = `dash_${nanoid(12)}`;
    await db.insert(customDashboards).values({
      id,
      ...body,
      userId: currentUser?.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    
    return c.json({ success: true, id });
  } catch (error) {
    console.error("Save dashboard error:", error);
    return c.json({ error: "فشل في حفظ اللوحة" }, 500);
  }
});

// ==================== مؤشرات الأداء KPIs ====================

/**
 * قائمة KPIs
 */
app.get("/kpis", async (c) => {
  try {
    const kpis = await db.select()
      .from(kpiDefinitions)
      .where(eq(kpiDefinitions.isActive, true))
      .orderBy(kpiDefinitions.category, kpiDefinitions.name);
    
    return c.json(kpis);
  } catch (error) {
    console.error("KPIs list error:", error);
    return c.json({ error: "فشل في جلب المؤشرات" }, 500);
  }
});

/**
 * تنفيذ KPI
 */
app.get("/kpis/:id/execute", async (c) => {
  try {
    const { id } = c.req.param();
    
    const [kpi] = await db.select().from(kpiDefinitions).where(eq(kpiDefinitions.id, id));
    
    if (!kpi) {
      return c.json({ error: "المؤشر غير موجود" }, 404);
    }
    
    // تنفيذ المؤشر
    const value = await executeKpi(kpi);
    
    return c.json({
      kpi,
      value,
      status: getKpiStatus(value, kpi),
    });
  } catch (error) {
    console.error("Execute KPI error:", error);
    return c.json({ error: "فشل في تنفيذ المؤشر" }, 500);
  }
});

/**
 * قائمة الصيغ المسموح بها للـ KPIs (whitelist approach)
 * هذا يمنع SQL injection من خلال السماح فقط بصيغ معروفة ومحددة مسبقاً
 */
const ALLOWED_KPI_FORMULAS: Record<string, string> = {
  // مؤشرات المبيعات
  "total_sales": "SELECT COALESCE(SUM(total_amount), 0) FROM invoices WHERE type = 'sale' AND created_at >= CURRENT_DATE - INTERVAL '30 days'",
  "sales_count": "SELECT COUNT(*) FROM invoices WHERE type = 'sale' AND created_at >= CURRENT_DATE - INTERVAL '30 days'",
  "avg_sale_value": "SELECT COALESCE(AVG(total_amount), 0) FROM invoices WHERE type = 'sale' AND created_at >= CURRENT_DATE - INTERVAL '30 days'",
  
  // مؤشرات العملاء
  "total_customers": "SELECT COUNT(*) FROM customers",
  "new_customers": "SELECT COUNT(*) FROM customers WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'",
  "active_customers": "SELECT COUNT(DISTINCT customer_id) FROM invoices WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'",
  
  // مؤشرات المنتجات
  "total_products": "SELECT COUNT(*) FROM products WHERE is_active = 1",
  "low_stock_products": "SELECT COUNT(*) FROM products WHERE quantity <= min_quantity AND is_active = 1",
  
  // مؤشرات المخزون
  "inventory_value": "SELECT COALESCE(SUM(quantity * cost_price), 0) FROM products WHERE is_active = 1",
  
  // مؤشرات الموظفين
  "total_employees": "SELECT COUNT(*) FROM employees WHERE status = 'active'",
  "attendance_rate": "SELECT COALESCE(AVG(CASE WHEN status = 'present' THEN 100 ELSE 0 END), 0) FROM attendance WHERE date >= CURRENT_DATE - INTERVAL '30 days'",
};

/**
 * دالة تنفيذ KPI بشكل آمن
 * تستخدم whitelist للصيغ المسموح بها لمنع SQL injection
 */
async function executeKpi(kpi: any): Promise<number> {
  try {
    // التحقق من أن الصيغة موجودة في القائمة المسموح بها
    const formulaKey = kpi.formulaKey || kpi.formula;
    const safeFormula = ALLOWED_KPI_FORMULAS[formulaKey];
    
    if (!safeFormula) {
      console.warn(`KPI formula not in whitelist: ${formulaKey}`);
      // إذا لم تكن الصيغة في القائمة، نعيد 0 بدلاً من تنفيذ SQL عشوائي
      return 0;
    }
    
    const result = await db.execute(sql.raw(safeFormula));
    const rows = result.rows || result;
    if (Array.isArray(rows) && rows.length > 0) {
      return Number(Object.values(rows[0])[0]) || 0;
    }
    return 0;
  } catch (error) {
    console.error("KPI execution error:", error);
    return 0;
  }
}

/**
 * حالة KPI
 */
function getKpiStatus(value: number, kpi: any): string {
  const isHigherBetter = kpi.betterDirection === "higher";
  
  if (kpi.criticalThreshold) {
    if (isHigherBetter && value <= kpi.criticalThreshold) return "critical";
    if (!isHigherBetter && value >= kpi.criticalThreshold) return "critical";
  }
  
  if (kpi.warningThreshold) {
    if (isHigherBetter && value <= kpi.warningThreshold) return "warning";
    if (!isHigherBetter && value >= kpi.warningThreshold) return "warning";
  }
  
  if (kpi.targetValue) {
    if (isHigherBetter && value >= kpi.targetValue) return "success";
    if (!isHigherBetter && value <= kpi.targetValue) return "success";
  }
  
  return "normal";
}

// ==================== التقارير الجاهزة ====================

/**
 * التقارير المتاحة
 */
app.get("/available", async (c) => {
  const reports = [
    {
      id: "inventory_summary",
      name: "ملخص المخزون",
      category: "inventory",
      description: "عرض ملخص المخزون حسب المنتج",
      icon: "📦",
    },
    {
      id: "purchases_report",
      name: "تقرير المشتريات",
      category: "purchases",
      description: "تفاصيل طلبات الشراء",
      icon: "🛒",
    },
    {
      id: "sales_report",
      name: "تقرير المبيعات",
      category: "sales",
      description: "تفاصيل فواتير البيع",
      icon: "💰",
    },
    {
      id: "serial_movements_report",
      name: "تقرير حركة السيريالات",
      category: "inventory",
      description: "سجل حركة الأجهزة والسيريالات",
      icon: "🔄",
    },
    {
      id: "maintenance_report",
      name: "تقرير الصيانة",
      category: "maintenance",
      description: "تفاصيل أوامر الصيانة",
      icon: "🔧",
    },
    {
      id: "employees_report",
      name: "تقرير الموظفين",
      category: "hr",
      description: "قائمة الموظفين وبياناتهم",
      icon: "👥",
    },
    {
      id: "products_list",
      name: "قائمة المنتجات",
      category: "inventory",
      description: "جميع المنتجات والأسعار",
      icon: "📋",
    },
  ];
  
  return c.json(reports);
});

/**
 * تقرير سريع
 */
app.get("/quick/:reportId", async (c) => {
  try {
    const { reportId } = c.req.param();
    const filters = Object.fromEntries(new URL(c.req.url).searchParams);
    delete filters.limit;
    
    const limit = parseInt(c.req.query("limit") || "100");
    
    const data = await executeReport(reportId, filters, undefined, undefined, undefined, limit);
    
    return c.json({ data, count: data.length });
  } catch (error) {
    console.error("Quick report error:", error);
    return c.json({ error: "فشل في تنفيذ التقرير" }, 500);
  }
});

/**
 * إحصائيات التقارير
 */
app.get("/stats", async (c) => {
  try {
    const [templatesCount] = await db.select({ count: count() }).from(reportTemplates).where(eq(reportTemplates.isActive, true));
    const [savedCount] = await db.select({ count: count() }).from(savedReports);
    const [executionsCount] = await db.select({ count: count() }).from(reportExecutions);
    const [todayExecutions] = await db.select({ count: count() })
      .from(reportExecutions)
      .where(gte(reportExecutions.createdAt, new Date(new Date().setHours(0, 0, 0, 0))));
    
    return c.json({
      templates: templatesCount?.count || 0,
      saved: savedCount?.count || 0,
      totalExecutions: executionsCount?.count || 0,
      todayExecutions: todayExecutions?.count || 0,
    });
  } catch (error) {
    console.error("Reports stats error:", error);
    return c.json({ error: "فشل في جلب الإحصائيات" }, 500);
  }
});

// ==================== الذمم المدينة والدائنة (Aging) ====================

/**
 * تقرير الذمم المدينة (عملاء) مع Aging
 */
app.get("/receivables-aging", async (c) => {
  try {
    const rows = await db
      .select({
        invoiceId: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        customerId: invoices.customerId,
        customerName: customers.fullName,
        total: invoices.total,
        remainingAmount: invoices.remainingAmount,
        dueDate: invoices.dueDate,
        createdAt: invoices.createdAt,
      })
      .from(invoices)
      .leftJoin(customers, eq(invoices.customerId, customers.id))
      .where(and(eq(invoices.isDeleted, 0), sql`${invoices.remainingAmount} > 0`));

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const byCustomer = new Map<string, {
      customerId: string | null;
      customerName: string | null;
      totalOutstanding: number;
      invoices: Array<{
        invoiceId: string;
        invoiceNumber: string;
        remainingAmount: number;
        dueDate: Date | null;
        createdAt: Date;
        daysOverdue: number;
        agingBucket: string;
      }>;
      aging0_30: number;
      aging31_60: number;
      aging61_90: number;
      aging90Plus: number;
    }>();

    for (const row of rows) {
      const due = row.dueDate ? new Date(row.dueDate) : new Date(row.createdAt);
      due.setHours(0, 0, 0, 0);
      const daysOverdue = Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
      const amt = Number(row.remainingAmount) || 0;
      let bucket = "0-30";
      if (daysOverdue > 90) bucket = "90+";
      else if (daysOverdue > 60) bucket = "61-90";
      else if (daysOverdue > 30) bucket = "31-60";
      else if (daysOverdue > 0) bucket = "0-30";

      const key = row.customerId || `no_customer_${row.invoiceId}`;
      if (!byCustomer.has(key)) {
        byCustomer.set(key, {
          customerId: row.customerId,
          customerName: row.customerName,
          totalOutstanding: 0,
          invoices: [],
          aging0_30: 0,
          aging31_60: 0,
          aging61_90: 0,
          aging90Plus: 0,
        });
      }
      const rec = byCustomer.get(key)!;
      rec.totalOutstanding += amt;
      rec.invoices.push({
        invoiceId: row.invoiceId,
        invoiceNumber: row.invoiceNumber,
        remainingAmount: amt,
        dueDate: row.dueDate,
        createdAt: row.createdAt,
        daysOverdue,
        agingBucket: bucket,
      });
      if (bucket === "0-30") rec.aging0_30 += amt;
      else if (bucket === "31-60") rec.aging31_60 += amt;
      else if (bucket === "61-90") rec.aging61_90 += amt;
      else rec.aging90Plus += amt;
    }

    const summary = Array.from(byCustomer.values());
    const totalReceivables = summary.reduce((s, r) => s + r.totalOutstanding, 0);
    return c.json({
      summary,
      totalReceivables,
    });
  } catch (error) {
    console.error("Receivables aging error:", error);
    return c.json({ error: "فشل في جلب تقرير الذمم المدينة" }, 500);
  }
});

/**
 * تقرير الذمم الدائنة (موردين) - وجبات شراء مستلمة وغير مدفوعة
 */
app.get("/payables-aging", async (c) => {
  try {
    const rows = await db
      .select({
        batchId: purchaseBatches.id,
        batchNumber: purchaseBatches.batchNumber,
        supplierId: purchaseBatches.supplierId,
        supplierName: suppliers.name,
        totalCost: purchaseBatches.totalCost,
        receivedAt: purchaseBatches.receivedAt,
      })
      .from(purchaseBatches)
      .innerJoin(suppliers, eq(purchaseBatches.supplierId, suppliers.id))
      .where(
        and(
          inArray(purchaseBatches.status, ["received", "ready_to_sell"]),
          sql`COALESCE(${purchaseBatches.totalCost}, 0) > 0`
        )
      );

    const bySupplier = new Map<string, {
      supplierId: string;
      supplierName: string;
      totalPayable: number;
      batches: Array<{
        batchId: string;
        batchNumber: string;
        totalCost: number;
        receivedAt: Date | null;
      }>;
    }>();

    for (const row of rows) {
      const key = row.supplierId;
      const cost = Number(row.totalCost) || 0;
      if (!bySupplier.has(key)) {
        bySupplier.set(key, {
          supplierId: row.supplierId,
          supplierName: row.supplierName,
          totalPayable: 0,
          batches: [],
        });
      }
      const rec = bySupplier.get(key)!;
      rec.totalPayable += cost;
      rec.batches.push({
        batchId: row.batchId,
        batchNumber: row.batchNumber,
        totalCost: cost,
        receivedAt: row.receivedAt,
      });
    }

    const summary = Array.from(bySupplier.values());
    const totalPayables = summary.reduce((s, r) => s + r.totalPayable, 0);
    return c.json({
      summary,
      totalPayables,
    });
  } catch (error) {
    console.error("Payables aging error:", error);
    return c.json({ error: "فشل في جلب تقرير الذمم الدائنة" }, 500);
  }
});

export default app;

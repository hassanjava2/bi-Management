/**
 * API Routes - نظام العقود
 */
import { Hono } from "hono";
import {
  db, contracts, contractTypes, contractItems, contractServices,
  contractServiceLogs, contractInvoices, contractActivities, customers, users
} from "@bi-management/database";
import { eq, and, or, desc, count, sql, like, gte, lte, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";
import { authMiddleware } from "../lib/auth.js";

const app = new Hono();

// ========== توليد رقم العقد ==========
async function generateContractNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `CT-${year}-`;
  
  const [last] = await db.select({ contractNumber: contracts.contractNumber })
    .from(contracts).where(like(contracts.contractNumber, `${prefix}%`))
    .orderBy(desc(contracts.contractNumber)).limit(1);
  
  let nextNum = 1;
  if (last?.contractNumber) {
    const num = parseInt(last.contractNumber.replace(prefix, ""), 10);
    if (!isNaN(num)) nextNum = num + 1;
  }
  
  return `${prefix}${String(nextNum).padStart(6, "0")}`;
}

// ========== العقود ==========

/**
 * جلب جميع العقود
 */
app.get("/", async (c) => {
  try {
    const { status, customerId, search, page = "1", limit = "20" } = c.req.query();
    const conditions = [];

    if (status) conditions.push(inArray(contracts.status, status.split(",")));
    if (customerId) conditions.push(eq(contracts.customerId, customerId));
    if (search) {
      conditions.push(or(
        like(contracts.contractNumber, `%${search}%`),
        like(contracts.customerName, `%${search}%`)
      ));
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    const result = await db.select().from(contracts)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(contracts.createdAt))
      .limit(limitNum).offset((pageNum - 1) * limitNum);

    const [total] = await db.select({ count: count() }).from(contracts)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    return c.json({
      contracts: result,
      pagination: { page: pageNum, limit: limitNum, total: total?.count || 0 },
    });
  } catch (error) {
    console.error("Contracts error:", error);
    return c.json({ error: "فشل في جلب العقود" }, 500);
  }
});

/**
 * إحصائيات العقود
 */
app.get("/stats", async (c) => {
  try {
    const now = new Date();
    const thirtyDaysLater = new Date();
    thirtyDaysLater.setDate(now.getDate() + 30);

    const [activeCount] = await db.select({ count: count() }).from(contracts)
      .where(eq(contracts.status, "active"));

    const [expiringCount] = await db.select({ count: count() }).from(contracts)
      .where(and(eq(contracts.status, "active"), lte(contracts.endDate, thirtyDaysLater), gte(contracts.endDate, now)));

    const [expiredCount] = await db.select({ count: count() }).from(contracts)
      .where(eq(contracts.status, "expired"));

    const [totalValue] = await db.select({ sum: sql<number>`SUM(CAST(${contracts.totalValue} AS DECIMAL))` })
      .from(contracts).where(eq(contracts.status, "active"));

    const [pendingServices] = await db.select({ count: count() }).from(contractServiceLogs)
      .where(eq(contractServiceLogs.status, "scheduled"));

    return c.json({
      activeContracts: activeCount?.count || 0,
      expiringContracts: expiringCount?.count || 0,
      expiredContracts: expiredCount?.count || 0,
      totalActiveValue: totalValue?.sum || 0,
      pendingServices: pendingServices?.count || 0,
    });
  } catch (error) {
    return c.json({ error: "فشل في جلب الإحصائيات" }, 500);
  }
});

/**
 * العقود التي تنتهي قريباً
 */
app.get("/expiring", async (c) => {
  try {
    const days = parseInt(c.req.query("days") || "30", 10);
    const now = new Date();
    const targetDate = new Date();
    targetDate.setDate(now.getDate() + days);

    const expiring = await db.select().from(contracts)
      .where(and(eq(contracts.status, "active"), lte(contracts.endDate, targetDate), gte(contracts.endDate, now)))
      .orderBy(contracts.endDate);

    return c.json(expiring);
  } catch (error) {
    return c.json({ error: "فشل في جلب العقود" }, 500);
  }
});

/**
 * تفاصيل عقد
 */
app.get("/:id", async (c) => {
  try {
    const { id } = c.req.param();
    const [contract] = await db.select().from(contracts).where(eq(contracts.id, id));
    if (!contract) return c.json({ error: "العقد غير موجود" }, 404);

    // جلب البيانات المرتبطة
    const [items, services, serviceLogs, invoices, activities] = await Promise.all([
      db.select().from(contractItems).where(eq(contractItems.contractId, id)),
      db.select().from(contractServices).where(eq(contractServices.contractId, id)),
      db.select().from(contractServiceLogs).where(eq(contractServiceLogs.contractId, id))
        .orderBy(desc(contractServiceLogs.serviceDate)).limit(20),
      db.select().from(contractInvoices).where(eq(contractInvoices.contractId, id))
        .orderBy(desc(contractInvoices.createdAt)),
      db.select().from(contractActivities).where(eq(contractActivities.contractId, id))
        .orderBy(desc(contractActivities.createdAt)).limit(30),
    ]);

    return c.json({ ...contract, items, services, serviceLogs, invoices, activities });
  } catch (error) {
    return c.json({ error: "فشل في جلب العقد" }, 500);
  }
});

/**
 * إنشاء عقد
 */
app.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const id = `contract_${nanoid(12)}`;
    const contractNumber = await generateContractNumber();

    // حساب قيمة الفوترة
    let billingAmount = body.billingAmount;
    if (!billingAmount && body.totalValue && body.billingType) {
      const total = parseFloat(body.totalValue);
      const start = new Date(body.startDate);
      const end = new Date(body.endDate);
      const months = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30));
      
      if (body.billingType === "monthly") billingAmount = String(total / months);
      else if (body.billingType === "quarterly") billingAmount = String((total / months) * 3);
      else if (body.billingType === "yearly") billingAmount = String(total);
    }

    await db.insert(contracts).values({
      id,
      contractNumber,
      contractTypeId: body.contractTypeId || null,
      contractTypeName: body.contractTypeName || null,
      customerId: body.customerId || null,
      customerName: body.customerName,
      customerPhone: body.customerPhone || null,
      customerEmail: body.customerEmail || null,
      customerAddress: body.customerAddress || null,
      branchId: body.branchId || null,
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
      status: body.status || "draft",
      totalValue: body.totalValue,
      billingType: body.billingType || "monthly",
      billingAmount: billingAmount || null,
      autoRenew: body.autoRenew || false,
      renewalNotificationDays: body.renewalNotificationDays || 30,
      terms: body.terms || null,
      specialConditions: body.specialConditions || null,
      responseTimeHours: body.responseTimeHours || null,
      resolutionTimeHours: body.resolutionTimeHours || null,
      notes: body.notes || null,
      createdBy: body.createdBy || null,
      accountManager: body.accountManager || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // إضافة الأجهزة
    if (body.items?.length > 0) {
      const itemsData = body.items.map((item: any) => ({
        id: `ci_${nanoid(12)}`,
        contractId: id,
        productId: item.productId || null,
        productName: item.productName,
        serialNumber: item.serialNumber || null,
        description: item.description || null,
        location: item.location || null,
        coverageType: item.coverageType || "full",
        itemValue: item.itemValue || null,
        createdAt: new Date(),
      }));
      await db.insert(contractItems).values(itemsData);
    }

    // إضافة الخدمات
    if (body.services?.length > 0) {
      const servicesData = body.services.map((svc: any) => ({
        id: `cs_${nanoid(12)}`,
        contractId: id,
        serviceName: svc.serviceName,
        description: svc.description || null,
        frequency: svc.frequency || null,
        includedQuantity: svc.includedQuantity || null,
        extraCostPerUnit: svc.extraCostPerUnit || null,
        isActive: true,
        createdAt: new Date(),
      }));
      await db.insert(contractServices).values(servicesData);
    }

    // تسجيل النشاط
    await db.insert(contractActivities).values({
      id: `ca_${nanoid(12)}`,
      contractId: id,
      activityType: "created",
      description: `تم إنشاء العقد ${contractNumber}`,
      performedBy: body.createdBy || null,
      createdAt: new Date(),
    });

    return c.json({ id, contractNumber }, 201);
  } catch (error) {
    console.error("Create contract error:", error);
    return c.json({ error: "فشل في إنشاء العقد" }, 500);
  }
});

/**
 * تحديث عقد
 */
app.patch("/:id", async (c) => {
  try {
    const { id } = c.req.param();
    const body = await c.req.json();

    const [existing] = await db.select().from(contracts).where(eq(contracts.id, id));
    if (!existing) return c.json({ error: "العقد غير موجود" }, 404);

    const updates: any = { updatedAt: new Date() };
    const fields = ["customerName", "customerPhone", "customerEmail", "customerAddress",
      "totalValue", "billingType", "billingAmount", "terms", "specialConditions",
      "responseTimeHours", "resolutionTimeHours", "autoRenew", "notes", "accountManager"];
    
    fields.forEach(f => { if (body[f] !== undefined) updates[f] = body[f]; });
    if (body.startDate) updates.startDate = new Date(body.startDate);
    if (body.endDate) updates.endDate = new Date(body.endDate);

    await db.update(contracts).set(updates).where(eq(contracts.id, id));
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: "فشل في تحديث العقد" }, 500);
  }
});

/**
 * تغيير حالة العقد
 */
app.post("/:id/status", async (c) => {
  try {
    const { id } = c.req.param();
    const { status, reason, performedBy } = await c.req.json();

    const [existing] = await db.select().from(contracts).where(eq(contracts.id, id));
    if (!existing) return c.json({ error: "العقد غير موجود" }, 404);

    const updates: any = { status, updatedAt: new Date() };
    
    if (status === "active" && !existing.signedAt) {
      updates.signedAt = new Date();
    }

    await db.update(contracts).set(updates).where(eq(contracts.id, id));

    // تسجيل النشاط
    const activityTypes: Record<string, string> = {
      active: "activated",
      suspended: "suspended",
      terminated: "terminated",
      renewed: "renewed",
      expired: "expired",
    };

    await db.insert(contractActivities).values({
      id: `ca_${nanoid(12)}`,
      contractId: id,
      activityType: activityTypes[status] || "status_changed",
      description: reason || `تم تغيير حالة العقد إلى ${status}`,
      performedBy: performedBy || null,
      createdAt: new Date(),
    });

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: "فشل في تغيير الحالة" }, 500);
  }
});

/**
 * تجديد عقد
 */
app.post("/:id/renew", async (c) => {
  try {
    const { id } = c.req.param();
    const { newEndDate, newTotalValue, performedBy } = await c.req.json();

    const [existing] = await db.select().from(contracts).where(eq(contracts.id, id));
    if (!existing) return c.json({ error: "العقد غير موجود" }, 404);

    // إنشاء عقد جديد أو تمديد الحالي
    const newContractId = `contract_${nanoid(12)}`;
    const newContractNumber = await generateContractNumber();

    await db.insert(contracts).values({
      ...existing,
      id: newContractId,
      contractNumber: newContractNumber,
      startDate: new Date(existing.endDate),
      endDate: new Date(newEndDate),
      totalValue: newTotalValue || existing.totalValue,
      status: "active",
      paidAmount: "0",
      renewalNotified: false,
      signedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // نسخ الأجهزة والخدمات
    const items = await db.select().from(contractItems).where(eq(contractItems.contractId, id));
    if (items.length > 0) {
      const newItems = items.map(item => ({
        ...item,
        id: `ci_${nanoid(12)}`,
        contractId: newContractId,
        createdAt: new Date(),
      }));
      await db.insert(contractItems).values(newItems);
    }

    const services = await db.select().from(contractServices).where(eq(contractServices.contractId, id));
    if (services.length > 0) {
      const newServices = services.map(svc => ({
        ...svc,
        id: `cs_${nanoid(12)}`,
        contractId: newContractId,
        usedQuantity: 0,
        createdAt: new Date(),
      }));
      await db.insert(contractServices).values(newServices);
    }

    // تحديث العقد القديم
    await db.update(contracts).set({ status: "renewed", updatedAt: new Date() }).where(eq(contracts.id, id));

    // تسجيل النشاط
    await db.insert(contractActivities).values({
      id: `ca_${nanoid(12)}`,
      contractId: newContractId,
      activityType: "renewed",
      description: `تم تجديد العقد من ${existing.contractNumber}`,
      performedBy,
      metadata: { previousContractId: id },
      createdAt: new Date(),
    });

    return c.json({ newContractId, newContractNumber });
  } catch (error) {
    console.error("Renew contract error:", error);
    return c.json({ error: "فشل في تجديد العقد" }, 500);
  }
});

// ========== سجل الخدمات ==========

app.post("/:id/services/log", async (c) => {
  try {
    const { contractId } = c.req.param();
    const body = await c.req.json();
    const id = `csl_${nanoid(12)}`;

    await db.insert(contractServiceLogs).values({
      id,
      contractId,
      contractServiceId: body.contractServiceId || null,
      serviceType: body.serviceType,
      description: body.description || null,
      serviceDate: new Date(body.serviceDate),
      technicianId: body.technicianId || null,
      technicianName: body.technicianName || null,
      status: body.status || "scheduled",
      isCovered: body.isCovered ?? true,
      additionalCost: body.additionalCost || "0",
      createdAt: new Date(),
    });

    // تحديث عدد الاستخدامات
    if (body.contractServiceId) {
      await db.update(contractServices).set({
        usedQuantity: sql`${contractServices.usedQuantity} + 1`,
      }).where(eq(contractServices.id, body.contractServiceId));
    }

    return c.json({ id }, 201);
  } catch (error) {
    return c.json({ error: "فشل في تسجيل الخدمة" }, 500);
  }
});

app.patch("/services/log/:logId", async (c) => {
  try {
    const { logId } = c.req.param();
    const body = await c.req.json();

    const updates: any = {};
    if (body.status) updates.status = body.status;
    if (body.status === "completed") updates.completedAt = new Date();
    if (body.reportNotes !== undefined) updates.reportNotes = body.reportNotes;
    if (body.additionalCost !== undefined) updates.additionalCost = body.additionalCost;

    await db.update(contractServiceLogs).set(updates).where(eq(contractServiceLogs.id, logId));
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: "فشل في تحديث السجل" }, 500);
  }
});

// ========== أنواع العقود ==========

app.get("/types/list", async (c) => {
  try {
    const types = await db.select().from(contractTypes)
      .where(eq(contractTypes.isActive, true))
      .orderBy(contractTypes.sortOrder);
    return c.json(types);
  } catch (error) {
    return c.json({ error: "فشل في جلب الأنواع" }, 500);
  }
});

app.post("/types", async (c) => {
  try {
    const body = await c.req.json();
    const id = `ct_${nanoid(12)}`;

    await db.insert(contractTypes).values({
      id,
      name: body.name,
      description: body.description || null,
      defaultDurationMonths: body.defaultDurationMonths || 12,
      billingType: body.billingType || "monthly",
      includedServices: body.includedServices || null,
      termsTemplate: body.termsTemplate || null,
      isActive: true,
      createdAt: new Date(),
    });

    return c.json({ id }, 201);
  } catch (error) {
    return c.json({ error: "فشل في إنشاء النوع" }, 500);
  }
});

export default app;

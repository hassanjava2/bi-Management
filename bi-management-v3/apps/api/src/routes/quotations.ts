/**
 * API Routes - نظام عروض الأسعار
 */
import { Hono } from "hono";
import {
  db, quotations, quotationItems, quotationActivities, quotationTemplates,
  customers, products, users, invoices, invoiceItems
} from "@bi-management/database";
import { eq, and, or, desc, asc, count, sql, like, gte, lte, isNull, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";
import { authMiddleware } from "../lib/auth.js";

const app = new Hono();

/**
 * توليد رقم عرض سعر فريد
 */
async function generateQuotationNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `QT-${year}-`;

  const [last] = await db
    .select({ quotationNumber: quotations.quotationNumber })
    .from(quotations)
    .where(like(quotations.quotationNumber, `${prefix}%`))
    .orderBy(desc(quotations.quotationNumber))
    .limit(1);

  let nextNum = 1;
  if (last?.quotationNumber) {
    const lastNum = parseInt(last.quotationNumber.replace(prefix, ""), 10);
    nextNum = lastNum + 1;
  }

  return `${prefix}${String(nextNum).padStart(6, "0")}`;
}

/**
 * تسجيل نشاط
 */
async function logActivity(quotationId: string, type: string, description: string, userId?: string, metadata?: any) {
  await db.insert(quotationActivities).values({
    id: `qa_${nanoid(12)}`,
    quotationId,
    activityType: type,
    description,
    performedBy: userId || null,
    metadata: metadata || null,
    createdAt: new Date(),
  });
}

/**
 * جلب جميع عروض الأسعار
 */
app.get("/", async (c) => {
  try {
    const { status, customerId, search, from, to, page = "1", limit = "20" } = c.req.query();

    const conditions = [];

    if (status) {
      const statuses = status.split(",");
      conditions.push(inArray(quotations.status, statuses));
    }

    if (customerId) {
      conditions.push(eq(quotations.customerId, customerId));
    }

    if (search) {
      conditions.push(
        or(
          like(quotations.quotationNumber, `%${search}%`),
          like(quotations.customerName, `%${search}%`),
          like(quotations.customerPhone, `%${search}%`)
        )
      );
    }

    if (from) {
      conditions.push(gte(quotations.quotationDate, new Date(from)));
    }

    if (to) {
      conditions.push(lte(quotations.quotationDate, new Date(to)));
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const offset = (pageNum - 1) * limitNum;

    const quots = await db
      .select({
        quotation: quotations,
        customer: {
          id: customers.id,
          fullName: customers.name,
        },
        createdByUser: {
          id: users.id,
          fullName: users.fullName,
        },
      })
      .from(quotations)
      .leftJoin(customers, eq(quotations.customerId, customers.id))
      .leftJoin(users, eq(quotations.createdBy, users.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(quotations.createdAt))
      .limit(limitNum)
      .offset(offset);

    const [totalResult] = await db
      .select({ count: count() })
      .from(quotations)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    return c.json({
      quotations: quots.map((q) => ({
        ...q.quotation,
        customer: q.customer?.id ? q.customer : null,
        createdByUser: q.createdByUser?.id ? q.createdByUser : null,
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalResult?.count || 0,
        totalPages: Math.ceil((totalResult?.count || 0) / limitNum),
      },
    });
  } catch (error) {
    console.error("Quotations error:", error);
    return c.json({ error: "فشل في جلب عروض الأسعار" }, 500);
  }
});

/**
 * إحصائيات عروض الأسعار
 */
app.get("/stats", async (c) => {
  try {
    const stats = await db
      .select({
        status: quotations.status,
        count: count(),
        totalValue: sql<number>`SUM(CAST(${quotations.totalAmount} AS DECIMAL))`,
      })
      .from(quotations)
      .groupBy(quotations.status);

    // عروض هذا الشهر
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [monthlyStats] = await db
      .select({
        count: count(),
        totalValue: sql<number>`SUM(CAST(${quotations.totalAmount} AS DECIMAL))`,
        acceptedCount: sql<number>`COUNT(CASE WHEN ${quotations.status} = 'accepted' THEN 1 END)`,
        convertedCount: sql<number>`COUNT(CASE WHEN ${quotations.convertedToInvoice} = true THEN 1 END)`,
      })
      .from(quotations)
      .where(gte(quotations.createdAt, startOfMonth));

    // معدل التحويل
    const [conversionRate] = await db
      .select({
        total: count(),
        converted: sql<number>`COUNT(CASE WHEN ${quotations.convertedToInvoice} = true THEN 1 END)`,
      })
      .from(quotations)
      .where(
        or(
          eq(quotations.status, "accepted"),
          eq(quotations.status, "converted"),
          eq(quotations.status, "rejected")
        )
      );

    return c.json({
      byStatus: stats.reduce((acc, s) => ({
        ...acc,
        [s.status || "unknown"]: { count: s.count, value: s.totalValue || 0 }
      }), {}),
      monthly: {
        count: monthlyStats?.count || 0,
        totalValue: monthlyStats?.totalValue || 0,
        accepted: monthlyStats?.acceptedCount || 0,
        converted: monthlyStats?.convertedCount || 0,
      },
      conversionRate: conversionRate?.total ? 
        Math.round((Number(conversionRate.converted) / conversionRate.total) * 100) : 0,
    });
  } catch (error) {
    console.error("Stats error:", error);
    return c.json({ error: "فشل في جلب الإحصائيات" }, 500);
  }
});

/**
 * تفاصيل عرض سعر
 */
app.get("/:id", async (c) => {
  try {
    const { id } = c.req.param();

    const [quot] = await db
      .select({
        quotation: quotations,
        customer: {
          id: customers.id,
          fullName: customers.name,
          phone: customers.phone,
          email: customers.email,
        },
        createdByUser: {
          id: users.id,
          fullName: users.fullName,
        },
      })
      .from(quotations)
      .leftJoin(customers, eq(quotations.customerId, customers.id))
      .leftJoin(users, eq(quotations.createdBy, users.id))
      .where(
        or(
          eq(quotations.id, id),
          eq(quotations.quotationNumber, id)
        )
      );

    if (!quot) {
      return c.json({ error: "عرض السعر غير موجود" }, 404);
    }

    // جلب العناصر
    const items = await db
      .select()
      .from(quotationItems)
      .where(eq(quotationItems.quotationId, quot.quotation.id))
      .orderBy(asc(quotationItems.sortOrder));

    // جلب سجل الأنشطة
    const activities = await db
      .select({
        activity: quotationActivities,
        user: {
          id: users.id,
          fullName: users.fullName,
        },
      })
      .from(quotationActivities)
      .leftJoin(users, eq(quotationActivities.performedBy, users.id))
      .where(eq(quotationActivities.quotationId, quot.quotation.id))
      .orderBy(desc(quotationActivities.createdAt))
      .limit(20);

    return c.json({
      ...quot.quotation,
      customer: quot.customer?.id ? quot.customer : null,
      createdByUser: quot.createdByUser?.id ? quot.createdByUser : null,
      items,
      activities: activities.map((a) => ({
        ...a.activity,
        user: a.user?.id ? a.user : null,
      })),
    });
  } catch (error) {
    console.error("Quotation detail error:", error);
    return c.json({ error: "فشل في جلب عرض السعر" }, 500);
  }
});

/**
 * إنشاء عرض سعر جديد
 */
app.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const {
      customerId, customerName, customerPhone, customerEmail, customerAddress,
      branchId, createdBy, validUntil, terms, notes, internalNotes,
      discountType, discountValue, taxRate, items = [], currency = "IQD"
    } = body;

    if (!items.length) {
      return c.json({ error: "يجب إضافة عنصر واحد على الأقل" }, 400);
    }

    const id = `quot_${nanoid(12)}`;
    const quotationNumber = await generateQuotationNumber();

    // حساب المبالغ
    let subtotal = 0;
    const processedItems = items.map((item: any, index: number) => {
      const qty = item.quantity || 1;
      const price = parseFloat(item.unitPrice) || 0;
      const itemDiscount = item.discountType === "percentage" 
        ? (price * qty * (parseFloat(item.discountValue) || 0) / 100)
        : (parseFloat(item.discountValue) || 0);
      const lineTotal = (price * qty) - itemDiscount;
      subtotal += lineTotal;

      return {
        id: `qi_${nanoid(12)}`,
        quotationId: id,
        productId: item.productId || null,
        productName: item.productName,
        productSku: item.productSku || null,
        description: item.description || null,
        quantity: qty,
        unitPrice: String(price),
        discountType: item.discountType || null,
        discountValue: String(item.discountValue || 0),
        discountAmount: String(itemDiscount),
        lineTotal: String(lineTotal),
        sortOrder: index,
        notes: item.notes || null,
        createdAt: new Date(),
      };
    });

    const discountAmount = discountType === "percentage"
      ? subtotal * (parseFloat(discountValue) || 0) / 100
      : parseFloat(discountValue) || 0;
    
    const afterDiscount = subtotal - discountAmount;
    const taxAmount = afterDiscount * (parseFloat(taxRate) || 0) / 100;
    const totalAmount = afterDiscount + taxAmount;

    // حساب تاريخ الصلاحية
    let validDate = validUntil ? new Date(validUntil) : new Date();
    if (!validUntil) {
      validDate.setDate(validDate.getDate() + 30);
    }

    await db.insert(quotations).values({
      id,
      quotationNumber,
      customerId: customerId || null,
      customerName: customerName || null,
      customerPhone: customerPhone || null,
      customerEmail: customerEmail || null,
      customerAddress: customerAddress || null,
      branchId: branchId || null,
      createdBy: createdBy || null,
      quotationDate: new Date(),
      validUntil: validDate,
      status: "draft",
      subtotal: String(subtotal),
      discountType: discountType || null,
      discountValue: String(discountValue || 0),
      discountAmount: String(discountAmount),
      taxRate: String(taxRate || 0),
      taxAmount: String(taxAmount),
      totalAmount: String(totalAmount),
      currency,
      terms: terms || null,
      notes: notes || null,
      internalNotes: internalNotes || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // إضافة العناصر
    if (processedItems.length > 0) {
      await db.insert(quotationItems).values(processedItems);
    }

    // تسجيل النشاط
    await logActivity(id, "created", "تم إنشاء عرض السعر", createdBy);

    return c.json({ id, quotationNumber, message: "تم إنشاء عرض السعر بنجاح" }, 201);
  } catch (error) {
    console.error("Create quotation error:", error);
    return c.json({ error: "فشل في إنشاء عرض السعر" }, 500);
  }
});

/**
 * تحديث عرض سعر
 */
app.patch("/:id", async (c) => {
  try {
    const { id } = c.req.param();
    const body = await c.req.json();

    const [existing] = await db
      .select()
      .from(quotations)
      .where(eq(quotations.id, id));

    if (!existing) {
      return c.json({ error: "عرض السعر غير موجود" }, 404);
    }

    const updates: any = { updatedAt: new Date() };

    // تحديث الحالة
    if (body.status && body.status !== existing.status) {
      updates.status = body.status;
      
      // تحديث تاريخ آخر تواصل
      if (body.status === "sent") {
        updates.lastContactedAt = new Date();
        updates.contactAttempts = (existing.contactAttempts || 0) + 1;
      }

      await logActivity(id, "status_changed", `تم تغيير الحالة إلى ${body.status}`, body.userId, {
        from: existing.status,
        to: body.status,
      });
    }

    // الحقول الأخرى
    const fields = [
      "customerName", "customerPhone", "customerEmail", "customerAddress",
      "validUntil", "terms", "notes", "internalNotes", "followUpDate", "assignedTo"
    ];
    
    fields.forEach((field) => {
      if (body[field] !== undefined) {
        updates[field] = body[field] || null;
      }
    });

    await db.update(quotations).set(updates).where(eq(quotations.id, id));

    return c.json({ success: true, message: "تم تحديث عرض السعر" });
  } catch (error) {
    console.error("Update quotation error:", error);
    return c.json({ error: "فشل في تحديث عرض السعر" }, 500);
  }
});

/**
 * تحويل عرض السعر إلى فاتورة
 */
app.post("/:id/convert", async (c) => {
  try {
    const { id } = c.req.param();
    const body = await c.req.json();

    const [quot] = await db
      .select()
      .from(quotations)
      .where(eq(quotations.id, id));

    if (!quot) {
      return c.json({ error: "عرض السعر غير موجود" }, 404);
    }

    if (quot.convertedToInvoice) {
      return c.json({ error: "تم تحويل هذا العرض مسبقاً", invoiceId: quot.invoiceId }, 400);
    }

    // جلب عناصر العرض
    const items = await db
      .select()
      .from(quotationItems)
      .where(eq(quotationItems.quotationId, id));

    // إنشاء رقم فاتورة
    const year = new Date().getFullYear();
    const invoicePrefix = `INV-${year}-`;
    const [lastInvoice] = await db
      .select({ invoiceNumber: invoices.invoiceNumber })
      .from(invoices)
      .where(like(invoices.invoiceNumber, `${invoicePrefix}%`))
      .orderBy(desc(invoices.invoiceNumber))
      .limit(1);

    let nextInvNum = 1;
    if (lastInvoice?.invoiceNumber) {
      const lastNum = parseInt(lastInvoice.invoiceNumber.replace(invoicePrefix, ""), 10);
      nextInvNum = lastNum + 1;
    }
    const invoiceNumber = `${invoicePrefix}${String(nextInvNum).padStart(6, "0")}`;

    const invoiceId = `inv_${nanoid(12)}`;

    // إنشاء الفاتورة
    await db.insert(invoices).values({
      id: invoiceId,
      invoiceNumber,
      invoiceType: "sale",
      customerId: quot.customerId,
      branchId: quot.branchId,
      invoiceDate: new Date(),
      status: "pending",
      subtotal: quot.subtotal,
      discountAmount: quot.discountAmount,
      taxAmount: quot.taxAmount,
      totalAmount: quot.totalAmount,
      paidAmount: "0",
      notes: quot.notes,
      createdBy: body.userId || quot.createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // إضافة عناصر الفاتورة
    if (items.length > 0) {
      const invoiceItemsData = items.map((item) => ({
        id: `ii_${nanoid(12)}`,
        invoiceId,
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discountAmount: item.discountAmount || "0",
        lineTotal: item.lineTotal,
        createdAt: new Date(),
      }));

      await db.insert(invoiceItems).values(invoiceItemsData);
    }

    // تحديث عرض السعر
    await db.update(quotations).set({
      status: "converted",
      convertedToInvoice: true,
      invoiceId,
      convertedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(quotations.id, id));

    // تسجيل النشاط
    await logActivity(id, "converted", `تم تحويل العرض إلى فاتورة ${invoiceNumber}`, body.userId, {
      invoiceId,
      invoiceNumber,
    });

    return c.json({
      success: true,
      invoiceId,
      invoiceNumber,
      message: "تم تحويل عرض السعر إلى فاتورة بنجاح",
    });
  } catch (error) {
    console.error("Convert quotation error:", error);
    return c.json({ error: "فشل في تحويل عرض السعر" }, 500);
  }
});

/**
 * تكرار عرض سعر
 */
app.post("/:id/duplicate", async (c) => {
  try {
    const { id } = c.req.param();
    const body = await c.req.json();

    const [original] = await db
      .select()
      .from(quotations)
      .where(eq(quotations.id, id));

    if (!original) {
      return c.json({ error: "عرض السعر غير موجود" }, 404);
    }

    const items = await db
      .select()
      .from(quotationItems)
      .where(eq(quotationItems.quotationId, id));

    const newId = `quot_${nanoid(12)}`;
    const quotationNumber = await generateQuotationNumber();

    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 30);

    await db.insert(quotations).values({
      id: newId,
      quotationNumber,
      customerId: body.customerId || original.customerId,
      customerName: body.customerName || original.customerName,
      customerPhone: body.customerPhone || original.customerPhone,
      customerEmail: body.customerEmail || original.customerEmail,
      customerAddress: body.customerAddress || original.customerAddress,
      branchId: original.branchId,
      createdBy: body.userId || original.createdBy,
      quotationDate: new Date(),
      validUntil,
      status: "draft",
      subtotal: original.subtotal,
      discountType: original.discountType,
      discountValue: original.discountValue,
      discountAmount: original.discountAmount,
      taxRate: original.taxRate,
      taxAmount: original.taxAmount,
      totalAmount: original.totalAmount,
      currency: original.currency,
      terms: original.terms,
      notes: original.notes,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    if (items.length > 0) {
      const newItems = items.map((item, index) => ({
        id: `qi_${nanoid(12)}`,
        quotationId: newId,
        productId: item.productId,
        productName: item.productName,
        productSku: item.productSku,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discountType: item.discountType,
        discountValue: item.discountValue,
        discountAmount: item.discountAmount,
        lineTotal: item.lineTotal,
        sortOrder: index,
        notes: item.notes,
        createdAt: new Date(),
      }));

      await db.insert(quotationItems).values(newItems);
    }

    await logActivity(newId, "created", `تم تكرار من عرض ${original.quotationNumber}`, body.userId);

    return c.json({ id: newId, quotationNumber, message: "تم تكرار عرض السعر" }, 201);
  } catch (error) {
    console.error("Duplicate quotation error:", error);
    return c.json({ error: "فشل في تكرار عرض السعر" }, 500);
  }
});

/**
 * حذف عرض سعر
 */
app.delete("/:id", async (c) => {
  try {
    const { id } = c.req.param();

    const [existing] = await db
      .select()
      .from(quotations)
      .where(eq(quotations.id, id));

    if (!existing) {
      return c.json({ error: "عرض السعر غير موجود" }, 404);
    }

    if (existing.convertedToInvoice) {
      return c.json({ error: "لا يمكن حذف عرض تم تحويله لفاتورة" }, 400);
    }

    await db.delete(quotations).where(eq(quotations.id, id));

    return c.json({ success: true, message: "تم حذف عرض السعر" });
  } catch (error) {
    console.error("Delete quotation error:", error);
    return c.json({ error: "فشل في حذف عرض السعر" }, 500);
  }
});

// ========== قوالب عروض الأسعار ==========

app.get("/templates/list", async (c) => {
  try {
    const templates = await db
      .select()
      .from(quotationTemplates)
      .where(eq(quotationTemplates.isActive, true))
      .orderBy(desc(quotationTemplates.isDefault), asc(quotationTemplates.name));

    return c.json(templates);
  } catch (error) {
    return c.json({ error: "فشل في جلب القوالب" }, 500);
  }
});

app.post("/templates", async (c) => {
  try {
    const body = await c.req.json();
    const id = `qt_${nanoid(12)}`;

    await db.insert(quotationTemplates).values({
      id,
      name: body.name,
      description: body.description || null,
      defaultTerms: body.defaultTerms || null,
      defaultNotes: body.defaultNotes || null,
      validityDays: body.validityDays || 30,
      defaultItems: body.defaultItems || null,
      headerHtml: body.headerHtml || null,
      footerHtml: body.footerHtml || null,
      isDefault: body.isDefault || false,
      createdBy: body.createdBy || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return c.json({ id }, 201);
  } catch (error) {
    return c.json({ error: "فشل في إنشاء القالب" }, 500);
  }
});

export default app;

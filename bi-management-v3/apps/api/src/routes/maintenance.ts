/**
 * نظام الصيانة والإصلاح - API Routes
 * ─────────────────────────────────────
 * إدارة طلبات الصيانة من الاستلام حتى التسليم
 */
import { Hono } from "hono";
import {
  db,
  maintenanceOrders,
  maintenanceParts,
  maintenanceHistory,
  serialNumbers,
  serialMovements,
  products,
  customers,
  users,
} from "@bi-management/database";
import { eq, desc, sql, and, or, like, gte, lte } from "drizzle-orm";
import { authMiddleware } from "../lib/auth.js";
import { nanoid } from "nanoid";

const app = new Hono();

app.use("*", authMiddleware);

// حالات طلب الصيانة
const ORDER_STATUSES = {
  received: { label: "تم الاستلام", color: "gray" },
  diagnosing: { label: "قيد الفحص", color: "yellow" },
  waiting_approval: { label: "بانتظار الموافقة", color: "orange" },
  waiting_parts: { label: "بانتظار قطع الغيار", color: "purple" },
  in_progress: { label: "قيد الإصلاح", color: "blue" },
  completed: { label: "مكتمل", color: "green" },
  delivered: { label: "تم التسليم", color: "teal" },
  cancelled: { label: "ملغي", color: "red" },
};

// تصنيفات المشاكل
const ISSUE_CATEGORIES = [
  "شاشة",
  "بطارية",
  "شحن",
  "صوت",
  "كاميرا",
  "برمجيات",
  "ذاكرة",
  "معالج",
  "لوحة أم",
  "أخرى",
];

/**
 * توليد رقم طلب الصيانة
 */
async function generateOrderNumber(): Promise<string> {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const prefix = `MNT-${year}${month}`;

  const [result] = await db
    .select({ count: sql<number>`count(*)` })
    .from(maintenanceOrders)
    .where(like(maintenanceOrders.orderNumber, `${prefix}%`));

  const sequence = String((result?.count || 0) + 1).padStart(4, "0");
  return `${prefix}-${sequence}`;
}

/**
 * تسجيل حركة في سجل الصيانة
 */
async function logHistory(
  orderId: string,
  action: string,
  details: string,
  oldStatus: string | null,
  newStatus: string | null,
  userId: string,
  notes?: string
) {
  await db.insert(maintenanceHistory).values({
    id: `mh_${nanoid(12)}`,
    maintenanceOrderId: orderId,
    action,
    actionDetails: details,
    oldStatus,
    newStatus,
    performedBy: userId,
    performedAt: new Date(),
    notes,
  });
}

/**
 * الحصول على قائمة طلبات الصيانة
 */
app.get("/", async (c) => {
  try {
    const status = c.req.query("status");
    const customerId = c.req.query("customerId");
    const assignedTo = c.req.query("assignedTo");
    const search = c.req.query("search");
    const limit = parseInt(c.req.query("limit") || "50");

    let query = db
      .select({
        id: maintenanceOrders.id,
        orderNumber: maintenanceOrders.orderNumber,
        type: maintenanceOrders.type,
        serialId: maintenanceOrders.serialId,
        serialNumber: serialNumbers.serialNumber,
        productName: products.nameAr,
        customerId: maintenanceOrders.customerId,
        customerName: customers.name,
        customerPhone: customers.phone,
        issueDescription: maintenanceOrders.issueDescription,
        issueCategory: maintenanceOrders.issueCategory,
        status: maintenanceOrders.status,
        isWarranty: maintenanceOrders.isWarranty,
        estimatedCost: maintenanceOrders.estimatedCost,
        totalCost: maintenanceOrders.totalCost,
        paymentStatus: maintenanceOrders.paymentStatus,
        assignedTo: maintenanceOrders.assignedTo,
        technicianName: users.fullName,
        expectedCompletion: maintenanceOrders.expectedCompletion,
        createdAt: maintenanceOrders.createdAt,
      })
      .from(maintenanceOrders)
      .leftJoin(serialNumbers, eq(maintenanceOrders.serialId, serialNumbers.id))
      .leftJoin(products, eq(serialNumbers.productId, products.id))
      .leftJoin(customers, eq(maintenanceOrders.customerId, customers.id))
      .leftJoin(users, eq(maintenanceOrders.assignedTo, users.id))
      .orderBy(desc(maintenanceOrders.createdAt))
      .limit(limit);

    const conditions = [];
    if (status) conditions.push(eq(maintenanceOrders.status, status));
    if (customerId) conditions.push(eq(maintenanceOrders.customerId, customerId));
    if (assignedTo) conditions.push(eq(maintenanceOrders.assignedTo, assignedTo));
    if (search) {
      conditions.push(
        or(
          like(maintenanceOrders.orderNumber, `%${search}%`),
          like(maintenanceOrders.issueDescription, `%${search}%`)
        )
      );
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query;
    }

    const orders = await query;

    return c.json({ orders, statuses: ORDER_STATUSES });
  } catch (error) {
    console.error("List error:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

/**
 * الحصول على تفاصيل طلب صيانة
 */
app.get("/:id", async (c) => {
  try {
    const id = c.req.param("id");

    const [order] = await db
      .select({
        id: maintenanceOrders.id,
        orderNumber: maintenanceOrders.orderNumber,
        type: maintenanceOrders.type,
        serialId: maintenanceOrders.serialId,
        serialNumber: serialNumbers.serialNumber,
        productId: products.id,
        productName: products.nameAr,
        productModel: products.model,
        customerId: maintenanceOrders.customerId,
        customerName: customers.name,
        customerPhone: customers.phone,
        customerAddress: customers.address,
        issueDescription: maintenanceOrders.issueDescription,
        issueCategory: maintenanceOrders.issueCategory,
        issueImages: maintenanceOrders.issueImages,
        diagnosis: maintenanceOrders.diagnosis,
        diagnosedAt: maintenanceOrders.diagnosedAt,
        status: maintenanceOrders.status,
        isWarranty: maintenanceOrders.isWarranty,
        warrantyClaimId: maintenanceOrders.warrantyClaimId,
        estimatedCost: maintenanceOrders.estimatedCost,
        partsCost: maintenanceOrders.partsCost,
        laborCost: maintenanceOrders.laborCost,
        totalCost: maintenanceOrders.totalCost,
        paidAmount: maintenanceOrders.paidAmount,
        paymentStatus: maintenanceOrders.paymentStatus,
        assignedTo: maintenanceOrders.assignedTo,
        expectedCompletion: maintenanceOrders.expectedCompletion,
        completedAt: maintenanceOrders.completedAt,
        deliveredAt: maintenanceOrders.deliveredAt,
        notes: maintenanceOrders.notes,
        createdAt: maintenanceOrders.createdAt,
      })
      .from(maintenanceOrders)
      .leftJoin(serialNumbers, eq(maintenanceOrders.serialId, serialNumbers.id))
      .leftJoin(products, eq(serialNumbers.productId, products.id))
      .leftJoin(customers, eq(maintenanceOrders.customerId, customers.id))
      .where(eq(maintenanceOrders.id, id));

    if (!order) {
      return c.json({ error: "الطلب غير موجود" }, 404);
    }

    // قطع الغيار المستخدمة
    const parts = await db
      .select()
      .from(maintenanceParts)
      .where(eq(maintenanceParts.maintenanceOrderId, id));

    // سجل الطلب
    const history = await db
      .select({
        id: maintenanceHistory.id,
        action: maintenanceHistory.action,
        actionDetails: maintenanceHistory.actionDetails,
        oldStatus: maintenanceHistory.oldStatus,
        newStatus: maintenanceHistory.newStatus,
        performedByName: users.fullName,
        performedAt: maintenanceHistory.performedAt,
        notes: maintenanceHistory.notes,
      })
      .from(maintenanceHistory)
      .leftJoin(users, eq(maintenanceHistory.performedBy, users.id))
      .where(eq(maintenanceHistory.maintenanceOrderId, id))
      .orderBy(desc(maintenanceHistory.performedAt));

    // الفني المسؤول
    let technician = null;
    if (order.assignedTo) {
      const [tech] = await db
        .select({ id: users.id, fullName: users.fullName })
        .from(users)
        .where(eq(users.id, order.assignedTo));
      technician = tech;
    }

    return c.json({
      order,
      parts,
      history,
      technician,
      statuses: ORDER_STATUSES,
      categories: ISSUE_CATEGORIES,
    });
  } catch (error) {
    console.error("Detail error:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

/**
 * إنشاء طلب صيانة جديد
 */
app.post("/", async (c) => {
  try {
    const user = c.get("user");
    const body = await c.req.json();
    const {
      type, // internal, external, warranty
      serialNumber,
      customerId,
      issueDescription,
      issueCategory,
      issueImages,
      isWarranty,
      notes,
    } = body;

    // البحث عن الجهاز إذا تم توفير الرقم التسلسلي
    let serialId = null;
    if (serialNumber) {
      const [device] = await db
        .select()
        .from(serialNumbers)
        .where(eq(serialNumbers.serialNumber, serialNumber));
      
      if (device) {
        serialId = device.id;

        // تسجيل حركة دخول صيانة
        await db.insert(serialMovements).values({
          id: `mov_${nanoid(12)}`,
          serialId: device.id,
          movementType: "maintenance_in",
          fromWarehouseId: device.warehouseId,
          toWarehouseId: device.warehouseId,
          fromStatus: device.status,
          toStatus: "in_maintenance",
          performedBy: user.userId,
          performedAt: new Date(),
          notes: issueDescription,
        });

        // تحديث حالة الجهاز
        await db
          .update(serialNumbers)
          .set({ status: "in_maintenance", updatedAt: new Date() })
          .where(eq(serialNumbers.id, device.id));
      }
    }

    const orderId = `mnt_${nanoid(12)}`;
    const orderNumber = await generateOrderNumber();

    await db.insert(maintenanceOrders).values({
      id: orderId,
      orderNumber,
      type: type || "external",
      serialId,
      customerId,
      issueDescription,
      issueCategory,
      issueImages: issueImages ? JSON.stringify(issueImages) : null,
      isWarranty: isWarranty ? 1 : 0,
      status: "received",
      notes,
      createdBy: user.userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // تسجيل في السجل
    await logHistory(
      orderId,
      "created",
      "تم إنشاء طلب الصيانة",
      null,
      "received",
      user.userId
    );

    return c.json({ success: true, orderId, orderNumber });
  } catch (error) {
    console.error("Create error:", error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

/**
 * تعديل طلب الصيانة
 */
app.put("/:id", async (c) => {
  try {
    const user = c.get("user");
    const id = c.req.param("id");
    const body = await c.req.json();

    const [order] = await db
      .select()
      .from(maintenanceOrders)
      .where(eq(maintenanceOrders.id, id));

    if (!order) {
      return c.json({ error: "الطلب غير موجود" }, 404);
    }

    // Only allow editing if not completed or delivered
    if (["completed", "delivered", "cancelled"].includes(order.status || "")) {
      return c.json({ error: "لا يمكن تعديل طلب مكتمل أو ملغي" }, 400);
    }

    const updates: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (body.issueDescription !== undefined) updates.issueDescription = body.issueDescription;
    if (body.issueCategory !== undefined) updates.issueCategory = body.issueCategory;
    if (body.notes !== undefined) updates.notes = body.notes;
    if (body.isWarranty !== undefined) updates.isWarranty = body.isWarranty ? 1 : 0;
    if (body.estimatedCost !== undefined) updates.estimatedCost = body.estimatedCost;
    if (body.laborCost !== undefined) updates.laborCost = body.laborCost;
    if (body.partsCost !== undefined) updates.partsCost = body.partsCost;
    if (body.diagnosis !== undefined) updates.diagnosis = body.diagnosis;
    if (body.customerId !== undefined) updates.customerId = body.customerId;

    await db
      .update(maintenanceOrders)
      .set(updates)
      .where(eq(maintenanceOrders.id, id));

    await logHistory(
      id,
      "updated",
      "تم تعديل بيانات الطلب",
      order.status,
      order.status,
      user.userId,
      body.notes
    );

    return c.json({ success: true });
  } catch (error) {
    console.error("Update error:", error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

/**
 * تحديث التشخيص
 */
app.patch("/:id/diagnosis", async (c) => {
  try {
    const user = c.get("user");
    const id = c.req.param("id");
    const body = await c.req.json();
    const { diagnosis, estimatedCost, laborCost, expectedDays } = body;

    const [order] = await db
      .select()
      .from(maintenanceOrders)
      .where(eq(maintenanceOrders.id, id));

    if (!order) {
      return c.json({ error: "الطلب غير موجود" }, 404);
    }

    const expectedCompletion = expectedDays
      ? new Date(Date.now() + expectedDays * 24 * 60 * 60 * 1000)
      : null;

    await db
      .update(maintenanceOrders)
      .set({
        diagnosis,
        diagnosedBy: user.userId,
        diagnosedAt: new Date(),
        estimatedCost,
        laborCost,
        expectedCompletion,
        status: "waiting_approval",
        updatedAt: new Date(),
      })
      .where(eq(maintenanceOrders.id, id));

    await logHistory(
      id,
      "diagnosed",
      `التشخيص: ${diagnosis}`,
      order.status,
      "waiting_approval",
      user.userId,
      `التكلفة المتوقعة: ${estimatedCost}`
    );

    return c.json({ success: true });
  } catch (error) {
    console.error("Diagnosis error:", error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

/**
 * موافقة العميل
 */
app.patch("/:id/approve", async (c) => {
  try {
    const user = c.get("user");
    const id = c.req.param("id");
    const body = await c.req.json();
    const { approved, reason } = body;

    const [order] = await db
      .select()
      .from(maintenanceOrders)
      .where(eq(maintenanceOrders.id, id));

    if (!order) {
      return c.json({ error: "الطلب غير موجود" }, 404);
    }

    const newStatus = approved ? "in_progress" : "cancelled";

    await db
      .update(maintenanceOrders)
      .set({
        status: newStatus,
        updatedAt: new Date(),
      })
      .where(eq(maintenanceOrders.id, id));

    await logHistory(
      id,
      approved ? "approved" : "rejected",
      approved ? "تمت موافقة العميل" : `رفض العميل: ${reason}`,
      order.status,
      newStatus,
      user.userId
    );

    // إذا تم الإلغاء، إرجاع الجهاز للحالة السابقة
    if (!approved && order.serialId) {
      await db
        .update(serialNumbers)
        .set({ status: "available", updatedAt: new Date() })
        .where(eq(serialNumbers.id, order.serialId));

      await db.insert(serialMovements).values({
        id: `mov_${nanoid(12)}`,
        serialId: order.serialId,
        movementType: "maintenance_out",
        fromStatus: "in_maintenance",
        toStatus: "available",
        performedBy: user.userId,
        performedAt: new Date(),
        notes: "إلغاء طلب الصيانة",
      });
    }

    return c.json({ success: true });
  } catch (error) {
    console.error("Approve error:", error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

/**
 * تعيين فني
 */
app.patch("/:id/assign", async (c) => {
  try {
    const user = c.get("user");
    const id = c.req.param("id");
    const body = await c.req.json();
    const { technicianId } = body;

    const [order] = await db
      .select()
      .from(maintenanceOrders)
      .where(eq(maintenanceOrders.id, id));

    if (!order) {
      return c.json({ error: "الطلب غير موجود" }, 404);
    }

    await db
      .update(maintenanceOrders)
      .set({
        assignedTo: technicianId,
        assignedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(maintenanceOrders.id, id));

    const [tech] = await db
      .select({ fullName: users.fullName })
      .from(users)
      .where(eq(users.id, technicianId));

    await logHistory(
      id,
      "assigned",
      `تم تعيين الفني: ${tech?.fullName}`,
      null,
      null,
      user.userId
    );

    return c.json({ success: true });
  } catch (error) {
    console.error("Assign error:", error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

/**
 * إضافة قطعة غيار
 */
app.post("/:id/parts", async (c) => {
  try {
    const user = c.get("user");
    const id = c.req.param("id");
    const body = await c.req.json();
    const { partName, partNumber, productId, serialId, quantity, unitCost, source, notes } = body;

    const totalCost = (quantity || 1) * (unitCost || 0);

    await db.insert(maintenanceParts).values({
      id: `mp_${nanoid(12)}`,
      maintenanceOrderId: id,
      partName,
      partNumber,
      productId,
      serialId,
      quantity: quantity || 1,
      unitCost: unitCost || 0,
      totalCost,
      source,
      notes,
      addedBy: user.userId,
      addedAt: new Date(),
    });

    // تحديث تكلفة القطع
    const [partsTotal] = await db
      .select({ total: sql<number>`sum(total_cost)` })
      .from(maintenanceParts)
      .where(eq(maintenanceParts.maintenanceOrderId, id));

    const [order] = await db
      .select()
      .from(maintenanceOrders)
      .where(eq(maintenanceOrders.id, id));

    const newTotalCost = (partsTotal?.total || 0) + (order?.laborCost || 0);

    await db
      .update(maintenanceOrders)
      .set({
        partsCost: partsTotal?.total || 0,
        totalCost: newTotalCost,
        updatedAt: new Date(),
      })
      .where(eq(maintenanceOrders.id, id));

    await logHistory(
      id,
      "part_added",
      `إضافة قطعة: ${partName} (${quantity} × ${unitCost})`,
      null,
      null,
      user.userId
    );

    return c.json({ success: true, totalCost: newTotalCost });
  } catch (error) {
    console.error("Add part error:", error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

/**
 * إكمال الصيانة
 */
app.patch("/:id/complete", async (c) => {
  try {
    const user = c.get("user");
    const id = c.req.param("id");
    const body = await c.req.json();
    const { completionNotes } = body;

    const [order] = await db
      .select()
      .from(maintenanceOrders)
      .where(eq(maintenanceOrders.id, id));

    if (!order) {
      return c.json({ error: "الطلب غير موجود" }, 404);
    }

    await db
      .update(maintenanceOrders)
      .set({
        status: "completed",
        completedAt: new Date(),
        notes: completionNotes
          ? `${order.notes || ""}\n${completionNotes}`.trim()
          : order.notes,
        updatedAt: new Date(),
      })
      .where(eq(maintenanceOrders.id, id));

    await logHistory(
      id,
      "completed",
      "تم إكمال الصيانة",
      order.status,
      "completed",
      user.userId,
      completionNotes
    );

    return c.json({ success: true });
  } catch (error) {
    console.error("Complete error:", error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

/**
 * تسليم الجهاز للعميل
 */
app.patch("/:id/deliver", async (c) => {
  try {
    const user = c.get("user");
    const id = c.req.param("id");
    const body = await c.req.json();
    const { paidAmount, paymentMethod } = body;

    const [order] = await db
      .select()
      .from(maintenanceOrders)
      .where(eq(maintenanceOrders.id, id));

    if (!order) {
      return c.json({ error: "الطلب غير موجود" }, 404);
    }

    const totalPaid = (order.paidAmount || 0) + (paidAmount || 0);
    const paymentStatus =
      totalPaid >= (order.totalCost || 0)
        ? "paid"
        : totalPaid > 0
        ? "partial"
        : "pending";

    await db
      .update(maintenanceOrders)
      .set({
        status: "delivered",
        deliveredAt: new Date(),
        paidAmount: totalPaid,
        paymentStatus,
        updatedAt: new Date(),
      })
      .where(eq(maintenanceOrders.id, id));

    // تحديث حالة الجهاز
    if (order.serialId) {
      await db
        .update(serialNumbers)
        .set({ status: "sold", updatedAt: new Date() })
        .where(eq(serialNumbers.id, order.serialId));

      await db.insert(serialMovements).values({
        id: `mov_${nanoid(12)}`,
        serialId: order.serialId,
        movementType: "maintenance_out",
        fromStatus: "in_maintenance",
        toStatus: "sold",
        referenceType: "maintenance",
        referenceId: id,
        performedBy: user.userId,
        performedAt: new Date(),
        notes: "تسليم بعد الصيانة",
      });
    }

    await logHistory(
      id,
      "delivered",
      `تم التسليم للعميل - المبلغ المدفوع: ${totalPaid}`,
      order.status,
      "delivered",
      user.userId,
      paymentMethod ? `طريقة الدفع: ${paymentMethod}` : undefined
    );

    return c.json({ success: true });
  } catch (error) {
    console.error("Deliver error:", error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

/**
 * إحصائيات الصيانة
 */
app.get("/stats/overview", async (c) => {
  try {
    // عدد الطلبات حسب الحالة
    const statusCounts = await db
      .select({
        status: maintenanceOrders.status,
        count: sql<number>`count(*)`,
      })
      .from(maintenanceOrders)
      .groupBy(maintenanceOrders.status);

    // طلبات اليوم
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [todayCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(maintenanceOrders)
      .where(gte(maintenanceOrders.createdAt, today));

    // إجمالي الإيرادات
    const [revenue] = await db
      .select({ total: sql<number>`sum(paid_amount)` })
      .from(maintenanceOrders)
      .where(eq(maintenanceOrders.status, "delivered"));

    // متوسط وقت الإصلاح
    const [avgTime] = await db
      .select({
        avg: sql<number>`avg(extract(epoch from (completed_at - created_at))/3600)`,
      })
      .from(maintenanceOrders)
      .where(sql`completed_at is not null`);

    return c.json({
      statusCounts,
      todayCount: todayCount?.count || 0,
      totalRevenue: revenue?.total || 0,
      avgRepairHours: Math.round(avgTime?.avg || 0),
      statuses: ORDER_STATUSES,
    });
  } catch (error) {
    console.error("Stats error:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

/**
 * قائمة الفنيين
 */
app.get("/technicians", async (c) => {
  try {
    // في الإنتاج، يجب فلترة حسب الدور
    const technicians = await db
      .select({
        id: users.id,
        fullName: users.fullName,
      })
      .from(users)
      .where(eq(users.isActive, 1))
      .limit(50);

    return c.json({ technicians });
  } catch (error) {
    console.error("Technicians error:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

export default app;

/**
 * نظام العهدة - API Routes
 * ─────────────────────────
 * إدارة الأجهزة والمعدات المسلمة للموظفين
 */
import { Hono } from "hono";
import {
  db,
  serialNumbers,
  serialMovements,
  products,
  users,
  employees,
  warehouses,
} from "@bi-management/database";
import { eq, desc, sql, and, isNotNull, count } from "drizzle-orm";
import { authMiddleware } from "../lib/auth.js";
import { nanoid } from "nanoid";

const app = new Hono();

/**
 * قائمة جميع العهد الحالية
 */
app.get("/", async (c) => {
  try {
    const employeeId = c.req.query("employeeId");

    let query = db
      .select({
        id: serialNumbers.id,
        serialNumber: serialNumbers.serialNumber,
        productId: serialNumbers.productId,
        productName: products.nameAr,
        productModel: products.model,
        custodyUserId: serialNumbers.custodyUserId,
        userName: users.fullName,
        custodySince: serialNumbers.custodySince,
        custodyReason: serialNumbers.custodyReason,
        warehouseId: serialNumbers.warehouseId,
        warehouseName: warehouses.name,
        condition: serialNumbers.condition,
        notes: serialNumbers.notes,
      })
      .from(serialNumbers)
      .innerJoin(products, eq(serialNumbers.productId, products.id))
      .leftJoin(users, eq(serialNumbers.custodyUserId, users.id))
      .leftJoin(warehouses, eq(serialNumbers.warehouseId, warehouses.id))
      .where(eq(serialNumbers.status, "in_custody"))
      .orderBy(desc(serialNumbers.custodySince));

    if (employeeId) {
      query = query.where(
        and(
          eq(serialNumbers.status, "in_custody"),
          eq(serialNumbers.custodyUserId, employeeId)
        )
      ) as typeof query;
    }

    const items = await query;

    return c.json({ items });
  } catch (error) {
    console.error("Custody list error:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

/**
 * ملخص العهد حسب الموظف
 */
app.get("/by-employee", async (c) => {
  try {
    const summary = await db
      .select({
        userId: serialNumbers.custodyUserId,
        userName: users.fullName,
        itemCount: count(),
      })
      .from(serialNumbers)
      .innerJoin(users, eq(serialNumbers.custodyUserId, users.id))
      .where(eq(serialNumbers.status, "in_custody"))
      .groupBy(serialNumbers.custodyUserId, users.fullName)
      .orderBy(desc(count()));

    return c.json({ summary });
  } catch (error) {
    console.error("Custody by employee error:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

/**
 * عهدة موظف معين
 */
app.get("/employee/:userId", async (c) => {
  try {
    const userId = c.req.param("userId");

    // معلومات الموظف
    const [user] = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        username: users.username,
        email: users.email,
      })
      .from(users)
      .where(eq(users.id, userId));

    if (!user) {
      return c.json({ error: "الموظف غير موجود" }, 404);
    }

    // العهد الحالية
    const items = await db
      .select({
        id: serialNumbers.id,
        serialNumber: serialNumbers.serialNumber,
        productId: serialNumbers.productId,
        productName: products.nameAr,
        productModel: products.model,
        custodySince: serialNumbers.custodySince,
        custodyReason: serialNumbers.custodyReason,
        condition: serialNumbers.condition,
        notes: serialNumbers.notes,
      })
      .from(serialNumbers)
      .innerJoin(products, eq(serialNumbers.productId, products.id))
      .where(
        and(
          eq(serialNumbers.status, "in_custody"),
          eq(serialNumbers.custodyUserId, userId)
        )
      )
      .orderBy(desc(serialNumbers.custodySince));

    // سجل العهد السابقة
    const history = await db
      .select({
        id: serialMovements.id,
        serialId: serialMovements.serialId,
        serialNumber: serialNumbers.serialNumber,
        productName: products.nameAr,
        movementType: serialMovements.movementType,
        performedAt: serialMovements.performedAt,
        notes: serialMovements.notes,
      })
      .from(serialMovements)
      .innerJoin(serialNumbers, eq(serialMovements.serialId, serialNumbers.id))
      .innerJoin(products, eq(serialNumbers.productId, products.id))
      .where(
        and(
          sql`${serialMovements.movementType} IN ('custody_assign', 'custody_return')`,
          sql`${serialMovements.notes} LIKE '%${userId}%' OR ${serialNumbers.custodyUserId} = ${userId}`
        )
      )
      .orderBy(desc(serialMovements.performedAt))
      .limit(50);

    return c.json({
      employee: user,
      currentItems: items,
      itemCount: items.length,
      history,
    });
  } catch (error) {
    console.error("Employee custody error:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

/**
 * تسليم عهدة جديدة
 */
app.post("/assign", async (c) => {
  try {
    const currentUser = c.get("user");
    const body = await c.req.json();
    const { serialNumber, userId, reason, notes } = body;

    if (!serialNumber || !userId) {
      return c.json({ error: "بيانات غير مكتملة" }, 400);
    }

    // البحث عن الجهاز
    const [device] = await db
      .select()
      .from(serialNumbers)
      .where(eq(serialNumbers.serialNumber, serialNumber));

    if (!device) {
      return c.json({ error: "الجهاز غير موجود" }, 404);
    }

    if (device.status !== "available") {
      return c.json({ error: `الجهاز غير متاح (${device.status})` }, 400);
    }

    // التحقق من الموظف
    const [employee] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));

    if (!employee) {
      return c.json({ error: "الموظف غير موجود" }, 404);
    }

    // تسجيل الحركة
    const movementId = `mov_${nanoid(12)}`;
    await db.insert(serialMovements).values({
      id: movementId,
      serialId: device.id,
      movementType: "custody_assign",
      fromWarehouseId: device.warehouseId,
      toWarehouseId: device.warehouseId,
      fromStatus: device.status,
      toStatus: "in_custody",
      performedBy: currentUser.id,
      performedAt: new Date(),
      notes: `تسليم عهدة إلى: ${employee.fullName} - السبب: ${reason || "غير محدد"} ${notes ? `- ${notes}` : ""}`,
    });

    // تحديث الجهاز
    await db
      .update(serialNumbers)
      .set({
        status: "in_custody",
        custodyUserId: userId,
        custodySince: new Date(),
        custodyReason: reason,
        notes: notes || device.notes,
        updatedAt: new Date(),
      })
      .where(eq(serialNumbers.id, device.id));

    return c.json({
      success: true,
      message: `تم تسليم الجهاز ${serialNumber} إلى ${employee.fullName}`,
    });
  } catch (error) {
    console.error("Assign custody error:", error);
    return c.json({ error: "فشل في تسليم العهدة" }, 500);
  }
});

/**
 * استرداد عهدة
 */
app.post("/return", async (c) => {
  try {
    const currentUser = c.get("user");
    const body = await c.req.json();
    const { serialNumber, condition, warehouseId, notes } = body;

    if (!serialNumber) {
      return c.json({ error: "رقم الجهاز مطلوب" }, 400);
    }

    // البحث عن الجهاز
    const [device] = await db
      .select()
      .from(serialNumbers)
      .where(eq(serialNumbers.serialNumber, serialNumber));

    if (!device) {
      return c.json({ error: "الجهاز غير موجود" }, 404);
    }

    if (device.status !== "in_custody") {
      return c.json({ error: "الجهاز ليس في عهدة" }, 400);
    }

    // جلب اسم الموظف الحالي
    let employeeName = "غير معروف";
    if (device.custodyUserId) {
      const [emp] = await db
        .select({ fullName: users.fullName })
        .from(users)
        .where(eq(users.id, device.custodyUserId));
      if (emp) employeeName = emp.fullName;
    }

    // تسجيل الحركة
    const movementId = `mov_${nanoid(12)}`;
    await db.insert(serialMovements).values({
      id: movementId,
      serialId: device.id,
      movementType: "custody_return",
      fromWarehouseId: device.warehouseId,
      toWarehouseId: warehouseId || device.warehouseId,
      fromStatus: "in_custody",
      toStatus: "available",
      performedBy: currentUser.id,
      performedAt: new Date(),
      notes: `استرداد عهدة من: ${employeeName} - الحالة: ${condition || "جيدة"} ${notes ? `- ${notes}` : ""}`,
    });

    // تحديث الجهاز
    await db
      .update(serialNumbers)
      .set({
        status: "available",
        custodyUserId: null,
        custodySince: null,
        custodyReason: null,
        condition: condition || device.condition,
        warehouseId: warehouseId || device.warehouseId,
        notes: notes || device.notes,
        updatedAt: new Date(),
      })
      .where(eq(serialNumbers.id, device.id));

    return c.json({
      success: true,
      message: `تم استرداد الجهاز ${serialNumber} من ${employeeName}`,
    });
  } catch (error) {
    console.error("Return custody error:", error);
    return c.json({ error: "فشل في استرداد العهدة" }, 500);
  }
});

/**
 * نقل عهدة من موظف لآخر
 */
app.post("/transfer", async (c) => {
  try {
    const currentUser = c.get("user");
    const body = await c.req.json();
    const { serialNumber, fromUserId, toUserId, reason, notes } = body;

    if (!serialNumber || !toUserId) {
      return c.json({ error: "بيانات غير مكتملة" }, 400);
    }

    // البحث عن الجهاز
    const [device] = await db
      .select()
      .from(serialNumbers)
      .where(eq(serialNumbers.serialNumber, serialNumber));

    if (!device) {
      return c.json({ error: "الجهاز غير موجود" }, 404);
    }

    if (device.status !== "in_custody") {
      return c.json({ error: "الجهاز ليس في عهدة" }, 400);
    }

    // جلب أسماء الموظفين
    const [fromUser] = await db
      .select({ fullName: users.fullName })
      .from(users)
      .where(eq(users.id, device.custodyUserId || fromUserId));

    const [toUser] = await db
      .select({ fullName: users.fullName })
      .from(users)
      .where(eq(users.id, toUserId));

    if (!toUser) {
      return c.json({ error: "الموظف المستلم غير موجود" }, 404);
    }

    // تسجيل حركة الاسترداد
    await db.insert(serialMovements).values({
      id: `mov_${nanoid(12)}`,
      serialId: device.id,
      movementType: "custody_return",
      fromStatus: "in_custody",
      toStatus: "in_custody",
      performedBy: currentUser.id,
      performedAt: new Date(),
      notes: `نقل عهدة من: ${fromUser?.fullName || "غير معروف"}`,
    });

    // تسجيل حركة التسليم
    await db.insert(serialMovements).values({
      id: `mov_${nanoid(12)}`,
      serialId: device.id,
      movementType: "custody_assign",
      fromStatus: "in_custody",
      toStatus: "in_custody",
      performedBy: currentUser.id,
      performedAt: new Date(),
      notes: `نقل عهدة إلى: ${toUser.fullName} - السبب: ${reason || "نقل"}`,
    });

    // تحديث الجهاز
    await db
      .update(serialNumbers)
      .set({
        custodyUserId: toUserId,
        custodySince: new Date(),
        custodyReason: reason || device.custodyReason,
        notes: notes || device.notes,
        updatedAt: new Date(),
      })
      .where(eq(serialNumbers.id, device.id));

    return c.json({
      success: true,
      message: `تم نقل الجهاز من ${fromUser?.fullName} إلى ${toUser.fullName}`,
    });
  } catch (error) {
    console.error("Transfer custody error:", error);
    return c.json({ error: "فشل في نقل العهدة" }, 500);
  }
});

/**
 * إحصائيات العهد
 */
app.get("/stats", async (c) => {
  try {
    // إجمالي العهد الحالية
    const [totalCustody] = await db
      .select({ count: count() })
      .from(serialNumbers)
      .where(eq(serialNumbers.status, "in_custody"));

    // عدد الموظفين الحاملين لعهد
    const [employeesWithCustody] = await db
      .select({ count: sql<number>`count(distinct ${serialNumbers.custodyUserId})` })
      .from(serialNumbers)
      .where(eq(serialNumbers.status, "in_custody"));

    // حركات العهد اليوم
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [todayMovements] = await db
      .select({ count: count() })
      .from(serialMovements)
      .where(
        and(
          sql`${serialMovements.movementType} IN ('custody_assign', 'custody_return')`,
          sql`${serialMovements.performedAt} >= ${today}`
        )
      );

    // أكثر المنتجات في العهد
    const topProducts = await db
      .select({
        productId: serialNumbers.productId,
        productName: products.nameAr,
        count: count(),
      })
      .from(serialNumbers)
      .innerJoin(products, eq(serialNumbers.productId, products.id))
      .where(eq(serialNumbers.status, "in_custody"))
      .groupBy(serialNumbers.productId, products.nameAr)
      .orderBy(desc(count()))
      .limit(5);

    return c.json({
      totalCustody: totalCustody?.count || 0,
      employeesWithCustody: employeesWithCustody?.count || 0,
      todayMovements: todayMovements?.count || 0,
      topProducts,
    });
  } catch (error) {
    console.error("Custody stats error:", error);
    return c.json({ error: "فشل في جلب الإحصائيات" }, 500);
  }
});

/**
 * قائمة الموظفين للاختيار
 */
app.get("/employees", async (c) => {
  try {
    const employeesList = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        username: users.username,
      })
      .from(users)
      .where(eq(users.isActive, 1))
      .orderBy(users.fullName);

    return c.json({ employees: employeesList });
  } catch (error) {
    console.error("Employees list error:", error);
    return c.json({ error: "فشل في جلب قائمة الموظفين" }, 500);
  }
});

export default app;

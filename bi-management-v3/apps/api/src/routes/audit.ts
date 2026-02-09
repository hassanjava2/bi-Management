/**
 * API Routes - نظام سجل التدقيق
 */
import { Hono } from "hono";
import { db, auditLogs, users } from "@bi-management/database";
import { eq, desc, and, gte, lte, like, or, count, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { authMiddleware } from "../lib/auth.js";

const app = new Hono();
// ==================== أنواع الأحداث ====================

export const EVENT_TYPES = {
  // المصادقة
  LOGIN_SUCCESS: { category: "auth", severity: "info", label: "تسجيل دخول ناجح" },
  LOGIN_FAILED: { category: "auth", severity: "warning", label: "فشل تسجيل الدخول" },
  LOGOUT: { category: "auth", severity: "info", label: "تسجيل خروج" },
  PASSWORD_CHANGED: { category: "auth", severity: "warning", label: "تغيير كلمة المرور" },
  PASSWORD_RESET: { category: "auth", severity: "warning", label: "إعادة تعيين كلمة المرور" },
  
  // المستخدمين
  USER_CREATED: { category: "users", severity: "info", label: "إنشاء مستخدم" },
  USER_UPDATED: { category: "users", severity: "info", label: "تحديث مستخدم" },
  USER_DELETED: { category: "users", severity: "warning", label: "حذف مستخدم" },
  USER_ACTIVATED: { category: "users", severity: "info", label: "تفعيل مستخدم" },
  USER_DEACTIVATED: { category: "users", severity: "warning", label: "تعطيل مستخدم" },
  ROLE_ASSIGNED: { category: "users", severity: "info", label: "تعيين دور" },
  
  // المنتجات والمخزون
  PRODUCT_CREATED: { category: "inventory", severity: "info", label: "إنشاء منتج" },
  PRODUCT_UPDATED: { category: "inventory", severity: "info", label: "تحديث منتج" },
  PRODUCT_DELETED: { category: "inventory", severity: "warning", label: "حذف منتج" },
  SERIAL_CREATED: { category: "inventory", severity: "info", label: "إنشاء سيريال" },
  SERIAL_STATUS_CHANGED: { category: "inventory", severity: "info", label: "تغيير حالة سيريال" },
  STOCK_ADJUSTED: { category: "inventory", severity: "warning", label: "تعديل مخزون" },
  
  // المشتريات
  PURCHASE_CREATED: { category: "purchases", severity: "info", label: "إنشاء طلب شراء" },
  PURCHASE_APPROVED: { category: "purchases", severity: "info", label: "اعتماد طلب شراء" },
  PURCHASE_RECEIVED: { category: "purchases", severity: "info", label: "استلام طلب شراء" },
  PURCHASE_CANCELLED: { category: "purchases", severity: "warning", label: "إلغاء طلب شراء" },
  
  // المبيعات
  INVOICE_CREATED: { category: "sales", severity: "info", label: "إنشاء فاتورة" },
  INVOICE_UPDATED: { category: "sales", severity: "info", label: "تحديث فاتورة" },
  INVOICE_CANCELLED: { category: "sales", severity: "warning", label: "إلغاء فاتورة" },
  PAYMENT_RECEIVED: { category: "sales", severity: "info", label: "استلام دفعة" },
  
  // المالية
  JOURNAL_CREATED: { category: "finance", severity: "info", label: "إنشاء قيد" },
  JOURNAL_POSTED: { category: "finance", severity: "info", label: "ترحيل قيد" },
  VOUCHER_CREATED: { category: "finance", severity: "info", label: "إنشاء سند" },
  ACCOUNT_CREATED: { category: "finance", severity: "info", label: "إنشاء حساب" },
  
  // الصيانة
  MAINTENANCE_CREATED: { category: "maintenance", severity: "info", label: "إنشاء أمر صيانة" },
  MAINTENANCE_COMPLETED: { category: "maintenance", severity: "info", label: "إكمال صيانة" },
  
  // النظام
  SETTINGS_CHANGED: { category: "system", severity: "warning", label: "تغيير إعدادات" },
  BACKUP_CREATED: { category: "system", severity: "info", label: "إنشاء نسخة احتياطية" },
  BACKUP_RESTORED: { category: "system", severity: "critical", label: "استعادة نسخة احتياطية" },
  DATA_EXPORTED: { category: "system", severity: "warning", label: "تصدير بيانات" },
  DATA_IMPORTED: { category: "system", severity: "warning", label: "استيراد بيانات" },
  
  // الأمان
  PERMISSION_DENIED: { category: "security", severity: "warning", label: "رفض صلاحية" },
  SUSPICIOUS_ACTIVITY: { category: "security", severity: "critical", label: "نشاط مشبوه" },
  BRUTE_FORCE_DETECTED: { category: "security", severity: "critical", label: "محاولات اختراق" },
};

// ==================== دالة التسجيل ====================

/**
 * تسجيل حدث في سجل التدقيق
 */
export async function logAuditEvent(params: {
  eventType: string;
  userId?: string;
  userName?: string;
  userRole?: string;
  ipAddress?: string;
  userAgent?: string;
  entityType?: string;
  entityId?: string;
  entityName?: string;
  oldValue?: any;
  newValue?: any;
  changes?: any;
  module?: string;
  action?: string;
  metadata?: any;
  requestId?: string;
  sessionId?: string;
}) {
  try {
    const eventInfo = EVENT_TYPES[params.eventType as keyof typeof EVENT_TYPES] || {
      category: "general",
      severity: "info",
    };

    await db.insert(auditLogs).values({
      id: `audit_${nanoid(12)}`,
      eventType: params.eventType,
      eventCategory: eventInfo.category,
      severity: eventInfo.severity,
      userId: params.userId,
      userName: params.userName,
      userRole: params.userRole,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      entityType: params.entityType,
      entityId: params.entityId,
      entityName: params.entityName,
      oldValue: params.oldValue ? JSON.stringify(params.oldValue) : null,
      newValue: params.newValue ? JSON.stringify(params.newValue) : null,
      changes: params.changes ? JSON.stringify(params.changes) : null,
      module: params.module,
      action: params.action,
      metadata: params.metadata ? JSON.stringify(params.metadata) : null,
      requestId: params.requestId,
      sessionId: params.sessionId,
      createdAt: new Date(),
    });

    return true;
  } catch (error) {
    console.error("Audit log error:", error);
    return false;
  }
}

// ==================== API Endpoints ====================

/**
 * قائمة سجلات التدقيق
 */
app.get("/", async (c) => {
  try {
    const page = parseInt(c.req.query("page") || "1");
    const limit = parseInt(c.req.query("limit") || "50");
    const offset = (page - 1) * limit;

    // الفلاتر
    const category = c.req.query("category");
    const severity = c.req.query("severity");
    const eventType = c.req.query("eventType");
    const userId = c.req.query("userId");
    const entityType = c.req.query("entityType");
    const entityId = c.req.query("entityId");
    const dateFrom = c.req.query("dateFrom");
    const dateTo = c.req.query("dateTo");
    const search = c.req.query("search");

    const conditions = [];

    if (category) conditions.push(eq(auditLogs.eventCategory, category));
    if (severity) conditions.push(eq(auditLogs.severity, severity));
    if (eventType) conditions.push(eq(auditLogs.eventType, eventType));
    if (userId) conditions.push(eq(auditLogs.userId, userId));
    if (entityType) conditions.push(eq(auditLogs.entityType, entityType));
    if (entityId) conditions.push(eq(auditLogs.entityId, entityId));
    if (dateFrom) conditions.push(gte(auditLogs.createdAt, new Date(dateFrom)));
    if (dateTo) conditions.push(lte(auditLogs.createdAt, new Date(dateTo)));
    if (search) {
      conditions.push(
        or(
          like(auditLogs.userName, `%${search}%`),
          like(auditLogs.entityName, `%${search}%`),
          like(auditLogs.action, `%${search}%`)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // جلب السجلات
    const logs = await db
      .select({
        id: auditLogs.id,
        eventType: auditLogs.eventType,
        eventCategory: auditLogs.eventCategory,
        severity: auditLogs.severity,
        userId: auditLogs.userId,
        userName: auditLogs.userName,
        userRole: auditLogs.userRole,
        ipAddress: auditLogs.ipAddress,
        entityType: auditLogs.entityType,
        entityId: auditLogs.entityId,
        entityName: auditLogs.entityName,
        action: auditLogs.action,
        module: auditLogs.module,
        createdAt: auditLogs.createdAt,
      })
      .from(auditLogs)
      .where(whereClause)
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit)
      .offset(offset);

    // العدد الإجمالي
    const [totalResult] = await db
      .select({ count: count() })
      .from(auditLogs)
      .where(whereClause);

    return c.json({
      data: logs,
      pagination: {
        page,
        limit,
        total: totalResult?.count || 0,
        totalPages: Math.ceil((totalResult?.count || 0) / limit),
      },
    });
  } catch (error) {
    console.error("Audit logs list error:", error);
    return c.json({ error: "فشل في جلب السجلات" }, 500);
  }
});

/**
 * تفاصيل سجل واحد
 */
app.get("/:id", async (c) => {
  try {
    const { id } = c.req.param();

    const [log] = await db.select().from(auditLogs).where(eq(auditLogs.id, id));

    if (!log) {
      return c.json({ error: "السجل غير موجود" }, 404);
    }

    // تحويل JSON
    const result = {
      ...log,
      oldValue: log.oldValue ? JSON.parse(log.oldValue) : null,
      newValue: log.newValue ? JSON.parse(log.newValue) : null,
      changes: log.changes ? JSON.parse(log.changes) : null,
      metadata: log.metadata ? JSON.parse(log.metadata) : null,
    };

    return c.json(result);
  } catch (error) {
    console.error("Audit log detail error:", error);
    return c.json({ error: "فشل في جلب التفاصيل" }, 500);
  }
});

/**
 * سجل نشاط مستخدم معين
 */
app.get("/user/:userId", async (c) => {
  try {
    const { userId } = c.req.param();
    const limit = parseInt(c.req.query("limit") || "100");

    const logs = await db
      .select({
        id: auditLogs.id,
        eventType: auditLogs.eventType,
        eventCategory: auditLogs.eventCategory,
        severity: auditLogs.severity,
        entityType: auditLogs.entityType,
        entityName: auditLogs.entityName,
        action: auditLogs.action,
        ipAddress: auditLogs.ipAddress,
        createdAt: auditLogs.createdAt,
      })
      .from(auditLogs)
      .where(eq(auditLogs.userId, userId))
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit);

    return c.json(logs);
  } catch (error) {
    console.error("User audit logs error:", error);
    return c.json({ error: "فشل في جلب سجل المستخدم" }, 500);
  }
});

/**
 * سجل كيان معين (منتج، فاتورة، إلخ)
 */
app.get("/entity/:entityType/:entityId", async (c) => {
  try {
    const { entityType, entityId } = c.req.param();

    const logs = await db
      .select()
      .from(auditLogs)
      .where(and(eq(auditLogs.entityType, entityType), eq(auditLogs.entityId, entityId)))
      .orderBy(desc(auditLogs.createdAt));

    return c.json(logs.map((log) => ({
      ...log,
      oldValue: log.oldValue ? JSON.parse(log.oldValue) : null,
      newValue: log.newValue ? JSON.parse(log.newValue) : null,
      changes: log.changes ? JSON.parse(log.changes) : null,
    })));
  } catch (error) {
    console.error("Entity audit logs error:", error);
    return c.json({ error: "فشل في جلب سجل الكيان" }, 500);
  }
});

/**
 * إحصائيات سجل التدقيق
 */
app.get("/stats/summary", async (c) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    // إجمالي اليوم
    const [todayCount] = await db
      .select({ count: count() })
      .from(auditLogs)
      .where(gte(auditLogs.createdAt, today));

    // إجمالي الأسبوع
    const [weekCount] = await db
      .select({ count: count() })
      .from(auditLogs)
      .where(gte(auditLogs.createdAt, weekAgo));

    // حسب الفئة
    const byCategory = await db
      .select({
        category: auditLogs.eventCategory,
        count: count(),
      })
      .from(auditLogs)
      .where(gte(auditLogs.createdAt, weekAgo))
      .groupBy(auditLogs.eventCategory);

    // حسب الخطورة
    const bySeverity = await db
      .select({
        severity: auditLogs.severity,
        count: count(),
      })
      .from(auditLogs)
      .where(gte(auditLogs.createdAt, weekAgo))
      .groupBy(auditLogs.severity);

    // أكثر المستخدمين نشاطاً
    const topUsers = await db
      .select({
        userId: auditLogs.userId,
        userName: auditLogs.userName,
        count: count(),
      })
      .from(auditLogs)
      .where(gte(auditLogs.createdAt, weekAgo))
      .groupBy(auditLogs.userId, auditLogs.userName)
      .orderBy(desc(count()))
      .limit(5);

    // آخر الأحداث الحرجة
    const criticalEvents = await db
      .select({
        id: auditLogs.id,
        eventType: auditLogs.eventType,
        userName: auditLogs.userName,
        entityName: auditLogs.entityName,
        createdAt: auditLogs.createdAt,
      })
      .from(auditLogs)
      .where(eq(auditLogs.severity, "critical"))
      .orderBy(desc(auditLogs.createdAt))
      .limit(10);

    return c.json({
      todayCount: todayCount?.count || 0,
      weekCount: weekCount?.count || 0,
      byCategory,
      bySeverity,
      topUsers,
      criticalEvents,
    });
  } catch (error) {
    console.error("Audit stats error:", error);
    return c.json({ error: "فشل في جلب الإحصائيات" }, 500);
  }
});

/**
 * تقرير النشاط اليومي
 */
app.get("/stats/daily", async (c) => {
  try {
    const daysParam = c.req.query("days") || "30";
    const days = parseInt(daysParam, 10);
    
    // Validate days is a positive integer between 1-365
    if (isNaN(days) || days < 1 || days > 365) {
      return c.json({ error: "يجب أن يكون عدد الأيام رقماً صحيحاً بين 1 و 365" }, 400);
    }

    // Calculate the date cutoff instead of using sql.raw()
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const result = await db.execute(sql`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count,
        COUNT(DISTINCT user_id) as unique_users
      FROM audit_logs
      WHERE created_at >= ${cutoffDate}
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `);

    return c.json(result.rows);
  } catch (error) {
    console.error("Daily stats error:", error);
    return c.json({ error: "فشل في جلب التقرير" }, 500);
  }
});

/**
 * أنواع الأحداث المتاحة
 */
app.get("/types", async (c) => {
  const types = Object.entries(EVENT_TYPES).map(([key, value]) => ({
    type: key,
    ...value,
  }));

  return c.json(types);
});

/**
 * الفئات المتاحة
 */
app.get("/categories", async (c) => {
  const categories = [
    { id: "auth", label: "المصادقة", icon: "🔐" },
    { id: "users", label: "المستخدمين", icon: "👥" },
    { id: "inventory", label: "المخزون", icon: "📦" },
    { id: "purchases", label: "المشتريات", icon: "🛒" },
    { id: "sales", label: "المبيعات", icon: "💰" },
    { id: "finance", label: "المالية", icon: "💵" },
    { id: "maintenance", label: "الصيانة", icon: "🔧" },
    { id: "system", label: "النظام", icon: "⚙️" },
    { id: "security", label: "الأمان", icon: "🛡️" },
  ];

  return c.json(categories);
});

/**
 * تصدير السجلات
 */
app.post("/export", async (c) => {
  try {
    const body = await c.req.json();
    const { dateFrom, dateTo, category, format = "csv" } = body;

    const conditions = [];
    if (dateFrom) conditions.push(gte(auditLogs.createdAt, new Date(dateFrom)));
    if (dateTo) conditions.push(lte(auditLogs.createdAt, new Date(dateTo)));
    if (category) conditions.push(eq(auditLogs.eventCategory, category));

    const logs = await db
      .select()
      .from(auditLogs)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(auditLogs.createdAt))
      .limit(10000);

    if (format === "csv") {
      const headers = ["التاريخ", "النوع", "الفئة", "المستخدم", "الكيان", "العملية", "IP"];
      const rows = logs.map((log) => [
        log.createdAt?.toISOString() || "",
        log.eventType,
        log.eventCategory,
        log.userName || "",
        log.entityName || "",
        log.action || "",
        log.ipAddress || "",
      ]);

      const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
      const base64 = Buffer.from(csv, "utf-8").toString("base64");

      return c.json({
        success: true,
        data: base64,
        filename: `audit_log_${new Date().toISOString().split("T")[0]}.csv`,
        count: logs.length,
      });
    }

    return c.json({ success: true, data: logs, count: logs.length });
  } catch (error) {
    console.error("Export error:", error);
    return c.json({ error: "فشل في التصدير" }, 500);
  }
});

export default app;

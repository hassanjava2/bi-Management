/**
 * API Routes - نظام الإشعارات المتقدم
 */
import { Hono } from "hono";
import {
  db,
  notifications,
  notificationSettings,
  notificationTemplates,
  notificationDeliveryLog,
  notificationSubscriptions,
  scheduledNotifications,
  users,
} from "@bi-management/database";
import { eq, desc, and, or, sql, count, gte, lte, isNull } from "drizzle-orm";
import { authMiddleware } from "../lib/auth.js";
import { nanoid } from "nanoid";

const app = new Hono();

// ==================== أنواع الإشعارات ====================
const NOTIFICATION_TYPES = {
  // المشتريات
  purchase_created: { category: "purchase", title: "وجبة شراء جديدة", priority: "normal" },
  purchase_ready: { category: "purchase", title: "وجبة جاهزة للفحص", priority: "high" },
  purchase_completed: { category: "purchase", title: "اكتمال وجبة الشراء", priority: "normal" },
  
  // المرتجعات
  return_created: { category: "purchase", title: "مرتجع جديد", priority: "normal" },
  return_overdue: { category: "purchase", title: "مرتجع متأخر", priority: "high" },
  return_resolved: { category: "purchase", title: "معالجة مرتجع", priority: "normal" },
  
  // المخزون
  low_stock: { category: "inventory", title: "تنبيه مخزون منخفض", priority: "high" },
  out_of_stock: { category: "inventory", title: "نفاد المخزون", priority: "urgent" },
  
  // الصيانة
  maintenance_created: { category: "maintenance", title: "طلب صيانة جديد", priority: "normal" },
  maintenance_completed: { category: "maintenance", title: "اكتمال الصيانة", priority: "normal" },
  
  // العهد
  custody_assigned: { category: "hr", title: "تسليم عهدة", priority: "normal" },
  custody_returned: { category: "hr", title: "استرداد عهدة", priority: "normal" },
  
  // النظام
  system_alert: { category: "system", title: "تنبيه النظام", priority: "high" },
  backup_completed: { category: "system", title: "اكتمال النسخ الاحتياطي", priority: "low" },
};

/**
 * إنشاء إشعار
 */
async function createNotification(data: {
  type: string;
  recipientId: string;
  title?: string;
  message?: string;
  entityType?: string;
  entityId?: string;
  actionUrl?: string;
  priority?: string;
  metadata?: any;
}) {
  const typeInfo = NOTIFICATION_TYPES[data.type as keyof typeof NOTIFICATION_TYPES] || {};
  
  const id = `notif_${nanoid(12)}`;
  await db.insert(notifications).values({
    id,
    recipientId: data.recipientId,
    type: data.type,
    category: typeInfo.category || "general",
    priority: data.priority || typeInfo.priority || "normal",
    title: data.title || typeInfo.title || "إشعار",
    message: data.message,
    entityType: data.entityType,
    entityId: data.entityId,
    actionUrl: data.actionUrl,
    metadata: data.metadata,
    isRead: 0,
    channels: '["in_app"]',
    createdAt: new Date(),
  });
  
  return id;
}

// ==================== الإشعارات ====================

/**
 * جلب إشعارات المستخدم
 */
app.get("/", async (c) => {
  try {
    const currentUser = c.get("user");
    const category = c.req.query("category");
    const unreadOnly = c.req.query("unreadOnly") === "true";
    const page = parseInt(c.req.query("page") || "1");
    const limit = parseInt(c.req.query("limit") || "20");
    const offset = (page - 1) * limit;

    const conditions = [eq(notifications.recipientId, currentUser.id)];
    if (category) conditions.push(eq(notifications.category, category));
    if (unreadOnly) conditions.push(eq(notifications.isRead, 0));

    const items = await db
      .select()
      .from(notifications)
      .where(and(...conditions))
      .orderBy(desc(notifications.createdAt))
      .limit(limit)
      .offset(offset);

    // عدد غير المقروءة
    const [unreadResult] = await db
      .select({ count: count() })
      .from(notifications)
      .where(
        and(
          eq(notifications.recipientId, currentUser.id),
          eq(notifications.isRead, 0)
        )
      );

    // إحصائيات حسب الفئة
    const categoryStats = await db
      .select({
        category: notifications.category,
        total: count(),
        unread: sql<number>`COUNT(CASE WHEN ${notifications.isRead} = 0 THEN 1 END)`,
      })
      .from(notifications)
      .where(eq(notifications.recipientId, currentUser.id))
      .groupBy(notifications.category);

    return c.json({
      items,
      unreadCount: unreadResult?.count || 0,
      categoryStats,
      pagination: {
        page,
        limit,
      },
    });
  } catch (error) {
    console.error("Get notifications error:", error);
    return c.json({ error: "فشل في جلب الإشعارات" }, 500);
  }
});

/**
 * عدد غير المقروءة
 */
app.get("/unread-count", async (c) => {
  try {
    const currentUser = c.get("user");

    const [result] = await db
      .select({ count: count() })
      .from(notifications)
      .where(
        and(
          eq(notifications.recipientId, currentUser.id),
          eq(notifications.isRead, 0)
        )
      );

    // تقسيم حسب الأولوية
    const byPriority = await db
      .select({
        priority: notifications.priority,
        count: count(),
      })
      .from(notifications)
      .where(
        and(
          eq(notifications.recipientId, currentUser.id),
          eq(notifications.isRead, 0)
        )
      )
      .groupBy(notifications.priority);

    return c.json({
      count: result?.count || 0,
      byPriority,
    });
  } catch (error) {
    console.error("Get unread count error:", error);
    return c.json({ error: "فشل في جلب الإشعارات" }, 500);
  }
});

/**
 * تعليم كمقروء
 */
app.put("/:id/read", async (c) => {
  try {
    const id = c.req.param("id");
    const currentUser = c.get("user");

    await db
      .update(notifications)
      .set({
        isRead: 1,
        readAt: new Date(),
      })
      .where(
        and(
          eq(notifications.id, id),
          eq(notifications.recipientId, currentUser.id)
        )
      );

    return c.json({ success: true });
  } catch (error) {
    console.error("Mark read error:", error);
    return c.json({ error: "فشل في تحديث الإشعار" }, 500);
  }
});

/**
 * تعليم الكل كمقروء
 */
app.put("/read-all", async (c) => {
  try {
    const currentUser = c.get("user");
    const category = c.req.query("category");

    const conditions = [
      eq(notifications.recipientId, currentUser.id),
      eq(notifications.isRead, 0),
    ];
    if (category) conditions.push(eq(notifications.category, category));

    await db
      .update(notifications)
      .set({
        isRead: 1,
        readAt: new Date(),
      })
      .where(and(...conditions));

    return c.json({ success: true });
  } catch (error) {
    console.error("Mark all read error:", error);
    return c.json({ error: "فشل في تحديث الإشعار" }, 500);
  }
});

/**
 * حذف إشعار
 */
app.delete("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const currentUser = c.get("user");

    await db
      .delete(notifications)
      .where(
        and(
          eq(notifications.id, id),
          eq(notifications.recipientId, currentUser.id)
        )
      );

    return c.json({ success: true });
  } catch (error) {
    console.error("Delete notification error:", error);
    return c.json({ error: "فشل في حذف الإشعار" }, 500);
  }
});

/**
 * حذف كل الإشعارات
 */
app.delete("/", async (c) => {
  try {
    const currentUser = c.get("user");
    const readOnly = c.req.query("readOnly") === "true";

    const conditions = [eq(notifications.recipientId, currentUser.id)];
    if (readOnly) conditions.push(eq(notifications.isRead, 1));

    await db.delete(notifications).where(and(...conditions));

    return c.json({ success: true });
  } catch (error) {
    console.error("Clear notifications error:", error);
    return c.json({ error: "فشل في حذف الإشعار" }, 500);
  }
});

// ==================== إرسال الإشعارات ====================

/**
 * إرسال إشعار لمستخدم
 */
app.post("/send", async (c) => {
  try {
    const currentUser = c.get("user");
    const body = await c.req.json();
    const { recipientId, type, title, message, entityType, entityId, actionUrl, priority } = body;

    if (!recipientId || !type) {
      return c.json({ error: "بيانات غير مكتملة" }, 400);
    }

    const notificationId = await createNotification({
      type,
      recipientId,
      title,
      message,
      entityType,
      entityId,
      actionUrl,
      priority,
      metadata: { sentBy: currentUser.id },
    });

    return c.json({ success: true, notificationId });
  } catch (error) {
    console.error("Send notification error:", error);
    return c.json({ error: "فشل في إرسال الإشعار" }, 500);
  }
});

/**
 * إرسال إشعار لعدة مستخدمين
 */
app.post("/send-bulk", async (c) => {
  try {
    const currentUser = c.get("user");
    const body = await c.req.json();
    const { recipientIds, type, title, message, entityType, entityId, actionUrl, priority } = body;

    if (!recipientIds || recipientIds.length === 0 || !type) {
      return c.json({ error: "بيانات غير مكتملة" }, 400);
    }

    const notificationIds: string[] = [];
    for (const recipientId of recipientIds) {
      const id = await createNotification({
        type,
        recipientId,
        title,
        message,
        entityType,
        entityId,
        actionUrl,
        priority,
        metadata: { sentBy: currentUser.id },
      });
      notificationIds.push(id);
    }

    return c.json({ success: true, count: notificationIds.length });
  } catch (error) {
    console.error("Send bulk notifications error:", error);
    return c.json({ error: "فشل في إرسال الإشعار" }, 500);
  }
});

/**
 * إرسال إشعار لكل المستخدمين
 */
app.post("/broadcast", async (c) => {
  try {
    const currentUser = c.get("user");
    const body = await c.req.json();
    const { type, title, message, priority } = body;

    // جلب كل المستخدمين النشطين
    const activeUsers = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.isActive, true));

    let count = 0;
    for (const user of activeUsers) {
      await createNotification({
        type: type || "system_alert",
        recipientId: user.userId,
        title,
        message,
        priority: priority || "normal",
        metadata: { broadcast: true, sentBy: currentUser.id },
      });
      count++;
    }

    return c.json({ success: true, count });
  } catch (error) {
    console.error("Broadcast error:", error);
    return c.json({ error: "فشل في إرسال الإشعار" }, 500);
  }
});

// ==================== الإعدادات ====================

/**
 * جلب إعدادات الإشعارات
 */
app.get("/settings", async (c) => {
  try {
    const currentUser = c.get("user");

    const settings = await db
      .select()
      .from(notificationSettings)
      .where(eq(notificationSettings.userId, currentUser.id));

    // أنواع الإشعارات المتاحة
    const availableTypes = Object.entries(NOTIFICATION_TYPES).map(([key, value]) => ({
      type: key,
      ...value,
    }));

    return c.json({ settings, availableTypes });
  } catch (error) {
    console.error("Get settings error:", error);
    return c.json({ error: "فشل في جلب الإشعارات" }, 500);
  }
});

/**
 * تحديث إعدادات إشعار
 */
app.put("/settings/:type", async (c) => {
  try {
    const currentUser = c.get("user");
    const notificationType = c.req.param("type");
    const body = await c.req.json();

    // التحقق من وجود الإعداد
    const [existing] = await db
      .select()
      .from(notificationSettings)
      .where(
        and(
          eq(notificationSettings.userId, currentUser.id),
          eq(notificationSettings.notificationType, notificationType)
        )
      );

    if (existing) {
      await db
        .update(notificationSettings)
        .set({
          inApp: body.inApp ?? existing.inApp,
          push: body.push ?? existing.push,
          email: body.email ?? existing.email,
          sms: body.sms ?? existing.sms,
          whatsapp: body.whatsapp ?? existing.whatsapp,
          quietHoursStart: body.quietHoursStart,
          quietHoursEnd: body.quietHoursEnd,
        })
        .where(eq(notificationSettings.id, existing.id));
    } else {
      await db.insert(notificationSettings).values({
        id: `ns_${nanoid(12)}`,
        userId: currentUser.id,
        notificationType,
        inApp: body.inApp ?? 1,
        push: body.push ?? 1,
        email: body.email ?? 0,
        sms: body.sms ?? 0,
        whatsapp: body.whatsapp ?? 0,
        quietHoursStart: body.quietHoursStart,
        quietHoursEnd: body.quietHoursEnd,
      });
    }

    return c.json({ success: true });
  } catch (error) {
    console.error("Update settings error:", error);
    return c.json({ error: "فشل في تحديث الإشعار" }, 500);
  }
});

// ==================== القوالب ====================

/**
 * جلب قوالب الإشعارات
 */
app.get("/templates", async (c) => {
  try {
    const templates = await db
      .select()
      .from(notificationTemplates)
      .where(eq(notificationTemplates.isActive, true))
      .orderBy(notificationTemplates.category);

    return c.json({ templates });
  } catch (error) {
    console.error("Get templates error:", error);
    return c.json({ error: "فشل في جلب الإشعارات" }, 500);
  }
});

/**
 * إنشاء/تحديث قالب
 */
app.post("/templates", async (c) => {
  try {
    const body = await c.req.json();
    const { type, titleTemplate, messageTemplate, category, actionUrlTemplate, defaultPriority, defaultChannels } = body;

    // التحقق من وجود القالب
    const [existing] = await db
      .select()
      .from(notificationTemplates)
      .where(eq(notificationTemplates.type, type));

    if (existing) {
      await db
        .update(notificationTemplates)
        .set({
          titleTemplate,
          messageTemplate,
          category,
          actionUrlTemplate,
          defaultPriority,
          defaultChannels,
          updatedAt: new Date(),
        })
        .where(eq(notificationTemplates.id, existing.id));
      
      return c.json({ success: true, id: existing.id });
    }

    const id = `tmpl_${nanoid(12)}`;
    await db.insert(notificationTemplates).values({
      id,
      type,
      titleTemplate,
      messageTemplate,
      category: category || "general",
      actionUrlTemplate,
      defaultPriority: defaultPriority || "normal",
      defaultChannels: defaultChannels || ["in_app"],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return c.json({ success: true, id });
  } catch (error) {
    console.error("Save template error:", error);
    return c.json({ error: "فشل في إرسال الإشعار" }, 500);
  }
});

// ==================== الإحصائيات ====================

/**
 * إحصائيات الإشعارات
 */
app.get("/stats", async (c) => {
  try {
    const days = parseInt(c.req.query("days") || "30");
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);

    // إجمالي الإشعارات
    const [totalStats] = await db
      .select({
        total: count(),
        read: sql<number>`COUNT(CASE WHEN ${notifications.isRead} = 1 THEN 1 END)`,
        unread: sql<number>`COUNT(CASE WHEN ${notifications.isRead} = 0 THEN 1 END)`,
      })
      .from(notifications)
      .where(gte(notifications.createdAt, fromDate));

    // حسب النوع
    const byType = await db
      .select({
        type: notifications.type,
        count: count(),
      })
      .from(notifications)
      .where(gte(notifications.createdAt, fromDate))
      .groupBy(notifications.type)
      .orderBy(desc(count()))
      .limit(10);

    // حسب الأولوية
    const byPriority = await db
      .select({
        priority: notifications.priority,
        count: count(),
      })
      .from(notifications)
      .where(gte(notifications.createdAt, fromDate))
      .groupBy(notifications.priority);

    // الاتجاه اليومي
    const dailyTrend = await db
      .select({
        date: sql<string>`DATE(${notifications.createdAt})`,
        count: count(),
      })
      .from(notifications)
      .where(gte(notifications.createdAt, fromDate))
      .groupBy(sql`DATE(${notifications.createdAt})`)
      .orderBy(sql`DATE(${notifications.createdAt})`);

    return c.json({
      totalStats,
      byType,
      byPriority,
      dailyTrend,
    });
  } catch (error) {
    console.error("Get stats error:", error);
    return c.json({ error: "فشل في جلب الإشعارات" }, 500);
  }
});

export default app;

/**
 * نظام الأمان - Security API
 * ─────────────────────────────
 * سجلات العمليات، الأحداث الأمنية، التشفير
 */
import { Hono } from "hono";
import { db, auditLogs, users } from "@bi-management/database";
import { eq, desc, sql, and, count, gte, lte } from "drizzle-orm";
import crypto from "crypto";

const app = new Hono();

// ─── سجلات العمليات ───

app.get("/audit-logs", async (c) => {
  try {
    const userId = c.req.query("user_id");
    const action = c.req.query("action");
    const tableName = c.req.query("table_name");
    const fromDate = c.req.query("from_date");
    const toDate = c.req.query("to_date");
    const limit = parseInt(c.req.query("limit") || "50");
    const offset = parseInt(c.req.query("offset") || "0");

    const conditions: any[] = [];
    if (userId) conditions.push(eq(auditLogs.userId, userId));
    if (action) conditions.push(eq(auditLogs.action, action));
    if (tableName) conditions.push(eq(auditLogs.entityType, tableName));

    const query = db
      .select({
        id: auditLogs.id,
        userId: auditLogs.userId,
        userName: users.fullName,
        action: auditLogs.action,
        entityType: auditLogs.entityType,
        entityId: auditLogs.entityId,
        details: auditLogs.details,
        ipAddress: auditLogs.ipAddress,
        createdAt: auditLogs.createdAt,
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit)
      .offset(offset);

    const logs = await query;

    const [totalResult] = await db
      .select({ count: count() })
      .from(auditLogs)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    return c.json({
      success: true,
      data: logs,
      total: totalResult?.count || 0,
    });
  } catch (error) {
    console.error("Security audit-logs error:", error);
    return c.json({ error: "فشل في جلب سجلات العمليات" }, 500);
  }
});

// ─── تاريخ تغييرات record معين ───

app.get("/audit-logs/record/:table/:id", async (c) => {
  try {
    const table = c.req.param("table");
    const recordId = c.req.param("id");

    const history = await db
      .select({
        id: auditLogs.id,
        userId: auditLogs.userId,
        userName: users.fullName,
        action: auditLogs.action,
        details: auditLogs.details,
        createdAt: auditLogs.createdAt,
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id))
      .where(and(eq(auditLogs.entityType, table), eq(auditLogs.entityId, recordId)))
      .orderBy(desc(auditLogs.createdAt))
      .limit(100);

    return c.json({ success: true, data: history });
  } catch (error) {
    console.error("Security record history error:", error);
    return c.json({ error: "فشل في جلب تاريخ التغييرات" }, 500);
  }
});

// ─── الأحداث الأمنية ───

app.get("/events", async (c) => {
  try {
    const limit = parseInt(c.req.query("limit") || "50");
    const offset = parseInt(c.req.query("offset") || "0");

    // Filter audit logs for security-related actions
    const events = await db
      .select({
        id: auditLogs.id,
        userId: auditLogs.userId,
        userName: users.fullName,
        action: auditLogs.action,
        entityType: auditLogs.entityType,
        details: auditLogs.details,
        ipAddress: auditLogs.ipAddress,
        createdAt: auditLogs.createdAt,
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id))
      .where(
        sql`${auditLogs.action} IN ('LOGIN_FAILED', 'UNAUTHORIZED_ACCESS', 'PERMISSION_DENIED', 'SUSPICIOUS_ACTIVITY', 'DATA_EXPORT', 'BULK_DELETE', 'SETTINGS_CHANGED', 'ROLE_CHANGED', 'PASSWORD_CHANGED')`
      )
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit)
      .offset(offset);

    return c.json({ success: true, data: events });
  } catch (error) {
    console.error("Security events error:", error);
    return c.json({ error: "فشل في جلب الأحداث الأمنية" }, 500);
  }
});

// ─── إحصائيات الأمان ───

app.get("/stats", async (c) => {
  try {
    const days = parseInt(c.req.query("days") || "7");
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [totalLogs] = await db
      .select({ count: count() })
      .from(auditLogs);

    const [recentLogs] = await db
      .select({ count: count() })
      .from(auditLogs)
      .where(gte(auditLogs.createdAt, startDate));

    // Actions breakdown
    const actionBreakdown = await db
      .select({
        action: auditLogs.action,
        count: count(),
      })
      .from(auditLogs)
      .where(gte(auditLogs.createdAt, startDate))
      .groupBy(auditLogs.action)
      .orderBy(desc(count()))
      .limit(10);

    // Most active users
    const activeUsers = await db
      .select({
        userId: auditLogs.userId,
        userName: users.fullName,
        count: count(),
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id))
      .where(gte(auditLogs.createdAt, startDate))
      .groupBy(auditLogs.userId, users.fullName)
      .orderBy(desc(count()))
      .limit(5);

    return c.json({
      success: true,
      data: {
        totalLogs: totalLogs?.count || 0,
        recentLogs: recentLogs?.count || 0,
        days,
        actionBreakdown,
        activeUsers,
      },
    });
  } catch (error) {
    console.error("Security stats error:", error);
    return c.json({ error: "فشل في جلب إحصائيات الأمان" }, 500);
  }
});

// ─── تشفير نص (للاختبار) ───

app.post("/encrypt", async (c) => {
  try {
    const body = await c.req.json();
    const { text } = body;

    if (!text) {
      return c.json({ error: "text مطلوب" }, 400);
    }

    const algorithm = "aes-256-cbc";
    const key = crypto.scryptSync(process.env.JWT_SECRET || "dev-key", "salt", 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");

    return c.json({
      success: true,
      data: {
        encrypted: iv.toString("hex") + ":" + encrypted,
        note: "هذا للاختبار فقط",
      },
    });
  } catch (error) {
    console.error("Security encrypt error:", error);
    return c.json({ error: "فشل في التشفير" }, 500);
  }
});

// ─── فك تشفير نص (للاختبار) ───

app.post("/decrypt", async (c) => {
  try {
    const body = await c.req.json();
    const { encrypted } = body;

    if (!encrypted) {
      return c.json({ error: "encrypted مطلوب" }, 400);
    }

    const algorithm = "aes-256-cbc";
    const key = crypto.scryptSync(process.env.JWT_SECRET || "dev-key", "salt", 32);
    const [ivHex, encryptedText] = encrypted.split(":");
    const iv = Buffer.from(ivHex, "hex");
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encryptedText, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return c.json({
      success: true,
      data: { decrypted },
    });
  } catch (error) {
    console.error("Security decrypt error:", error);
    return c.json({ error: "فشل في فك التشفير" }, 500);
  }
});

// ─── توليد مفتاح جديد ───

app.post("/generate-key", async (c) => {
  try {
    const body = await c.req.json();
    const bytes = parseInt(body.bytes || "32");

    const key = crypto.randomBytes(bytes).toString("hex");

    return c.json({
      success: true,
      data: {
        key,
        bytes,
        warning: "احتفظ بهذا المفتاح في مكان آمن!",
      },
    });
  } catch (error) {
    console.error("Security generate-key error:", error);
    return c.json({ error: "فشل في توليد المفتاح" }, 500);
  }
});

// ─── نشاط مستخدم معين ───

app.get("/user/:id/activity", async (c) => {
  try {
    const userId = c.req.param("id");

    const logs = await db
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        entityType: auditLogs.entityType,
        entityId: auditLogs.entityId,
        details: auditLogs.details,
        ipAddress: auditLogs.ipAddress,
        createdAt: auditLogs.createdAt,
      })
      .from(auditLogs)
      .where(eq(auditLogs.userId, userId))
      .orderBy(desc(auditLogs.createdAt))
      .limit(100);

    return c.json({
      success: true,
      data: {
        audit_logs: logs,
        total: logs.length,
      },
    });
  } catch (error) {
    console.error("Security user activity error:", error);
    return c.json({ error: "فشل في جلب نشاط المستخدم" }, 500);
  }
});

// ─── تنظيف السجلات القديمة ───

app.post("/cleanup", async (c) => {
  try {
    const body = await c.req.json();
    const daysToKeep = parseInt(body.days_to_keep || "90");

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysToKeep);

    const deleted = await db
      .delete(auditLogs)
      .where(lte(auditLogs.createdAt, cutoff));

    return c.json({
      success: true,
      message: `تم تنظيف السجلات الأقدم من ${daysToKeep} يوم`,
    });
  } catch (error) {
    console.error("Security cleanup error:", error);
    return c.json({ error: "فشل في تنظيف السجلات" }, 500);
  }
});

export default app;

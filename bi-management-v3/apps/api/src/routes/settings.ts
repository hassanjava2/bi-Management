/**
 * نظام الإعدادات - API Routes
 * ─────────────────────────────
 */
import { Hono } from "hono";
import {
  db,
  systemSettings,
  companyInfo,
  invoiceSettings,
  warrantySettings,
  notificationSettings,
  backupSettings,
  backupLogs,
} from "@bi-management/database";
import { eq, and } from "drizzle-orm";
import { authMiddleware } from "../lib/auth.js";
import { requireRole } from "../lib/rbac.js";
import { validateBody } from "../lib/validation.js";
import { updateCompanySchema, updateInvoiceSettingsSchema } from "../validators/settings.js";
import { nanoid } from "nanoid";

const app = new Hono();

const adminRoles = ["super_admin", "owner", "admin"];

app.use("*", authMiddleware);

// ═══════════════════════════════════════════════════════════
// معلومات الشركة
// ═══════════════════════════════════════════════════════════

app.get("/company", async (c) => {
  try {
    const [company] = await db.select().from(companyInfo).limit(1);
    return c.json({ company: company || null });
  } catch (error) {
    console.error("Get company error:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.put("/company", requireRole(...adminRoles), validateBody(updateCompanySchema), async (c) => {
  try {
    const user = c.get("user");
    const body = c.get("validatedBody") as Record<string, unknown>;

    const [existing] = await db.select().from(companyInfo).limit(1);

    const data = {
      ...body,
      updatedBy: user.userId,
      updatedAt: new Date(),
    };

    if (existing) {
      await db.update(companyInfo).set(data).where(eq(companyInfo.id, existing.id));
    } else {
      await db.insert(companyInfo).values({ id: "main", ...data });
    }

    return c.json({ success: true });
  } catch (error) {
    console.error("Update company error:", error);
    return c.json({ error: "فشل في حفظ البيانات" }, 500);
  }
});

// ═══════════════════════════════════════════════════════════
// إعدادات الفاتورة
// ═══════════════════════════════════════════════════════════

app.get("/invoice", async (c) => {
  try {
    const [settings] = await db.select().from(invoiceSettings).limit(1);
    return c.json({ settings: settings || getDefaultInvoiceSettings() });
  } catch (error) {
    console.error("Get invoice settings error:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.put("/invoice", requireRole(...adminRoles), validateBody(updateInvoiceSettingsSchema), async (c) => {
  try {
    const user = c.get("user");
    const body = c.get("validatedBody") as Record<string, unknown>;

    const [existing] = await db.select().from(invoiceSettings).limit(1);

    const data = {
      ...body,
      updatedBy: user.userId,
      updatedAt: new Date(),
    };

    if (existing) {
      await db.update(invoiceSettings).set(data).where(eq(invoiceSettings.id, existing.id));
    } else {
      await db.insert(invoiceSettings).values({ id: "main", ...data });
    }

    return c.json({ success: true });
  } catch (error) {
    console.error("Update invoice settings error:", error);
    return c.json({ error: "فشل في حفظ البيانات" }, 500);
  }
});

function getDefaultInvoiceSettings() {
  return {
    invoicePrefix: "INV",
    invoiceNumberLength: 6,
    invoiceStartNumber: 1,
    taxEnabled: 0,
    taxRate: 0,
    showLogo: 1,
    showQrCode: 1,
    paperSize: "A4",
    currency: "IQD",
    currencySymbol: "د.ع",
    currencyPosition: "after",
  };
}

// ═══════════════════════════════════════════════════════════
// إعدادات الضمان
// ═══════════════════════════════════════════════════════════

app.get("/warranty", async (c) => {
  try {
    const [settings] = await db.select().from(warrantySettings).limit(1);
    return c.json({ settings: settings || getDefaultWarrantySettings() });
  } catch (error) {
    console.error("Get warranty settings error:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.put("/warranty", requireRole(...adminRoles), async (c) => {
  try {
    const user = c.get("user");
    const body = await c.req.json();

    const [existing] = await db.select().from(warrantySettings).limit(1);

    const data = {
      ...body,
      updatedBy: user.userId,
      updatedAt: new Date(),
    };

    if (existing) {
      await db.update(warrantySettings).set(data).where(eq(warrantySettings.id, existing.id));
    } else {
      await db.insert(warrantySettings).values({ id: "main", ...data });
    }

    return c.json({ success: true });
  } catch (error) {
    console.error("Update warranty settings error:", error);
    return c.json({ error: "فشل في حفظ البيانات" }, 500);
  }
});

function getDefaultWarrantySettings() {
  return {
    defaultWarrantyMonths: 12,
    extendedWarrantyMonths: 24,
    notifyBeforeExpiry: 30,
  };
}

// ═══════════════════════════════════════════════════════════
// إعدادات الإشعارات
// ═══════════════════════════════════════════════════════════

app.get("/notifications", async (c) => {
  try {
    const [settings] = await db.select().from(notificationSettings).limit(1);
    // Hide sensitive data
    if (settings) {
      settings.smtpPassword = settings.smtpPassword ? "••••••••" : "";
      settings.smsApiKey = settings.smsApiKey ? "••••••••" : "";
      settings.whatsappApiKey = settings.whatsappApiKey ? "••••••••" : "";
      settings.telegramBotToken = settings.telegramBotToken ? "••••••••" : "";
    }
    return c.json({ settings: settings || {} });
  } catch (error) {
    console.error("Get notification settings error:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.put("/notifications", requireRole(...adminRoles), async (c) => {
  try {
    const user = c.get("user");
    const body = await c.req.json();

    const [existing] = await db.select().from(notificationSettings).limit(1);

    // Don't overwrite passwords if they're masked
    if (body.smtpPassword === "••••••••") delete body.smtpPassword;
    if (body.smsApiKey === "••••••••") delete body.smsApiKey;
    if (body.whatsappApiKey === "••••••••") delete body.whatsappApiKey;
    if (body.telegramBotToken === "••••••••") delete body.telegramBotToken;

    const data = {
      ...body,
      updatedBy: user.userId,
      updatedAt: new Date(),
    };

    if (existing) {
      await db.update(notificationSettings).set(data).where(eq(notificationSettings.id, existing.id));
    } else {
      await db.insert(notificationSettings).values({ id: "main", ...data });
    }

    return c.json({ success: true });
  } catch (error) {
    console.error("Update notification settings error:", error);
    return c.json({ error: "فشل في حفظ البيانات" }, 500);
  }
});

// ═══════════════════════════════════════════════════════════
// إعدادات النسخ الاحتياطي
// ═══════════════════════════════════════════════════════════

app.get("/backup", async (c) => {
  try {
    const [settings] = await db.select().from(backupSettings).limit(1);
    // Hide sensitive data
    if (settings) {
      settings.cloudAccessKey = settings.cloudAccessKey ? "••••••••" : "";
      settings.cloudSecretKey = settings.cloudSecretKey ? "••••••••" : "";
    }
    return c.json({ settings: settings || getDefaultBackupSettings() });
  } catch (error) {
    console.error("Get backup settings error:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.put("/backup", requireRole(...adminRoles), async (c) => {
  try {
    const user = c.get("user");
    const body = await c.req.json();

    const [existing] = await db.select().from(backupSettings).limit(1);

    // Don't overwrite secrets if masked
    if (body.cloudAccessKey === "••••••••") delete body.cloudAccessKey;
    if (body.cloudSecretKey === "••••••••") delete body.cloudSecretKey;

    const data = {
      ...body,
      updatedBy: user.userId,
      updatedAt: new Date(),
    };

    if (existing) {
      await db.update(backupSettings).set(data).where(eq(backupSettings.id, existing.id));
    } else {
      await db.insert(backupSettings).values({ id: "main", ...data });
    }

    return c.json({ success: true });
  } catch (error) {
    console.error("Update backup settings error:", error);
    return c.json({ error: "فشل في حفظ البيانات" }, 500);
  }
});

function getDefaultBackupSettings() {
  return {
    autoBackupEnabled: 1,
    backupFrequency: "daily",
    backupTime: "03:00",
    backupRetentionDays: 30,
    backupLocation: "local",
  };
}

// سجل النسخ الاحتياطية
app.get("/backup/logs", async (c) => {
  try {
    const logs = await db
      .select()
      .from(backupLogs)
      .orderBy(backupLogs.createdAt)
      .limit(50);
    return c.json({ logs });
  } catch (error) {
    console.error("Get backup logs error:", error);
    return c.json({ error: "فشل في جلب السجلات" }, 500);
  }
});

// إنشاء نسخة احتياطية يدوية
app.post("/backup/create", requireRole(...adminRoles), async (c) => {
  try {
    const user = c.get("user");
    const now = new Date();
    const fileName = `backup_${now.toISOString().replace(/[:.]/g, "-")}.sql`;

    const logId = `bkp_${nanoid(12)}`;
    await db.insert(backupLogs).values({
      id: logId,
      fileName,
      type: "full",
      status: "pending",
      initiatedBy: user.userId,
      createdAt: now,
    });

    // In production, trigger actual backup process here
    // For now, simulate completion
    setTimeout(async () => {
      await db
        .update(backupLogs)
        .set({
          status: "completed",
          startedAt: now,
          completedAt: new Date(),
          fileSize: "~50MB",
          location: "local",
        })
        .where(eq(backupLogs.id, logId));

      await db
        .update(backupSettings)
        .set({
          lastBackupAt: new Date(),
          lastBackupSize: "~50MB",
          lastBackupStatus: "completed",
        })
        .where(eq(backupSettings.id, "main"));
    }, 2000);

    return c.json({ success: true, logId, fileName });
  } catch (error) {
    console.error("Create backup error:", error);
    return c.json({ error: "فشل في إنشاء النسخة الاحتياطية" }, 500);
  }
});

// ═══════════════════════════════════════════════════════════
// إعدادات عامة (key-value)
// ═══════════════════════════════════════════════════════════

app.get("/general", async (c) => {
  try {
    const category = c.req.query("category");
    let query = db.select().from(systemSettings);

    if (category) {
      query = query.where(eq(systemSettings.category, category)) as typeof query;
    }

    const settings = await query;
    return c.json({ settings });
  } catch (error) {
    console.error("Get general settings error:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.put("/general/:key", requireRole(...adminRoles), async (c) => {
  try {
    const user = c.get("user");
    const key = c.req.param("key");
    const body = await c.req.json();

    const [existing] = await db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.key, key));

    const data = {
      value: body.value,
      valueJson: body.valueJson,
      updatedBy: user.userId,
      updatedAt: new Date(),
    };

    if (existing) {
      await db.update(systemSettings).set(data).where(eq(systemSettings.key, key));
    } else {
      await db.insert(systemSettings).values({
        id: `set_${nanoid(12)}`,
        category: body.category || "general",
        key,
        ...data,
        valueType: body.valueType || "string",
        label: body.label,
        labelAr: body.labelAr,
      });
    }

    return c.json({ success: true });
  } catch (error) {
    console.error("Update setting error:", error);
    return c.json({ error: "فشل في حفظ الإعداد" }, 500);
  }
});

// ═══════════════════════════════════════════════════════════
// جلب جميع الإعدادات دفعة واحدة
// ═══════════════════════════════════════════════════════════

app.get("/all", async (c) => {
  try {
    const [company] = await db.select().from(companyInfo).limit(1);
    const [invoice] = await db.select().from(invoiceSettings).limit(1);
    const [warranty] = await db.select().from(warrantySettings).limit(1);
    const [notifications] = await db.select().from(notificationSettings).limit(1);
    const [backup] = await db.select().from(backupSettings).limit(1);

    // Hide sensitive data
    if (notifications) {
      notifications.smtpPassword = notifications.smtpPassword ? "••••••••" : "";
      notifications.smsApiKey = notifications.smsApiKey ? "••••••••" : "";
    }
    if (backup) {
      backup.cloudAccessKey = backup.cloudAccessKey ? "••••••••" : "";
      backup.cloudSecretKey = backup.cloudSecretKey ? "••••••••" : "";
    }

    return c.json({
      company: company || {},
      invoice: invoice || getDefaultInvoiceSettings(),
      warranty: warranty || getDefaultWarrantySettings(),
      notifications: notifications || {},
      backup: backup || getDefaultBackupSettings(),
    });
  } catch (error) {
    console.error("Get all settings error:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

export default app;

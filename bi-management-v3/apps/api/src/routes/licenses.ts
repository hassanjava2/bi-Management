/**
 * API routes للرخص والتصاريح
 */
import { Hono } from "hono";
import {
  db,
  licenses,
  licenseApplications,
  licenseRenewals,
  licenseAlerts,
  licenseComplianceChecks,
  licenseHistory,
} from "@bi-management/database";
import { eq, desc, and, or, ilike, gte, lte, count, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { authMiddleware } from "../lib/auth.js";

const app = new Hono();

// توليد الأرقام
function generateNumber(prefix: string) {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
  return `${prefix}-${year}-${random}`;
}

// إحصائيات الرخص
app.get("/stats", async (c) => {
  try {
    const today = new Date();
    const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

    const [licenseStats] = await db.select({
      total: count(),
      active: count(sql`CASE WHEN status = 'active' THEN 1 END`),
      expiringSoon: count(sql`CASE WHEN status = 'active' AND expiry_date <= ${thirtyDaysFromNow} AND expiry_date > ${today} THEN 1 END`),
      expired: count(sql`CASE WHEN status = 'expired' OR expiry_date < ${today} THEN 1 END`),
      pending: count(sql`CASE WHEN status = 'pending' THEN 1 END`),
    }).from(licenses);

    const [applicationStats] = await db.select({
      total: count(),
      pending: count(sql`CASE WHEN status = 'submitted' OR status = 'under_review' THEN 1 END`),
    }).from(licenseApplications);

    const [alertStats] = await db.select({
      unread: count(sql`CASE WHEN is_read = false THEN 1 END`),
    }).from(licenseAlerts);

    return c.json({
      licenses: {
        total: licenseStats.total,
        active: licenseStats.active || 0,
        expiringSoon: licenseStats.expiringSoon || 0,
        expired: licenseStats.expired || 0,
        pending: licenseStats.pending || 0,
      },
      applications: {
        total: applicationStats.total,
        pending: applicationStats.pending || 0,
      },
      alerts: {
        unread: alertStats.unread || 0,
      },
    });
  } catch (error) {
    console.error("Error fetching license stats:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

// قائمة الرخص
app.get("/", async (c) => {
  try {
    const { status, type, search, expiring } = c.req.query();

    let query = db.select().from(licenses);
    const conditions = [];

    if (status) conditions.push(eq(licenses.status, status));
    if (type) conditions.push(eq(licenses.licenseType, type));
    if (search) {
      conditions.push(
        or(
          ilike(licenses.name, `%${search}%`),
          ilike(licenses.licenseNumber, `%${search}%`),
          ilike(licenses.issuingAuthority, `%${search}%`)
        )
      );
    }
    if (expiring === "true") {
      const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      conditions.push(
        and(
          eq(licenses.status, "active"),
          lte(licenses.expiryDate, thirtyDaysFromNow)
        )
      );
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    const items = await query.orderBy(licenses.expiryDate).limit(100);
    return c.json(items);
  } catch (error) {
    console.error("Error fetching licenses:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

// الرخص التي ستنتهي قريباً
app.get("/expiring", async (c) => {
  try {
    const { days = "30" } = c.req.query();
    const daysNum = parseInt(days);
    const futureDate = new Date(Date.now() + daysNum * 24 * 60 * 60 * 1000);

    const items = await db.select().from(licenses)
      .where(and(
        eq(licenses.status, "active"),
        lte(licenses.expiryDate, futureDate),
        gte(licenses.expiryDate, new Date())
      ))
      .orderBy(licenses.expiryDate);

    return c.json(items);
  } catch (error) {
    return c.json({ error: "فشل" }, 500);
  }
});

// إنشاء رخصة
app.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const id = `lic_${nanoid(12)}`;
    const licenseNumber = generateNumber("LIC");

    await db.insert(licenses).values({
      id,
      licenseNumber,
      name: body.name,
      description: body.description || null,
      licenseType: body.licenseType || "commercial",
      category: body.category || "general",
      issuingAuthority: body.issuingAuthority,
      authorityContact: body.authorityContact || null,
      authorityPhone: body.authorityPhone || null,
      authorityEmail: body.authorityEmail || null,
      authorityWebsite: body.authorityWebsite || null,
      externalLicenseNumber: body.externalLicenseNumber || null,
      issueDate: new Date(body.issueDate),
      expiryDate: new Date(body.expiryDate),
      effectiveDate: body.effectiveDate ? new Date(body.effectiveDate) : null,
      licenseFee: body.licenseFee || null,
      renewalFee: body.renewalFee || null,
      currency: body.currency || "IQD",
      status: "active",
      scope: body.scope || "organization",
      applicableBranchIds: body.applicableBranchIds || null,
      applicableDepartmentIds: body.applicableDepartmentIds || null,
      responsibleUserId: body.responsibleUserId || null,
      responsibleDepartmentId: body.responsibleDepartmentId || null,
      renewalPeriodMonths: body.renewalPeriodMonths || 12,
      autoRenewal: body.autoRenewal || false,
      renewalReminderDays: body.renewalReminderDays || 60,
      requirements: body.requirements || null,
      conditions: body.conditions || null,
      attachments: body.attachments || null,
      notes: body.notes || null,
      tags: body.tags || null,
      createdBy: body.createdBy || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // تسجيل في التاريخ
    await db.insert(licenseHistory).values({
      id: `lh_${nanoid(12)}`,
      licenseId: id,
      action: "created",
      toStatus: "active",
      details: `تم إنشاء الرخصة ${licenseNumber}`,
      performedBy: body.createdBy || null,
      performedAt: new Date(),
    });

    // إنشاء تنبيه للانتهاء
    const expiryDate = new Date(body.expiryDate);
    const reminderDays = body.renewalReminderDays || 60;
    const alertDate = new Date(expiryDate.getTime() - reminderDays * 24 * 60 * 60 * 1000);

    await db.insert(licenseAlerts).values({
      id: `la_${nanoid(12)}`,
      licenseId: id,
      alertType: "expiring_soon",
      alertDate,
      message: `الرخصة ${body.name} ستنتهي في ${expiryDate.toLocaleDateString("ar-IQ")}`,
      severity: "high",
      createdAt: new Date(),
    });

    return c.json({ id, licenseNumber }, 201);
  } catch (error) {
    console.error("Error in licenses:", error);
    return c.json({ error: "فشل" }, 500);
  }
});

// تفاصيل رخصة
app.get("/:id", async (c) => {
  try {
    const { id } = c.req.param();
    const [license] = await db.select().from(licenses).where(eq(licenses.id, id));
    if (!license) return c.json({ error: "غير موجود" }, 404);

    const renewals = await db.select().from(licenseRenewals)
      .where(eq(licenseRenewals.licenseId, id))
      .orderBy(desc(licenseRenewals.renewalDate));

    const history = await db.select().from(licenseHistory)
      .where(eq(licenseHistory.licenseId, id))
      .orderBy(desc(licenseHistory.performedAt));

    const complianceChecks = await db.select().from(licenseComplianceChecks)
      .where(eq(licenseComplianceChecks.licenseId, id))
      .orderBy(desc(licenseComplianceChecks.checkDate));

    const alerts = await db.select().from(licenseAlerts)
      .where(eq(licenseAlerts.licenseId, id))
      .orderBy(desc(licenseAlerts.alertDate));

    return c.json({
      ...license,
      renewals,
      history,
      complianceChecks,
      alerts,
    });
  } catch (error) {
    return c.json({ error: "فشل" }, 500);
  }
});

// تجديد الرخصة
app.post("/:id/renew", async (c) => {
  try {
    const { id } = c.req.param();
    const body = await c.req.json();

    const [license] = await db.select().from(licenses).where(eq(licenses.id, id));
    if (!license) return c.json({ error: "غير موجود" }, 404);

    const renewalId = `lr_${nanoid(12)}`;
    const newExpiryDate = new Date(body.newExpiryDate);

    // تسجيل التجديد
    await db.insert(licenseRenewals).values({
      id: renewalId,
      licenseId: id,
      renewalNumber: generateNumber("REN"),
      previousExpiryDate: license.expiryDate!,
      newExpiryDate,
      renewalDate: new Date(),
      renewalFee: body.renewalFee || license.renewalFee || null,
      feesPaid: body.feesPaid || false,
      paymentDate: body.paymentDate ? new Date(body.paymentDate) : null,
      paymentReference: body.paymentReference || null,
      status: "completed",
      processedBy: body.processedBy || null,
      notes: body.notes || null,
      createdAt: new Date(),
    });

    // تحديث الرخصة
    await db.update(licenses).set({
      expiryDate: newExpiryDate,
      lastRenewalDate: new Date(),
      renewalCount: (license.renewalCount || 0) + 1,
      status: "active",
      updatedAt: new Date(),
    }).where(eq(licenses.id, id));

    // تسجيل في التاريخ
    await db.insert(licenseHistory).values({
      id: `lh_${nanoid(12)}`,
      licenseId: id,
      action: "renewed",
      details: `تم تجديد الرخصة حتى ${newExpiryDate.toLocaleDateString("ar-IQ")}`,
      performedBy: body.processedBy || null,
      performedAt: new Date(),
    });

    return c.json({ renewalId, newExpiryDate });
  } catch (error) {
    console.error("Error in licenses:", error);
    return c.json({ error: "فشل" }, 500);
  }
});

// تعليق الرخصة
app.patch("/:id/suspend", async (c) => {
  try {
    const { id } = c.req.param();
    const { userId, reason } = await c.req.json();

    await db.update(licenses).set({
      status: "suspended",
      updatedAt: new Date(),
    }).where(eq(licenses.id, id));

    await db.insert(licenseHistory).values({
      id: `lh_${nanoid(12)}`,
      licenseId: id,
      action: "suspended",
      fromStatus: "active",
      toStatus: "suspended",
      details: reason || "تم تعليق الرخصة",
      performedBy: userId || null,
      performedAt: new Date(),
    });

    return c.json({ success: true });
  } catch (error) {
    console.error("Error in licenses:", error);
    return c.json({ error: "فشل" }, 500);
  }
});

// إعادة تفعيل الرخصة
app.patch("/:id/reactivate", async (c) => {
  try {
    const { id } = c.req.param();
    const { userId } = await c.req.json();

    await db.update(licenses).set({
      status: "active",
      updatedAt: new Date(),
    }).where(eq(licenses.id, id));

    await db.insert(licenseHistory).values({
      id: `lh_${nanoid(12)}`,
      licenseId: id,
      action: "reactivated",
      fromStatus: "suspended",
      toStatus: "active",
      details: "تم إعادة تفعيل الرخصة",
      performedBy: userId || null,
      performedAt: new Date(),
    });

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: "فشل" }, 500);
  }
});

// ====== طلبات الرخص ======

app.get("/applications", async (c) => {
  try {
    const { status, type } = c.req.query();

    let query = db.select().from(licenseApplications);
    const conditions = [];

    if (status) conditions.push(eq(licenseApplications.status, status));
    if (type) conditions.push(eq(licenseApplications.applicationType, type));

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    const items = await query.orderBy(desc(licenseApplications.applicationDate)).limit(50);
    return c.json(items);
  } catch (error) {
    console.error("Error in licenses:", error);
    return c.json({ error: "فشل" }, 500);
  }
});

app.post("/applications", async (c) => {
  try {
    const body = await c.req.json();
    const id = `la_${nanoid(12)}`;
    const applicationNumber = generateNumber("APP");

    await db.insert(licenseApplications).values({
      id,
      applicationNumber,
      licenseId: body.licenseId || null,
      applicationType: body.applicationType || "new",
      licenseType: body.licenseType || null,
      title: body.title,
      description: body.description || null,
      issuingAuthority: body.issuingAuthority || null,
      applicationDate: new Date(),
      expectedIssueDate: body.expectedIssueDate ? new Date(body.expectedIssueDate) : null,
      status: "draft",
      submittedDocuments: body.submittedDocuments || null,
      applicationFee: body.applicationFee || null,
      applicantId: body.applicantId || null,
      applicantDepartmentId: body.applicantDepartmentId || null,
      branchId: body.branchId || null,
      notes: body.notes || null,
      createdBy: body.createdBy || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return c.json({ id, applicationNumber }, 201);
  } catch (error) {
    console.error("Error creating license application:", error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

app.patch("/applications/:id/submit", async (c) => {
  try {
    const { id } = c.req.param();

    await db.update(licenseApplications).set({
      status: "submitted",
      submissionDate: new Date(),
      updatedAt: new Date(),
    }).where(eq(licenseApplications.id, id));

    return c.json({ success: true });
  } catch (error) {
    console.error("Error submitting license application:", error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

app.patch("/applications/:id/approve", async (c) => {
  try {
    const { id } = c.req.param();
    const { userId, notes } = await c.req.json();

    await db.update(licenseApplications).set({
      status: "approved",
      reviewedBy: userId || null,
      reviewedAt: new Date(),
      reviewNotes: notes || null,
      updatedAt: new Date(),
    }).where(eq(licenseApplications.id, id));

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: "فشل" }, 500);
  }
});

// ====== فحوصات الامتثال ======

app.post("/:id/compliance-check", async (c) => {
  try {
    const { id: licenseId } = c.req.param();
    const body = await c.req.json();
    const id = `cc_${nanoid(12)}`;

    await db.insert(licenseComplianceChecks).values({
      id,
      licenseId,
      checkDate: new Date(),
      checkType: body.checkType || "routine",
      conductedBy: body.conductedBy || null,
      checklist: body.checklist || null,
      overallStatus: body.overallStatus || "compliant",
      findings: body.findings || null,
      recommendations: body.recommendations || null,
      correctiveActions: body.correctiveActions || null,
      followUpDate: body.followUpDate ? new Date(body.followUpDate) : null,
      attachments: body.attachments || null,
      createdAt: new Date(),
    });

    return c.json({ id }, 201);
  } catch (error) {
    console.error("Error in licenses:", error);
    return c.json({ error: "فشل" }, 500);
  }
});

// ====== التنبيهات ======

app.get("/alerts", async (c) => {
  try {
    const { unread } = c.req.query();

    let query = db.select().from(licenseAlerts);
    
    if (unread === "true") {
      query = query.where(eq(licenseAlerts.isRead, false)) as any;
    }

    const items = await query.orderBy(desc(licenseAlerts.alertDate)).limit(50);
    return c.json(items);
  } catch (error) {
    console.error("Error in licenses:", error);
    return c.json({ error: "فشل" }, 500);
  }
});

app.patch("/alerts/:id/read", async (c) => {
  try {
    const { id } = c.req.param();
    const { userId } = await c.req.json();

    await db.update(licenseAlerts).set({
      isRead: true,
      readAt: new Date(),
      readBy: userId || null,
    }).where(eq(licenseAlerts.id, id));

    return c.json({ success: true });
  } catch (error) {
    console.error("Error in licenses:", error);
    return c.json({ error: "فشل" }, 500);
  }
});

export default app;

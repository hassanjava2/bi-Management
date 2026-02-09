/**
 * API Routes - نظام التحليلات المتقدمة
 */
import { Hono } from "hono";
import { db, dashboards, dashboardWidgets, scheduledReports, reportLogs, customMetrics, metricValues, smartAlerts } from "@bi-management/database";
import { eq, and, desc, count } from "drizzle-orm";
import { nanoid } from "nanoid";
import { authMiddleware } from "../lib/auth.js";

const app = new Hono();


// لوحات المعلومات
app.get("/dashboards", async (c) => {
  try {
    const { userId, type } = c.req.query();
    const conditions = [eq(dashboards.isActive, true)];
    if (type) conditions.push(eq(dashboards.dashboardType, type));

    const result = await db.select().from(dashboards)
      .where(and(...conditions))
      .orderBy(dashboards.name);

    return c.json(result);
  } catch (error) {
    console.error(error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.get("/dashboards/:id", async (c) => {
  try {
    const { id } = c.req.param();
    const [dashboard] = await db.select().from(dashboards).where(eq(dashboards.id, id));
    if (!dashboard) return c.json({ error: "اللوحة غير موجودة" }, 404);

    const widgets = await db.select().from(dashboardWidgets)
      .where(eq(dashboardWidgets.dashboardId, id))
      .orderBy(dashboardWidgets.sortOrder);

    return c.json({ ...dashboard, widgets });
  } catch (error) {
    console.error(error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.post("/dashboards", async (c) => {
  try {
    const body = await c.req.json();
    const id = `dash_${nanoid(12)}`;

    await db.insert(dashboards).values({
      id,
      name: body.name,
      description: body.description || null,
      dashboardType: body.dashboardType || "custom",
      layout: body.layout || { columns: 12, rows: 8 },
      theme: body.theme || "light",
      refreshInterval: body.refreshInterval || null,
      isPublic: body.isPublic || false,
      departmentId: body.departmentId || null,
      branchId: body.branchId || null,
      createdBy: body.createdBy || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return c.json({ id }, 201);
  } catch (error) {
    console.error(error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

app.post("/dashboards/:id/widgets", async (c) => {
  try {
    const { id: dashboardId } = c.req.param();
    const body = await c.req.json();
    const id = `wdg_${nanoid(12)}`;

    await db.insert(dashboardWidgets).values({
      id, dashboardId,
      title: body.title,
      widgetType: body.widgetType,
      positionX: body.positionX || 0,
      positionY: body.positionY || 0,
      width: body.width || 1,
      height: body.height || 1,
      dataSource: body.dataSource || null,
      dataConfig: body.dataConfig || null,
      chartType: body.chartType || null,
      colors: body.colors || null,
      displayOptions: body.displayOptions || null,
      filters: body.filters || null,
      autoRefresh: body.autoRefresh || false,
      refreshInterval: body.refreshInterval || null,
      sortOrder: body.sortOrder || 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return c.json({ id }, 201);
  } catch (error) {
    console.error(error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

app.patch("/dashboards/:dashId/widgets/:id", async (c) => {
  try {
    const { id } = c.req.param();
    const body = await c.req.json();

    await db.update(dashboardWidgets).set({
      ...body,
      updatedAt: new Date(),
    }).where(eq(dashboardWidgets.id, id));

    return c.json({ success: true });
  } catch (error) {
    console.error(error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

app.delete("/dashboards/:dashId/widgets/:id", async (c) => {
  try {
    const { id } = c.req.param();
    await db.delete(dashboardWidgets).where(eq(dashboardWidgets.id, id));
    return c.json({ success: true });
  } catch (error) {
    console.error(error);
    return c.json({ error: "فشل في حذف السجل" }, 500);
  }
});

// التقارير المجدولة
app.get("/scheduled-reports", async (c) => {
  try {
    const result = await db.select().from(scheduledReports)
      .where(eq(scheduledReports.isActive, true))
      .orderBy(scheduledReports.name);
    return c.json(result);
  } catch (error) {
    console.error(error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.post("/scheduled-reports", async (c) => {
  try {
    const body = await c.req.json();
    const id = `sr_${nanoid(12)}`;

    await db.insert(scheduledReports).values({
      id,
      name: body.name,
      description: body.description || null,
      reportType: body.reportType,
      reportConfig: body.reportConfig || null,
      frequency: body.frequency || "daily",
      scheduleTime: body.scheduleTime || "08:00",
      dayOfWeek: body.dayOfWeek || null,
      dayOfMonth: body.dayOfMonth || null,
      deliveryMethod: body.deliveryMethod || "email",
      recipients: body.recipients || null,
      format: body.format || "pdf",
      createdBy: body.createdBy || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return c.json({ id }, 201);
  } catch (error) {
    console.error(error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

// المؤشرات
app.get("/metrics", async (c) => {
  try {
    const { category } = c.req.query();
    const conditions = [eq(customMetrics.isActive, true)];
    if (category) conditions.push(eq(customMetrics.category, category));

    const result = await db.select().from(customMetrics)
      .where(and(...conditions))
      .orderBy(customMetrics.name);

    return c.json(result);
  } catch (error) {
    console.error(error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.get("/metrics/:id/values", async (c) => {
  try {
    const { id } = c.req.param();
    const { period = "30" } = c.req.query();

    const values = await db.select().from(metricValues)
      .where(eq(metricValues.metricId, id))
      .orderBy(desc(metricValues.periodStart))
      .limit(parseInt(period));

    return c.json(values.reverse());
  } catch (error) {
    console.error(error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.post("/metrics", async (c) => {
  try {
    const body = await c.req.json();
    const id = `met_${nanoid(12)}`;

    await db.insert(customMetrics).values({
      id,
      name: body.name,
      code: body.code || null,
      description: body.description || null,
      formula: body.formula || null,
      dataSource: body.dataSource || null,
      aggregationType: body.aggregationType || "sum",
      unit: body.unit || null,
      format: body.format || "number",
      decimals: body.decimals || 2,
      targetValue: body.targetValue || null,
      warningThreshold: body.warningThreshold || null,
      criticalThreshold: body.criticalThreshold || null,
      direction: body.direction || "higher_is_better",
      category: body.category || null,
      departmentId: body.departmentId || null,
      createdBy: body.createdBy || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return c.json({ id }, 201);
  } catch (error) {
    console.error(error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

app.post("/metrics/:id/values", async (c) => {
  try {
    const { id: metricId } = c.req.param();
    const body = await c.req.json();
    const id = `mv_${nanoid(12)}`;

    // حساب التغيير
    const [lastValue] = await db.select().from(metricValues)
      .where(eq(metricValues.metricId, metricId))
      .orderBy(desc(metricValues.periodEnd))
      .limit(1);

    let changePercentage = null;
    if (lastValue?.value) {
      changePercentage = ((body.value - Number(lastValue.value)) / Number(lastValue.value)) * 100;
    }

    await db.insert(metricValues).values({
      id, metricId,
      value: body.value,
      previousValue: lastValue?.value || null,
      changePercentage: changePercentage?.toString() || null,
      periodType: body.periodType || "daily",
      periodStart: new Date(body.periodStart),
      periodEnd: new Date(body.periodEnd),
      branchId: body.branchId || null,
      departmentId: body.departmentId || null,
      calculatedAt: new Date(),
    });

    return c.json({ id }, 201);
  } catch (error) {
    console.error(error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

// التنبيهات
app.get("/alerts", async (c) => {
  try {
    const result = await db.select().from(smartAlerts)
      .where(eq(smartAlerts.isActive, true))
      .orderBy(smartAlerts.name);
    return c.json(result);
  } catch (error) {
    console.error(error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.post("/alerts", async (c) => {
  try {
    const body = await c.req.json();
    const id = `alt_${nanoid(12)}`;

    await db.insert(smartAlerts).values({
      id,
      name: body.name,
      description: body.description || null,
      conditionType: body.conditionType || "threshold",
      metricId: body.metricId || null,
      operator: body.operator || null,
      thresholdValue: body.thresholdValue || null,
      comparisonPeriod: body.comparisonPeriod || null,
      comparisonPercentage: body.comparisonPercentage || null,
      alertLevel: body.alertLevel || "warning",
      notificationChannels: body.notificationChannels || ["email"],
      recipients: body.recipients || null,
      createdBy: body.createdBy || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return c.json({ id }, 201);
  } catch (error) {
    console.error(error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

// الإحصائيات
app.get("/stats", async (c) => {
  try {
    const [totalDashboards] = await db.select({ count: count() }).from(dashboards).where(eq(dashboards.isActive, true));
    const [totalWidgets] = await db.select({ count: count() }).from(dashboardWidgets);
    const [totalReports] = await db.select({ count: count() }).from(scheduledReports).where(eq(scheduledReports.isActive, true));
    const [totalMetrics] = await db.select({ count: count() }).from(customMetrics).where(eq(customMetrics.isActive, true));
    const [totalAlerts] = await db.select({ count: count() }).from(smartAlerts).where(eq(smartAlerts.isActive, true));

    return c.json({
      dashboards: totalDashboards?.count || 0,
      widgets: totalWidgets?.count || 0,
      scheduledReports: totalReports?.count || 0,
      metrics: totalMetrics?.count || 0,
      alerts: totalAlerts?.count || 0,
    });
  } catch (error) {
    console.error(error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

export default app;

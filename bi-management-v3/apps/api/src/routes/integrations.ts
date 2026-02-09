import { Hono } from "hono";
import { db, apiKeys, apiLogs, webhooks, webhookDeliveries, externalIntegrations, syncLogs } from "@bi-management/database";
import { eq, desc, sql, and } from "drizzle-orm";
import { authMiddleware } from "../lib/auth.js";

const app = new Hono();

// ==================== API KEYS ====================

app.get("/api-keys", async (c) => {
  try {
    const items = await db.select({ id: apiKeys.id, name: apiKeys.name, description: apiKeys.description, keyPrefix: apiKeys.keyPrefix, permissions: apiKeys.permissions, rateLimit: apiKeys.rateLimit, isActive: apiKeys.isActive, lastUsedAt: apiKeys.lastUsedAt, expiresAt: apiKeys.expiresAt, createdAt: apiKeys.createdAt }).from(apiKeys).orderBy(desc(apiKeys.createdAt));
    return c.json({ items });
  } catch (error) {
    console.error("Error fetching API keys:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.post("/api-keys", async (c) => {
  try {
    const body = await c.req.json();
    const id = crypto.randomUUID();
    const key = `bim_${crypto.randomUUID().replace(/-/g, "")}`;
    const keyPrefix = key.substring(0, 12);
    // In production, hash the key before storing
    await db.insert(apiKeys).values({ id, name: body.name, description: body.description, keyHash: key, keyPrefix, permissions: body.permissions || ["read"], rateLimit: body.rateLimit || 1000, isActive: 1, expiresAt: body.expiresAt ? new Date(body.expiresAt) : null, createdBy: body.createdBy });
    return c.json({ id, key, keyPrefix }, 201); // Return key only once
  } catch (error) {
    console.error("Error creating API key:", error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

app.put("/api-keys/:id", async (c) => {
  try {
    const { id } = c.req.param();
    const body = await c.req.json();
    await db.update(apiKeys).set({ name: body.name, description: body.description, permissions: body.permissions, rateLimit: body.rateLimit, isActive: body.isActive, updatedAt: new Date() }).where(eq(apiKeys.id, id));
    return c.json({ success: true });
  } catch (error) {
    console.error("Error updating API key:", error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

app.delete("/api-keys/:id", async (c) => {
  try {
    const { id } = c.req.param();
    await db.delete(apiKeys).where(eq(apiKeys.id, id));
    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting API key:", error);
    return c.json({ error: "فشل في حذف السجل" }, 500);
  }
});

app.get("/api-keys/:id/logs", async (c) => {
  try {
    const { id } = c.req.param();
    const { limit = "100" } = c.req.query();
    const logs = await db.select().from(apiLogs).where(eq(apiLogs.apiKeyId, id)).orderBy(desc(apiLogs.createdAt)).limit(parseInt(limit));
    return c.json({ items: logs });
  } catch (error) {
    console.error("Error fetching API key logs:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

// ==================== WEBHOOKS ====================

app.get("/webhooks", async (c) => {
  try {
    const items = await db.select().from(webhooks).orderBy(desc(webhooks.createdAt));
    return c.json({ items });
  } catch (error) {
    console.error("Error fetching webhooks:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.get("/webhooks/:id", async (c) => {
  try {
    const { id } = c.req.param();
    const [webhook] = await db.select().from(webhooks).where(eq(webhooks.id, id));
    if (!webhook) return c.json({ error: "Webhook not found" }, 404);
    const deliveries = await db.select().from(webhookDeliveries).where(eq(webhookDeliveries.webhookId, id)).orderBy(desc(webhookDeliveries.createdAt)).limit(50);
    return c.json({ ...webhook, deliveries });
  } catch (error) {
    console.error("Error fetching webhook:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.post("/webhooks", async (c) => {
  try {
    const body = await c.req.json();
    const id = crypto.randomUUID();
    const secret = `whsec_${crypto.randomUUID().replace(/-/g, "")}`;
    await db.insert(webhooks).values({ id, name: body.name, url: body.url, secret, events: body.events || [], isActive: 1, retryCount: body.retryCount || 3, timeoutSeconds: body.timeoutSeconds || 30, createdBy: body.createdBy });
    return c.json({ id, secret }, 201);
  } catch (error) {
    console.error("Error creating webhook:", error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

app.put("/webhooks/:id", async (c) => {
  try {
    const { id } = c.req.param();
    const body = await c.req.json();
    await db.update(webhooks).set({ name: body.name, url: body.url, events: body.events, isActive: body.isActive, retryCount: body.retryCount, timeoutSeconds: body.timeoutSeconds, updatedAt: new Date() }).where(eq(webhooks.id, id));
    return c.json({ success: true });
  } catch (error) {
    console.error("Error updating webhook:", error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

app.delete("/webhooks/:id", async (c) => {
  try {
    const { id } = c.req.param();
    await db.delete(webhookDeliveries).where(eq(webhookDeliveries.webhookId, id));
    await db.delete(webhooks).where(eq(webhooks.id, id));
    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting webhook:", error);
    return c.json({ error: "فشل في حذف السجل" }, 500);
  }
});

app.post("/webhooks/:id/test", async (c) => {
  try {
    const { id } = c.req.param();
    const [webhook] = await db.select().from(webhooks).where(eq(webhooks.id, id));
    if (!webhook) return c.json({ error: "Webhook not found" }, 404);
    // Create test delivery
    const deliveryId = crypto.randomUUID();
    await db.insert(webhookDeliveries).values({ id: deliveryId, webhookId: id, event: "test", payload: { test: true, timestamp: new Date().toISOString() }, status: "pending", attemptCount: 1 });
    // In production, actually send the webhook here
    await db.update(webhookDeliveries).set({ status: "success", statusCode: 200, responseTime: 150 }).where(eq(webhookDeliveries.id, deliveryId));
    await db.update(webhooks).set({ lastTriggeredAt: new Date(), lastSuccessAt: new Date(), successCount: sql`${webhooks.successCount} + 1` }).where(eq(webhooks.id, id));
    return c.json({ success: true, deliveryId });
  } catch (error) {
    console.error("Error testing webhook:", error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

// ==================== EXTERNAL INTEGRATIONS ====================

app.get("/external", async (c) => {
  try {
    const items = await db.select().from(externalIntegrations).orderBy(externalIntegrations.name);
    return c.json({ items });
  } catch (error) {
    console.error("Error fetching external integrations:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.get("/external/:id", async (c) => {
  try {
    const { id } = c.req.param();
    const [integration] = await db.select().from(externalIntegrations).where(eq(externalIntegrations.id, id));
    if (!integration) return c.json({ error: "Integration not found" }, 404);
    const logs = await db.select().from(syncLogs).where(eq(syncLogs.integrationId, id)).orderBy(desc(syncLogs.startedAt)).limit(20);
    return c.json({ ...integration, syncLogs: logs });
  } catch (error) {
    console.error("Error fetching external integration:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.post("/external", async (c) => {
  try {
    const body = await c.req.json();
    const id = crypto.randomUUID();
    await db.insert(externalIntegrations).values({ id, name: body.name, type: body.type, provider: body.provider, config: body.config, isActive: 0, isConfigured: body.config ? 1 : 0, createdBy: body.createdBy });
    return c.json({ id }, 201);
  } catch (error) {
    console.error("Error creating external integration:", error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

app.put("/external/:id", async (c) => {
  try {
    const { id } = c.req.param();
    const body = await c.req.json();
    await db.update(externalIntegrations).set({ name: body.name, config: body.config, isActive: body.isActive, isConfigured: body.config ? 1 : 0, updatedAt: new Date() }).where(eq(externalIntegrations.id, id));
    return c.json({ success: true });
  } catch (error) {
    console.error("Error updating external integration:", error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

app.post("/external/:id/sync", async (c) => {
  try {
    const { id } = c.req.param();
    const body = await c.req.json();
    const logId = crypto.randomUUID();
    await db.insert(syncLogs).values({ id: logId, integrationId: id, syncType: body.syncType || "incremental", direction: body.direction || "bidirectional", entityType: body.entityType, status: "running" });
    // In production, trigger actual sync here
    await db.update(syncLogs).set({ status: "completed", recordsProcessed: 10, recordsCreated: 2, recordsUpdated: 8, completedAt: new Date() }).where(eq(syncLogs.id, logId));
    await db.update(externalIntegrations).set({ lastSyncAt: new Date(), syncSuccessCount: sql`${externalIntegrations.syncSuccessCount} + 1` }).where(eq(externalIntegrations.id, id));
    return c.json({ success: true, logId });
  } catch (error) {
    console.error("Error syncing external integration:", error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

// ==================== STATS ====================

app.get("/stats", async (c) => {
  try {
    const [apiStats] = await db.select({ totalKeys: sql<number>`count(*)`, activeKeys: sql<number>`count(*) filter (where ${apiKeys.isActive} = 1)` }).from(apiKeys);
    const [webhookStats] = await db.select({ totalWebhooks: sql<number>`count(*)`, activeWebhooks: sql<number>`count(*) filter (where ${webhooks.isActive} = 1)` }).from(webhooks);
    const [integrationStats] = await db.select({ totalIntegrations: sql<number>`count(*)`, activeIntegrations: sql<number>`count(*) filter (where ${externalIntegrations.isActive} = 1)` }).from(externalIntegrations);
    return c.json({ ...apiStats, ...webhookStats, ...integrationStats });
  } catch (error) {
    console.error("Error fetching stats:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

export default app;

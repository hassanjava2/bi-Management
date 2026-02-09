import { pgTable, text, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { users } from "./users";

// API Keys - مفاتيح API
export const apiKeys = pgTable("api_keys", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  keyHash: text("key_hash").notNull(), // Hashed API key
  keyPrefix: text("key_prefix"), // First 8 chars for identification
  // Permissions
  permissions: jsonb("permissions").$type<string[]>(),
  // Rate limiting
  rateLimit: integer("rate_limit").default(1000), // Requests per hour
  // Status
  isActive: integer("is_active").default(1),
  lastUsedAt: timestamp("last_used_at"),
  expiresAt: timestamp("expires_at"),
  // Audit
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// API Request Logs - سجل طلبات API
export const apiLogs = pgTable("api_logs", {
  id: text("id").primaryKey(),
  apiKeyId: text("api_key_id").references(() => apiKeys.id),
  // Request
  method: text("method").notNull(),
  endpoint: text("endpoint").notNull(),
  requestBody: jsonb("request_body"),
  // Response
  statusCode: integer("status_code"),
  responseTime: integer("response_time"), // milliseconds
  // Client info
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Webhooks - الويب هوكس
export const webhooks = pgTable("webhooks", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  url: text("url").notNull(),
  secret: text("secret"), // For signature verification
  // Events to trigger
  events: jsonb("events").$type<string[]>(),
  // Settings
  isActive: integer("is_active").default(1),
  retryCount: integer("retry_count").default(3),
  timeoutSeconds: integer("timeout_seconds").default(30),
  // Stats
  successCount: integer("success_count").default(0),
  failureCount: integer("failure_count").default(0),
  lastTriggeredAt: timestamp("last_triggered_at"),
  lastSuccessAt: timestamp("last_success_at"),
  lastFailureAt: timestamp("last_failure_at"),
  // Audit
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Webhook Deliveries - تسليمات الويب هوكس
export const webhookDeliveries = pgTable("webhook_deliveries", {
  id: text("id").primaryKey(),
  webhookId: text("webhook_id").references(() => webhooks.id),
  event: text("event").notNull(),
  payload: jsonb("payload"),
  // Response
  statusCode: integer("status_code"),
  responseBody: text("response_body"),
  responseTime: integer("response_time"),
  // Status: pending, success, failed
  status: text("status").default("pending"),
  attemptCount: integer("attempt_count").default(0),
  nextRetryAt: timestamp("next_retry_at"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
});

// External Integrations - التكاملات الخارجية
export const externalIntegrations = pgTable("external_integrations", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // payment_gateway, shipping, accounting, crm, etc.
  provider: text("provider"), // stripe, paypal, aramex, quickbooks, etc.
  // Configuration (encrypted)
  config: jsonb("config"),
  // Status
  isActive: integer("is_active").default(0),
  isConfigured: integer("is_configured").default(0),
  lastSyncAt: timestamp("last_sync_at"),
  // Stats
  syncSuccessCount: integer("sync_success_count").default(0),
  syncFailureCount: integer("sync_failure_count").default(0),
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Sync Logs - سجل المزامنة
export const syncLogs = pgTable("sync_logs", {
  id: text("id").primaryKey(),
  integrationId: text("integration_id").references(() => externalIntegrations.id),
  // Sync details
  syncType: text("sync_type"), // full, incremental
  direction: text("direction"), // inbound, outbound, bidirectional
  entityType: text("entity_type"), // products, orders, customers, etc.
  // Results
  recordsProcessed: integer("records_processed").default(0),
  recordsCreated: integer("records_created").default(0),
  recordsUpdated: integer("records_updated").default(0),
  recordsFailed: integer("records_failed").default(0),
  // Status
  status: text("status").default("running"), // running, completed, failed
  errorMessage: text("error_message"),
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

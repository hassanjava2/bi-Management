import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";
import { users } from "./users";

export const auditLogs = pgTable("audit_logs", {
  id: text("id").primaryKey(),
  eventType: text("event_type").notNull(),
  eventCategory: text("event_category").notNull(),
  severity: text("severity").default("info"),
  userId: text("user_id").references(() => users.id),
  userName: text("user_name"),
  userRole: text("user_role"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  deviceFingerprint: text("device_fingerprint"),
  entityType: text("entity_type"),
  entityId: text("entity_id"),
  entityName: text("entity_name"),
  oldValue: text("old_value"),
  newValue: text("new_value"),
  changes: text("changes"),
  requestId: text("request_id"),
  sessionId: text("session_id"),
  module: text("module"),
  action: text("action"),
  metadata: text("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const approvals = pgTable("approvals", {
  id: text("id").primaryKey(),
  approvalNumber: text("approval_number").unique(),
  type: text("type").notNull(),
  entityType: text("entity_type"),
  entityId: text("entity_id"),
  requestedBy: text("requested_by")
    .notNull()
    .references(() => users.id),
  requestReason: text("request_reason").notNull(),
  requestData: text("request_data"),
  status: text("status").default("pending"),
  decidedBy: text("decided_by").references(() => users.id),
  decisionReason: text("decision_reason"),
  decidedAt: timestamp("decided_at"),
  priority: text("priority").default("normal"),
  expiresAt: timestamp("expires_at"),
  notificationSent: integer("notification_sent").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const settings = pgTable("settings", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value"),
  type: text("type").default("string"),
  category: text("category"),
  description: text("description"),
  isSystem: integer("is_system").default(0),
  updatedBy: text("updated_by").references(() => users.id),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const backups = pgTable("backups", {
  id: text("id").primaryKey(),
  filename: text("filename").notNull(),
  filepath: text("filepath").notNull(),
  size: integer("size"),
  type: text("type").default("manual"),
  status: text("status").default("completed"),
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

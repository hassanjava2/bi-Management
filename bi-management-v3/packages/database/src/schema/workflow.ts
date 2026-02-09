import { pgTable, text, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { users } from "./users";

// Workflow Templates - قوالب سير العمل
export const workflowTemplates = pgTable("workflow_templates", {
  id: text("id").primaryKey(),
  code: text("code").unique(),
  name: text("name").notNull(),
  nameAr: text("name_ar"),
  description: text("description"),
  // Entity type: invoice, voucher, purchase, leave, expense, etc.
  entityType: text("entity_type").notNull(),
  // Steps configuration as JSON array
  steps: jsonb("steps").$type<WorkflowStep[]>(),
  isActive: integer("is_active").default(1),
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Workflow Step type
export type WorkflowStep = {
  order: number;
  name: string;
  nameAr?: string;
  type: "approval" | "review" | "action" | "notification";
  assigneeType: "user" | "role" | "department" | "manager";
  assigneeId?: string;
  // Conditions for auto-approval or escalation
  conditions?: {
    autoApprove?: { field: string; operator: string; value: any };
    escalateAfterHours?: number;
    escalateTo?: string;
  };
  // Required fields or actions
  requiredFields?: string[];
};

// Workflow Instances - طلبات سير العمل
export const workflowInstances = pgTable("workflow_instances", {
  id: text("id").primaryKey(),
  code: text("code").unique(),
  templateId: text("template_id").references(() => workflowTemplates.id),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  // Current step (0-indexed)
  currentStep: integer("current_step").default(0),
  // Status: pending, approved, rejected, cancelled
  status: text("status").default("pending"),
  // Priority: low, normal, high, urgent
  priority: text("priority").default("normal"),
  // Requester
  requestedBy: text("requested_by").references(() => users.id),
  requestedAt: timestamp("requested_at").defaultNow(),
  // Completion info
  completedAt: timestamp("completed_at"),
  completedBy: text("completed_by").references(() => users.id),
  // Additional data
  metadata: jsonb("metadata"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Workflow Approvals - الموافقات
export const workflowApprovals = pgTable("workflow_approvals", {
  id: text("id").primaryKey(),
  instanceId: text("instance_id").references(() => workflowInstances.id),
  stepIndex: integer("step_index").notNull(),
  stepName: text("step_name"),
  // Assignee
  assignedTo: text("assigned_to").references(() => users.id),
  assignedRole: text("assigned_role"),
  // Status: pending, approved, rejected, delegated, escalated
  status: text("status").default("pending"),
  // Action info
  actionBy: text("action_by").references(() => users.id),
  actionAt: timestamp("action_at"),
  comments: text("comments"),
  // Delegation/Escalation
  delegatedTo: text("delegated_to").references(() => users.id),
  escalatedTo: text("escalated_to").references(() => users.id),
  dueAt: timestamp("due_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Notifications - الإشعارات
export const notifications = pgTable("notifications", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id),
  // Type: approval_request, approval_completed, system, reminder, alert
  type: text("type").notNull(),
  title: text("title").notNull(),
  titleAr: text("title_ar"),
  message: text("message"),
  messageAr: text("message_ar"),
  // Priority: low, normal, high
  priority: text("priority").default("normal"),
  // Link to related entity
  entityType: text("entity_type"),
  entityId: text("entity_id"),
  // Read status
  isRead: integer("is_read").default(0),
  readAt: timestamp("read_at"),
  // Delivery channels: app, email, sms
  channels: jsonb("channels").$type<string[]>(),
  sentAt: timestamp("sent_at"),
  // Expiry
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Notification Preferences - تفضيلات الإشعارات
export const notificationPreferences = pgTable("notification_preferences", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id),
  // Notification type
  notificationType: text("notification_type").notNull(),
  // Channels enabled
  emailEnabled: integer("email_enabled").default(1),
  appEnabled: integer("app_enabled").default(1),
  smsEnabled: integer("sms_enabled").default(0),
  // Quiet hours
  quietHoursStart: text("quiet_hours_start"),
  quietHoursEnd: text("quiet_hours_end"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Approval Delegation - تفويض الموافقات
export const approvalDelegations = pgTable("approval_delegations", {
  id: text("id").primaryKey(),
  delegatorId: text("delegator_id").references(() => users.id),
  delegateeId: text("delegatee_id").references(() => users.id),
  // Entity types to delegate (null = all)
  entityTypes: jsonb("entity_types").$type<string[]>(),
  // Date range
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  reason: text("reason"),
  isActive: integer("is_active").default(1),
  createdAt: timestamp("created_at").defaultNow(),
});

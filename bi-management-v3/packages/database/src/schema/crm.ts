import { pgTable, text, integer, real, timestamp } from "drizzle-orm/pg-core";
import { users } from "./users";
import { customers } from "./customers";

// Leads - العملاء المحتملين
export const leads = pgTable("leads", {
  id: text("id").primaryKey(),
  code: text("code").unique(),
  name: text("name").notNull(),
  company: text("company"),
  email: text("email"),
  phone: text("phone"),
  source: text("source"), // website, referral, social, cold_call, etc.
  status: text("status").default("new"), // new, contacted, qualified, converted, lost
  priority: text("priority").default("medium"), // low, medium, high
  estimatedValue: real("estimated_value"),
  notes: text("notes"),
  assignedTo: text("assigned_to").references(() => users.id),
  convertedCustomerId: text("converted_customer_id").references(() => customers.id),
  convertedAt: timestamp("converted_at"),
  lastContactDate: timestamp("last_contact_date"),
  nextFollowUp: timestamp("next_follow_up"),
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Opportunities - الفرص البيعية
export const opportunities = pgTable("opportunities", {
  id: text("id").primaryKey(),
  code: text("code").unique(),
  title: text("title").notNull(),
  customerId: text("customer_id").references(() => customers.id),
  leadId: text("lead_id").references(() => leads.id),
  stage: text("stage").default("prospecting"), // prospecting, qualification, proposal, negotiation, closed_won, closed_lost
  probability: integer("probability").default(10), // 0-100
  expectedValue: real("expected_value"),
  actualValue: real("actual_value"),
  expectedCloseDate: text("expected_close_date"),
  actualCloseDate: text("actual_close_date"),
  source: text("source"),
  description: text("notes"),
  lostReason: text("lost_reason"),
  assignedTo: text("assigned_to").references(() => users.id),
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Campaigns - الحملات التسويقية
export const campaigns = pgTable("campaigns", {
  id: text("id").primaryKey(),
  code: text("code").unique(),
  name: text("name").notNull(),
  type: text("type"), // email, social, event, advertising, etc.
  status: text("status").default("draft"), // draft, scheduled, active, paused, completed
  budget: real("budget"),
  actualCost: real("actual_cost"),
  startDate: text("start_date"),
  endDate: text("end_date"),
  targetAudience: text("target_audience"),
  description: text("description"),
  goals: text("goals"),
  // Metrics
  leadsGenerated: integer("leads_generated").default(0),
  conversions: integer("conversions").default(0),
  revenue: real("revenue").default(0),
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Lead Activities - أنشطة العملاء المحتملين
export const leadActivities = pgTable("lead_activities", {
  id: text("id").primaryKey(),
  leadId: text("lead_id").notNull().references(() => leads.id),
  type: text("type").notNull(), // call, email, meeting, note, task
  subject: text("subject"),
  description: text("description"),
  outcome: text("outcome"),
  scheduledAt: timestamp("scheduled_at"),
  completedAt: timestamp("completed_at"),
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Opportunity Activities
export const opportunityActivities = pgTable("opportunity_activities", {
  id: text("id").primaryKey(),
  opportunityId: text("opportunity_id").notNull().references(() => opportunities.id),
  type: text("type").notNull(),
  subject: text("subject"),
  description: text("description"),
  outcome: text("outcome"),
  scheduledAt: timestamp("scheduled_at"),
  completedAt: timestamp("completed_at"),
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Campaign Members - أعضاء الحملة
export const campaignMembers = pgTable("campaign_members", {
  id: text("id").primaryKey(),
  campaignId: text("campaign_id").notNull().references(() => campaigns.id),
  leadId: text("lead_id").references(() => leads.id),
  customerId: text("customer_id").references(() => customers.id),
  status: text("status").default("sent"), // sent, opened, clicked, responded, converted
  respondedAt: timestamp("responded_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

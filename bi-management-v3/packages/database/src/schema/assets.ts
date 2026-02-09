import { pgTable, text, integer, real, timestamp, date } from "drizzle-orm/pg-core";
import { users } from "./users";
import { branches } from "./branches";
import { departments } from "./hr";

// Asset Categories - فئات الأصول
export const assetCategories = pgTable("asset_categories", {
  id: text("id").primaryKey(),
  code: text("code").unique(),
  name: text("name").notNull(),
  nameAr: text("name_ar"),
  parentId: text("parent_id"),
  // Default depreciation settings
  depreciationMethod: text("depreciation_method").default("straight_line"), // straight_line, declining_balance, units_of_production
  usefulLifeYears: integer("useful_life_years"),
  salvageValuePercent: real("salvage_value_percent").default(0),
  // Accounting
  assetAccountId: text("asset_account_id"),
  depreciationAccountId: text("depreciation_account_id"),
  accumulatedDepAccountId: text("accumulated_dep_account_id"),
  isActive: integer("is_active").default(1),
  createdAt: timestamp("created_at").defaultNow(),
});

// Fixed Assets - الأصول الثابتة
export const fixedAssets = pgTable("fixed_assets", {
  id: text("id").primaryKey(),
  code: text("code").unique(),
  name: text("name").notNull(),
  nameAr: text("name_ar"),
  description: text("description"),
  categoryId: text("category_id").references(() => assetCategories.id),
  // Location
  branchId: text("branch_id").references(() => branches.id),
  departmentId: text("department_id").references(() => departments.id),
  location: text("location"), // Physical location description
  // Acquisition
  acquisitionDate: date("acquisition_date"),
  acquisitionCost: real("acquisition_cost").notNull(),
  purchaseInvoiceId: text("purchase_invoice_id"),
  supplierId: text("supplier_id"),
  // Asset details
  serialNumber: text("serial_number"),
  model: text("model"),
  manufacturer: text("manufacturer"),
  warrantyExpiry: date("warranty_expiry"),
  // Depreciation
  depreciationMethod: text("depreciation_method").default("straight_line"),
  usefulLifeYears: integer("useful_life_years"),
  usefulLifeMonths: integer("useful_life_months"),
  salvageValue: real("salvage_value").default(0),
  depreciationStartDate: date("depreciation_start_date"),
  // Current values
  currentValue: real("current_value"),
  accumulatedDepreciation: real("accumulated_depreciation").default(0),
  lastDepreciationDate: date("last_depreciation_date"),
  // Status: active, disposed, sold, fully_depreciated, under_maintenance
  status: text("status").default("active"),
  // Disposal info
  disposalDate: date("disposal_date"),
  disposalMethod: text("disposal_method"), // sold, scrapped, donated
  disposalValue: real("disposal_value"),
  disposalNotes: text("disposal_notes"),
  // Responsibility
  assignedTo: text("assigned_to").references(() => users.id),
  // Metadata
  barcode: text("barcode"),
  qrCode: text("qr_code"),
  imageUrl: text("image_url"),
  notes: text("notes"),
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Depreciation Records - سجلات الإهلاك
export const depreciationRecords = pgTable("depreciation_records", {
  id: text("id").primaryKey(),
  assetId: text("asset_id").references(() => fixedAssets.id),
  // Period
  periodStart: date("period_start"),
  periodEnd: date("period_end"),
  // Values
  openingValue: real("opening_value"),
  depreciationAmount: real("depreciation_amount"),
  closingValue: real("closing_value"),
  accumulatedDepreciation: real("accumulated_depreciation"),
  // Journal entry reference
  journalEntryId: text("journal_entry_id"),
  // Status
  status: text("status").default("calculated"), // calculated, posted
  postedAt: timestamp("posted_at"),
  postedBy: text("posted_by").references(() => users.id),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Asset Maintenance - صيانة الأصول
export const assetMaintenance = pgTable("asset_maintenance", {
  id: text("id").primaryKey(),
  code: text("code").unique(),
  assetId: text("asset_id").references(() => fixedAssets.id),
  // Type: preventive, corrective, inspection
  maintenanceType: text("maintenance_type"),
  description: text("description"),
  // Schedule
  scheduledDate: date("scheduled_date"),
  completedDate: date("completed_date"),
  // Cost
  estimatedCost: real("estimated_cost"),
  actualCost: real("actual_cost"),
  // Status: scheduled, in_progress, completed, cancelled
  status: text("status").default("scheduled"),
  // Vendor/Technician
  vendorId: text("vendor_id"),
  technicianName: text("technician_name"),
  // Details
  workPerformed: text("work_performed"),
  partsReplaced: text("parts_replaced"),
  nextMaintenanceDate: date("next_maintenance_date"),
  notes: text("notes"),
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Asset Transfers - نقل الأصول
export const assetTransfers = pgTable("asset_transfers", {
  id: text("id").primaryKey(),
  code: text("code").unique(),
  assetId: text("asset_id").references(() => fixedAssets.id),
  // From
  fromBranchId: text("from_branch_id").references(() => branches.id),
  fromDepartmentId: text("from_department_id").references(() => departments.id),
  fromLocation: text("from_location"),
  fromAssignee: text("from_assignee").references(() => users.id),
  // To
  toBranchId: text("to_branch_id").references(() => branches.id),
  toDepartmentId: text("to_department_id").references(() => departments.id),
  toLocation: text("to_location"),
  toAssignee: text("to_assignee").references(() => users.id),
  // Transfer details
  transferDate: date("transfer_date"),
  reason: text("reason"),
  // Status: pending, approved, completed, rejected
  status: text("status").default("pending"),
  approvedBy: text("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  notes: text("notes"),
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Asset Revaluations - إعادة تقييم الأصول
export const assetRevaluations = pgTable("asset_revaluations", {
  id: text("id").primaryKey(),
  assetId: text("asset_id").references(() => fixedAssets.id),
  revaluationDate: date("revaluation_date"),
  previousValue: real("previous_value"),
  newValue: real("new_value"),
  reason: text("reason"),
  appraiserId: text("appraiser_id"),
  appraiserName: text("appraiser_name"),
  journalEntryId: text("journal_entry_id"),
  notes: text("notes"),
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

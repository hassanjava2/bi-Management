/**
 * Schema - نظام إدارة المركبات والأسطول
 */
import { pgTable, text, timestamp, boolean, jsonb, integer, decimal } from "drizzle-orm/pg-core";
import { users } from "./users";
import { departments } from "./departments";
import { branches } from "./branches";

/**
 * المركبات
 */
export const vehicles = pgTable("vehicles", {
  id: text("id").primaryKey(),
  vehicleNumber: text("vehicle_number").notNull().unique(),
  
  // معلومات المركبة
  plateNumber: text("plate_number").notNull().unique(),
  brand: text("brand").notNull(),
  model: text("model").notNull(),
  year: integer("year"),
  color: text("color"),
  
  // النوع
  vehicleType: text("vehicle_type").default("sedan"), // sedan, suv, pickup, van, truck, bus, motorcycle
  fuelType: text("fuel_type").default("gasoline"), // gasoline, diesel, electric, hybrid
  
  // التفاصيل الفنية
  engineNumber: text("engine_number"),
  chassisNumber: text("chassis_number"),
  capacity: integer("capacity"), // عدد الركاب
  loadCapacity: decimal("load_capacity"), // الحمولة بالكيلو
  
  // الملكية
  ownershipType: text("ownership_type").default("owned"), // owned, leased, rented
  purchaseDate: timestamp("purchase_date"),
  purchasePrice: decimal("purchase_price"),
  
  // التخصيص
  assignedTo: text("assigned_to").references(() => users.id),
  departmentId: text("department_id").references(() => departments.id),
  branchId: text("branch_id").references(() => branches.id),
  
  // الحالة
  status: text("status").default("available"), // available, in_use, maintenance, reserved, retired
  currentMileage: integer("current_mileage").default(0),
  
  // الوثائق
  registrationExpiry: timestamp("registration_expiry"),
  insuranceExpiry: timestamp("insurance_expiry"),
  inspectionExpiry: timestamp("inspection_expiry"),
  
  // الصور
  images: jsonb("images").$type<string[]>(),
  
  notes: text("notes"),
  isActive: boolean("is_active").default(true),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * طلبات استخدام المركبات
 */
export const vehicleRequests = pgTable("vehicle_requests", {
  id: text("id").primaryKey(),
  requestNumber: text("request_number").notNull().unique(),
  
  // الطالب
  requesterId: text("requester_id").notNull().references(() => users.id),
  departmentId: text("department_id").references(() => departments.id),
  
  // المركبة
  vehicleId: text("vehicle_id").references(() => vehicles.id),
  preferredVehicleType: text("preferred_vehicle_type"),
  
  // التفاصيل
  purpose: text("purpose").notNull(),
  destination: text("destination"),
  passengers: integer("passengers"),
  
  // الوقت
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  actualStartDate: timestamp("actual_start_date"),
  actualEndDate: timestamp("actual_end_date"),
  
  // الحالة
  status: text("status").default("pending"), // pending, approved, rejected, in_progress, completed, cancelled
  
  // الموافقة
  approvedBy: text("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  rejectionReason: text("rejection_reason"),
  
  // السائق
  driverId: text("driver_id").references(() => users.id),
  
  // الأميال
  startMileage: integer("start_mileage"),
  endMileage: integer("end_mileage"),
  
  notes: text("notes"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * صيانة المركبات
 */
export const vehicleMaintenance = pgTable("vehicle_maintenance", {
  id: text("id").primaryKey(),
  maintenanceNumber: text("maintenance_number").notNull().unique(),
  
  vehicleId: text("vehicle_id").notNull().references(() => vehicles.id),
  
  // النوع
  maintenanceType: text("maintenance_type").default("routine"), // routine, repair, inspection, accident
  
  // التفاصيل
  description: text("description").notNull(),
  items: jsonb("items").$type<{ item: string; cost: number }[]>(),
  
  // التكلفة
  laborCost: decimal("labor_cost"),
  partsCost: decimal("parts_cost"),
  totalCost: decimal("total_cost"),
  
  // المورد
  vendor: text("vendor"),
  invoiceNumber: text("invoice_number"),
  
  // الأميال
  mileageAtService: integer("mileage_at_service"),
  nextServiceMileage: integer("next_service_mileage"),
  nextServiceDate: timestamp("next_service_date"),
  
  // التاريخ
  scheduledDate: timestamp("scheduled_date"),
  startDate: timestamp("start_date"),
  completedDate: timestamp("completed_date"),
  
  // الحالة
  status: text("status").default("scheduled"), // scheduled, in_progress, completed, cancelled
  
  performedBy: text("performed_by"),
  
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * تعبئة الوقود
 */
export const fuelRecords = pgTable("fuel_records", {
  id: text("id").primaryKey(),
  
  vehicleId: text("vehicle_id").notNull().references(() => vehicles.id),
  
  // التفاصيل
  fuelType: text("fuel_type"),
  quantity: decimal("quantity").notNull(), // لتر
  pricePerUnit: decimal("price_per_unit"),
  totalCost: decimal("total_cost").notNull(),
  
  // المحطة
  station: text("station"),
  location: text("location"),
  
  // الأميال
  mileage: integer("mileage"),
  
  // السائق
  filledBy: text("filled_by").references(() => users.id),
  
  filledAt: timestamp("filled_at").defaultNow(),
  
  notes: text("notes"),
  receiptImage: text("receipt_image"),
  
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * السائقين
 */
export const drivers = pgTable("drivers", {
  id: text("id").primaryKey(),
  
  userId: text("user_id").notNull().references(() => users.id),
  
  // الرخصة
  licenseNumber: text("license_number").notNull(),
  licenseType: text("license_type"), // A, B, C, D
  licenseExpiry: timestamp("license_expiry"),
  
  // الحالة
  status: text("status").default("active"), // active, inactive, suspended
  
  // التقييم
  rating: decimal("rating"),
  totalTrips: integer("total_trips").default(0),
  
  // المركبة المخصصة
  assignedVehicleId: text("assigned_vehicle_id").references(() => vehicles.id),
  
  notes: text("notes"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * مخالفات المرور
 */
export const trafficViolations = pgTable("traffic_violations", {
  id: text("id").primaryKey(),
  
  vehicleId: text("vehicle_id").notNull().references(() => vehicles.id),
  driverId: text("driver_id").references(() => drivers.id),
  
  // المخالفة
  violationType: text("violation_type"),
  description: text("description"),
  location: text("location"),
  
  // الغرامة
  fineAmount: decimal("fine_amount"),
  isPaid: boolean("is_paid").default(false),
  paidAt: timestamp("paid_at"),
  paidBy: text("paid_by").references(() => users.id),
  
  violationDate: timestamp("violation_date"),
  
  notes: text("notes"),
  
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * تتبع GPS
 */
export const vehicleTracking = pgTable("vehicle_tracking", {
  id: text("id").primaryKey(),
  
  vehicleId: text("vehicle_id").notNull().references(() => vehicles.id),
  
  // الموقع
  latitude: decimal("latitude"),
  longitude: decimal("longitude"),
  address: text("address"),
  
  // السرعة
  speed: decimal("speed"),
  
  // الحالة
  engineStatus: text("engine_status"), // on, off, idle
  
  recordedAt: timestamp("recorded_at").defaultNow(),
});

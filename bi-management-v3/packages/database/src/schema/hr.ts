import { pgTable, text, integer, real, timestamp } from "drizzle-orm/pg-core";
import { users } from "./users";

export const departments = pgTable("departments", {
  id: text("id").primaryKey(),
  code: text("code").unique(),
  name: text("name").notNull(),
  nameAr: text("name_ar"),
  parentId: text("parent_id"),
  managerId: text("manager_id").references(() => users.id),
  isActive: integer("is_active").default(1),
  createdAt: timestamp("created_at").defaultNow(),
});

export const positions = pgTable("positions", {
  id: text("id").primaryKey(),
  code: text("code").unique(),
  name: text("name").notNull(),
  nameAr: text("name_ar"),
  departmentId: text("department_id").references(() => departments.id),
  level: integer("level").default(1),
  isActive: integer("is_active").default(1),
  createdAt: timestamp("created_at").defaultNow(),
});

export const employees = pgTable("employees", {
  id: text("id").primaryKey(),
  userId: text("user_id").unique().references(() => users.id),
  employeeCode: text("employee_code").unique(),
  departmentId: text("department_id").references(() => departments.id),
  positionId: text("position_id").references(() => positions.id),
  managerId: text("manager_id"),
  workStartTime: text("work_start_time"),
  workEndTime: text("work_end_time"),
  workDays: text("work_days"),
  salary: real("salary"),
  salaryEncrypted: text("salary_encrypted"),
  salaryType: text("salary_type"),
  allowances: text("allowances"),
  bankAccount: text("bank_account"),
  bankName: text("bank_name"),
  hireDate: text("hire_date"),
  contractEndDate: text("contract_end_date"),
  contractType: text("contract_type"),
  emergencyContact: text("emergency_contact"),
  emergencyPhone: text("emergency_phone"),
  documents: text("documents"),
  isActive: integer("is_active").default(1),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const attendance = pgTable("attendance", {
  id: text("id").primaryKey(),
  employeeId: text("employee_id")
    .notNull()
    .references(() => employees.id),
  date: text("date").notNull(),
  checkIn: text("check_in"),
  checkOut: text("check_out"),
  checkInLocation: text("check_in_location"),
  checkOutLocation: text("check_out_location"),
  workHours: real("work_hours"),
  overtimeHours: real("overtime_hours").default(0),
  status: text("status").default("present"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const salaries = pgTable("salaries", {
  id: text("id").primaryKey(),
  employeeId: text("employee_id")
    .notNull()
    .references(() => employees.id),
  periodStart: text("period_start").notNull(),
  periodEnd: text("period_end").notNull(),
  basicSalary: real("basic_salary").notNull(),
  allowances: real("allowances").default(0),
  overtime: real("overtime").default(0),
  bonuses: real("bonuses").default(0),
  deductions: real("deductions").default(0),
  advancesDeducted: real("advances_deducted").default(0),
  loansDeducted: real("loans_deducted").default(0),
  netSalary: real("net_salary").notNull(),
  status: text("status").default("draft"),
  approvedBy: text("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  paidAt: timestamp("paid_at"),
  paymentMethod: text("payment_method"),
  paymentReference: text("payment_reference"),
  notes: text("notes"),
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const salaryAdvances = pgTable("salary_advances", {
  id: text("id").primaryKey(),
  employeeId: text("employee_id")
    .notNull()
    .references(() => employees.id),
  amount: real("amount").notNull(),
  reason: text("reason"),
  deductionType: text("deduction_type").default("installments"),
  installmentAmount: real("installment_amount"),
  installmentCount: integer("installment_count"),
  remainingAmount: real("remaining_amount"),
  status: text("status").default("pending"),
  approvedBy: text("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  rejectionReason: text("rejection_reason"),
  disbursedAt: timestamp("disbursed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const leaves = pgTable("leaves", {
  id: text("id").primaryKey(),
  employeeId: text("employee_id")
    .notNull()
    .references(() => employees.id),
  type: text("type").notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  days: integer("days").notNull(),
  reason: text("reason"),
  status: text("status").default("pending"),
  approvedBy: text("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at").defaultNow(),
});

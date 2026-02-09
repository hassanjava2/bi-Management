/**
 * نظام الإعدادات
 * ─────────────────
 * - إعدادات الشركة
 * - إعدادات النظام
 * - إعدادات الأرقام التسلسلية
 * - إعدادات الضمان
 * - إعدادات الفواتير
 */
import { pgTable, text, integer, real, timestamp, jsonb } from "drizzle-orm/pg-core";
import { users } from "./users";

// إعدادات النظام (key-value)
export const systemSettings = pgTable("system_settings", {
  id: text("id").primaryKey(),
  category: text("category").notNull(), // company, invoice, serial, warranty, notification, backup
  key: text("key").notNull(),
  value: text("value"),
  valueJson: jsonb("value_json"),
  valueType: text("value_type").default("string"), // string, number, boolean, json, array
  label: text("label"),
  labelAr: text("label_ar"),
  description: text("description"),
  isPublic: integer("is_public").default(0), // 1 = visible to all users
  isEditable: integer("is_editable").default(1),
  updatedBy: text("updated_by").references(() => users.id),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// معلومات الشركة
export const companyInfo = pgTable("company_info", {
  id: text("id").primaryKey().default("main"),
  name: text("name").notNull(),
  nameAr: text("name_ar"),
  fullName: text("full_name"),
  tagline: text("tagline"),
  logo: text("logo"),
  favicon: text("favicon"),
  // معلومات الاتصال
  phone: text("phone"),
  phone2: text("phone2"),
  whatsapp: text("whatsapp"),
  email: text("email"),
  website: text("website"),
  // العنوان
  country: text("country"),
  city: text("city"),
  address: text("address"),
  addressAr: text("address_ar"),
  mapUrl: text("map_url"),
  // معلومات قانونية
  taxNumber: text("tax_number"),
  commercialRegister: text("commercial_register"),
  licenseNumber: text("license_number"),
  // التواصل الاجتماعي
  facebook: text("facebook"),
  instagram: text("instagram"),
  twitter: text("twitter"),
  youtube: text("youtube"),
  tiktok: text("tiktok"),
  // معلومات إضافية
  foundedYear: integer("founded_year"),
  employeesCount: integer("employees_count"),
  description: text("description"),
  descriptionAr: text("description_ar"),
  // المالك
  ownerName: text("owner_name"),
  ownerPhone: text("owner_phone"),
  // التحديث
  updatedBy: text("updated_by").references(() => users.id),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// إعدادات الفاتورة
export const invoiceSettings = pgTable("invoice_settings", {
  id: text("id").primaryKey().default("main"),
  // تنسيق رقم الفاتورة
  invoicePrefix: text("invoice_prefix").default("INV"),
  invoiceNumberLength: integer("invoice_number_length").default(6),
  invoiceStartNumber: integer("invoice_start_number").default(1),
  // إعدادات الضريبة
  taxEnabled: integer("tax_enabled").default(0),
  taxRate: real("tax_rate").default(0),
  taxName: text("tax_name"),
  taxNumber: text("tax_number"),
  // إعدادات الطباعة
  printHeader: text("print_header"),
  printFooter: text("print_footer"),
  showLogo: integer("show_logo").default(1),
  showQrCode: integer("show_qr_code").default(1),
  paperSize: text("paper_size").default("A4"), // A4, A5, thermal
  // شروط وأحكام
  termsAndConditions: text("terms_and_conditions"),
  returnPolicy: text("return_policy"),
  warrantyTerms: text("warranty_terms"),
  // العملة
  currency: text("currency").default("IQD"),
  currencySymbol: text("currency_symbol").default("د.ع"),
  currencyPosition: text("currency_position").default("after"), // before, after
  // التحديث
  updatedBy: text("updated_by").references(() => users.id),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// إعدادات الضمان
export const warrantySettings = pgTable("warranty_settings", {
  id: text("id").primaryKey().default("main"),
  // ضمان افتراضي
  defaultWarrantyMonths: integer("default_warranty_months").default(12),
  extendedWarrantyMonths: integer("extended_warranty_months").default(24),
  // ما يشمله الضمان
  warrantyCovers: text("warranty_covers"),
  warrantyExcludes: text("warranty_excludes"),
  // إجراءات الضمان
  warrantyProcess: text("warranty_process"),
  // إشعارات
  notifyBeforeExpiry: integer("notify_before_expiry").default(30), // أيام
  // التحديث
  updatedBy: text("updated_by").references(() => users.id),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// إعدادات الإشعارات
export const notificationSettings = pgTable("notification_settings", {
  id: text("id").primaryKey().default("main"),
  // إشعارات البريد
  emailEnabled: integer("email_enabled").default(0),
  smtpHost: text("smtp_host"),
  smtpPort: integer("smtp_port"),
  smtpUser: text("smtp_user"),
  smtpPassword: text("smtp_password"),
  emailFrom: text("email_from"),
  emailFromName: text("email_from_name"),
  // إشعارات SMS
  smsEnabled: integer("sms_enabled").default(0),
  smsProvider: text("sms_provider"),
  smsApiKey: text("sms_api_key"),
  smsSenderId: text("sms_sender_id"),
  // إشعارات واتساب
  whatsappEnabled: integer("whatsapp_enabled").default(0),
  whatsappApiKey: text("whatsapp_api_key"),
  whatsappNumber: text("whatsapp_number"),
  // إشعارات Telegram
  telegramEnabled: integer("telegram_enabled").default(0),
  telegramBotToken: text("telegram_bot_token"),
  telegramChatId: text("telegram_chat_id"),
  // التحديث
  updatedBy: text("updated_by").references(() => users.id),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// إعدادات النسخ الاحتياطي
export const backupSettings = pgTable("backup_settings", {
  id: text("id").primaryKey().default("main"),
  // النسخ التلقائي
  autoBackupEnabled: integer("auto_backup_enabled").default(1),
  backupFrequency: text("backup_frequency").default("daily"), // hourly, daily, weekly
  backupTime: text("backup_time").default("03:00"),
  backupRetentionDays: integer("backup_retention_days").default(30),
  // مكان التخزين
  backupLocation: text("backup_location").default("local"), // local, cloud, both
  cloudProvider: text("cloud_provider"), // google, aws, azure
  cloudBucket: text("cloud_bucket"),
  cloudAccessKey: text("cloud_access_key"),
  cloudSecretKey: text("cloud_secret_key"),
  // آخر نسخة
  lastBackupAt: timestamp("last_backup_at"),
  lastBackupSize: text("last_backup_size"),
  lastBackupStatus: text("last_backup_status"),
  // التحديث
  updatedBy: text("updated_by").references(() => users.id),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// سجل النسخ الاحتياطية
export const backupLogs = pgTable("backup_logs", {
  id: text("id").primaryKey(),
  fileName: text("file_name").notNull(),
  fileSize: text("file_size"),
  location: text("location"),
  type: text("type").default("full"), // full, incremental, differential
  status: text("status").default("pending"), // pending, running, completed, failed
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  error: text("error"),
  initiatedBy: text("initiated_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

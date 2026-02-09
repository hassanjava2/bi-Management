/** أسماء الوحدات (modules) للصلاحيات */
export const PERMISSION_MODULES = [
  "system",
  "purchases", // Fixed: was "products", should match database schema
  "inventory",
  "sales",
  "customers",
  "suppliers",
  "finance",
  "returns",
  "maintenance",
  "hr",
  "delivery",
  "reports",
  "ai",
  "tasks",
  "training",
] as const;

/** تنسيق السيريال: BI-YYYY-XXXXXX */
export const SERIAL_PREFIX = "BI";
export const SERIAL_FORMAT = `${SERIAL_PREFIX}-{YEAR}-{SEQ}`;

/** أنواع المخازن (7) حسب الخطة */
export const WAREHOUSE_TYPES = [
  "main",
  "inspection",
  "preparation",
  "returns",
  "damaged",
  "display",
  "maintenance",
] as const;

/**
 * Input Validation Middleware using Zod
 * يوفر تحقق آمن من المدخلات لجميع API routes
 */
import { z, ZodError, ZodType } from "zod";
import type { Context, Next } from "hono";

/**
 * إنشاء middleware للتحقق من body الطلب
 */
export function validateBody<T extends ZodType>(schema: T) {
  return async (c: Context, next: Next) => {
    try {
      const body = await c.req.json();
      const validated = schema.parse(body);
      c.set("validatedBody", validated);
      await next();
    } catch (error) {
      if (error instanceof ZodError) {
        return c.json(
          {
            error: "خطأ في التحقق من البيانات",
            code: "VALIDATION_ERROR",
            details: error.errors.map((e) => ({
              field: e.path.join("."),
              message: e.message,
            })),
          },
          400
        );
      }
      // JSON parsing error
      if (error instanceof SyntaxError) {
        return c.json(
          {
            error: "صيغة JSON غير صحيحة",
            code: "INVALID_JSON",
          },
          400
        );
      }
      throw error;
    }
  };
}

/**
 * إنشاء middleware للتحقق من parameters الطلب
 */
export function validateParams<T extends ZodType>(schema: T) {
  return async (c: Context, next: Next) => {
    try {
      const params = c.req.param();
      const validated = schema.parse(params);
      c.set("validatedParams", validated);
      await next();
    } catch (error) {
      if (error instanceof ZodError) {
        return c.json(
          {
            error: "معلمات غير صحيحة",
            code: "INVALID_PARAMS",
            details: error.errors.map((e) => ({
              field: e.path.join("."),
              message: e.message,
            })),
          },
          400
        );
      }
      throw error;
    }
  };
}

/**
 * إنشاء middleware للتحقق من query parameters
 */
export function validateQuery<T extends ZodType>(schema: T) {
  return async (c: Context, next: Next) => {
    try {
      const query = c.req.query();
      const validated = schema.parse(query);
      c.set("validatedQuery", validated);
      await next();
    } catch (error) {
      if (error instanceof ZodError) {
        return c.json(
          {
            error: "معلمات البحث غير صحيحة",
            code: "INVALID_QUERY",
            details: error.errors.map((e) => ({
              field: e.path.join("."),
              message: e.message,
            })),
          },
          400
        );
      }
      throw error;
    }
  };
}

// ========================================
// Common Validation Schemas
// ========================================

/**
 * Schema للتحقق من UUID
 */
export const uuidSchema = z.string().uuid({ message: "معرّف غير صحيح" });

/**
 * Schema للتحقق من ID parameter
 */
export const idParamSchema = z.object({
  id: uuidSchema,
});

/**
 * Schema للتحقق من pagination
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

/**
 * Schema للتحقق من email
 */
export const emailSchema = z.string().email({ message: "البريد الإلكتروني غير صحيح" });

/**
 * Schema للتحقق من phone
 */
export const phoneSchema = z.string().regex(
  /^[\d\s\+\-\(\)]+$/,
  { message: "رقم الهاتف غير صحيح" }
);

/**
 * Schema للتحقق من password
 */
export const passwordSchema = z.string().min(8, { message: "كلمة المرور يجب أن تكون 8 أحرف على الأقل" });

/**
 * Schema للتحقق من username
 */
export const usernameSchema = z.string()
  .min(3, { message: "اسم المستخدم يجب أن يكون 3 أحرف على الأقل" })
  .max(50, { message: "اسم المستخدم يجب أن لا يتجاوز 50 حرفاً" })
  .regex(/^[a-zA-Z0-9_]+$/, { message: "اسم المستخدم يمكن أن يحتوي على حروف وأرقام و _ فقط" });

/**
 * Schema للتحقق من date
 */
export const dateSchema = z.string().refine(
  (val) => !isNaN(Date.parse(val)),
  { message: "تاريخ غير صحيح" }
);

/**
 * Schema للتحقق من positive number
 */
export const positiveNumberSchema = z.coerce.number().positive({ message: "يجب أن يكون رقماً موجباً" });

/**
 * Schema للتحقق من non-negative number
 */
export const nonNegativeNumberSchema = z.coerce.number().min(0, { message: "يجب أن يكون رقماً غير سالب" });

// ========================================
// Auth Validation Schemas
// ========================================

/**
 * Schema للتحقق من بيانات تسجيل الدخول
 */
export const loginSchema = z.object({
  username: z.string().min(1, { message: "اسم المستخدم مطلوب" }),
  password: z.string().min(1, { message: "كلمة المرور مطلوبة" }),
});

/**
 * Schema للتحقق من بيانات إنشاء مستخدم
 */
export const createUserSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
  fullName: z.string().min(1, { message: "الاسم الكامل مطلوب" }).max(200),
  email: emailSchema.optional().or(z.literal("")),
  phone: phoneSchema.optional().or(z.literal("")),
  roleId: uuidSchema.optional(),
  branchId: uuidSchema.optional(),
  departmentId: uuidSchema.optional(),
  isActive: z.coerce.number().int().min(0).max(1).default(1),
});

/**
 * Schema للتحقق من بيانات تحديث مستخدم
 */
export const updateUserSchema = createUserSchema.partial().omit({ password: true }).extend({
  password: passwordSchema.optional(),
});

/**
 * Schema للتحقق من تغيير كلمة المرور
 */
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, { message: "كلمة المرور الحالية مطلوبة" }),
  newPassword: passwordSchema,
});

// ========================================
// Customer Validation Schemas
// ========================================

export const createCustomerSchema = z.object({
  name: z.string().min(1, { message: "اسم العميل مطلوب" }).max(200),
  phone: phoneSchema.optional().or(z.literal("")),
  email: emailSchema.optional().or(z.literal("")),
  address: z.string().max(500).optional(),
  type: z.enum(["individual", "company"]).default("individual"),
  taxNumber: z.string().max(50).optional(),
  notes: z.string().max(1000).optional(),
});

export const updateCustomerSchema = createCustomerSchema.partial();

// ========================================
// Product Validation Schemas
// ========================================

export const createProductSchema = z.object({
  name: z.string().min(1, { message: "اسم المنتج مطلوب" }).max(200),
  sku: z.string().max(50).optional(),
  barcode: z.string().max(50).optional(),
  categoryId: uuidSchema.optional(),
  description: z.string().max(2000).optional(),
  costPrice: nonNegativeNumberSchema.default(0),
  sellingPrice: nonNegativeNumberSchema.default(0),
  quantity: nonNegativeNumberSchema.default(0),
  minQuantity: nonNegativeNumberSchema.default(0),
  unit: z.string().max(20).default("قطعة"),
  isActive: z.coerce.number().int().min(0).max(1).default(1),
});

export const updateProductSchema = createProductSchema.partial();

// ========================================
// Invoice Validation Schemas
// ========================================

export const invoiceItemSchema = z.object({
  productId: uuidSchema,
  quantity: positiveNumberSchema,
  unitPrice: nonNegativeNumberSchema,
  discount: nonNegativeNumberSchema.default(0),
  notes: z.string().max(500).optional(),
});

export const createInvoiceSchema = z.object({
  type: z.enum(["sale", "purchase", "return", "quotation"]),
  customerId: uuidSchema.optional(),
  supplierId: uuidSchema.optional(),
  items: z.array(invoiceItemSchema).min(1, { message: "يجب إضافة منتج واحد على الأقل" }),
  discount: nonNegativeNumberSchema.default(0),
  tax: nonNegativeNumberSchema.default(0),
  notes: z.string().max(2000).optional(),
  paymentMethod: z.enum(["cash", "card", "bank", "credit"]).default("cash"),
  paidAmount: nonNegativeNumberSchema.default(0),
});

// ========================================
// Export all schemas
// ========================================

export const schemas = {
  // Common
  uuid: uuidSchema,
  idParam: idParamSchema,
  pagination: paginationSchema,
  email: emailSchema,
  phone: phoneSchema,
  password: passwordSchema,
  username: usernameSchema,
  date: dateSchema,
  positiveNumber: positiveNumberSchema,
  nonNegativeNumber: nonNegativeNumberSchema,
  
  // Auth
  login: loginSchema,
  createUser: createUserSchema,
  updateUser: updateUserSchema,
  changePassword: changePasswordSchema,
  
  // Customer
  createCustomer: createCustomerSchema,
  updateCustomer: updateCustomerSchema,
  
  // Product
  createProduct: createProductSchema,
  updateProduct: updateProductSchema,
  
  // Invoice
  invoiceItem: invoiceItemSchema,
  createInvoice: createInvoiceSchema,
};

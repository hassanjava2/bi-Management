/**
 * Centralized Error Handler Utility
 * يوفر معالجة موحدة للأخطاء في جميع API routes
 */
import type { Context } from "hono";

/**
 * رموز الأخطاء الموحدة
 */
export enum ErrorCode {
  // Authentication errors
  UNAUTHORIZED = "UNAUTHORIZED",
  INVALID_TOKEN = "INVALID_TOKEN",
  MISSING_TOKEN = "MISSING_TOKEN",
  FORBIDDEN = "FORBIDDEN",
  
  // Validation errors
  VALIDATION_ERROR = "VALIDATION_ERROR",
  INVALID_INPUT = "INVALID_INPUT",
  MISSING_FIELD = "MISSING_FIELD",
  
  // Resource errors
  NOT_FOUND = "NOT_FOUND",
  ALREADY_EXISTS = "ALREADY_EXISTS",
  CONFLICT = "CONFLICT",
  
  // Rate limiting
  RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED",
  
  // Server errors
  INTERNAL_ERROR = "INTERNAL_ERROR",
  DATABASE_ERROR = "DATABASE_ERROR",
  EXTERNAL_SERVICE_ERROR = "EXTERNAL_SERVICE_ERROR",
}

/**
 * رسائل الأخطاء باللغة العربية
 */
export const ErrorMessages: Record<string, string> = {
  // Authentication
  [ErrorCode.UNAUTHORIZED]: "غير مصرح",
  [ErrorCode.INVALID_TOKEN]: "الرمز غير صالح",
  [ErrorCode.MISSING_TOKEN]: "الرمز مفقود",
  [ErrorCode.FORBIDDEN]: "ليس لديك صلاحية للوصول",
  
  // Validation
  [ErrorCode.VALIDATION_ERROR]: "خطأ في التحقق من البيانات",
  [ErrorCode.INVALID_INPUT]: "البيانات المدخلة غير صحيحة",
  [ErrorCode.MISSING_FIELD]: "حقل مطلوب مفقود",
  
  // Resource
  [ErrorCode.NOT_FOUND]: "العنصر غير موجود",
  [ErrorCode.ALREADY_EXISTS]: "العنصر موجود مسبقاً",
  [ErrorCode.CONFLICT]: "تعارض في البيانات",
  
  // Rate limiting
  [ErrorCode.RATE_LIMIT_EXCEEDED]: "تم تجاوز الحد المسموح من الطلبات",
  
  // Server
  [ErrorCode.INTERNAL_ERROR]: "حدث خطأ داخلي",
  [ErrorCode.DATABASE_ERROR]: "خطأ في قاعدة البيانات",
  [ErrorCode.EXTERNAL_SERVICE_ERROR]: "خطأ في الخدمة الخارجية",
};

/**
 * رسائل أخطاء العمليات الشائعة
 */
export const OperationErrors = {
  FETCH: "فشل في جلب البيانات",
  CREATE: "فشل في إنشاء السجل",
  UPDATE: "فشل في تحديث البيانات",
  DELETE: "فشل في حذف السجل",
  UPLOAD: "فشل في رفع الملف",
  DOWNLOAD: "فشل في تحميل الملف",
  SEARCH: "فشل في البحث",
  EXPORT: "فشل في التصدير",
  IMPORT: "فشل في الاستيراد",
};

interface ErrorResponse {
  error: string;
  code?: string;
  details?: unknown;
}

/**
 * إنشاء response خطأ موحد
 */
export function createErrorResponse(
  code: ErrorCode | string,
  customMessage?: string,
  details?: unknown
): ErrorResponse {
  return {
    error: customMessage || ErrorMessages[code] || "حدث خطأ غير متوقع",
    code,
    ...(details && process.env.NODE_ENV === "development" ? { details } : {}),
  };
}

/**
 * معالجة الأخطاء وإرجاع response مناسب
 * يقوم بتسجيل الخطأ وإرجاع رسالة آمنة للمستخدم
 */
export function handleError(
  c: Context,
  error: unknown,
  operation: string,
  customMessage?: string
) {
  // Log the error with context
  console.error(`[${operation}] Error:`, error);
  
  // Determine status code and message
  let statusCode = 500;
  let message = customMessage || OperationErrors.FETCH;
  let code = ErrorCode.INTERNAL_ERROR;
  
  if (error instanceof Error) {
    // Check for specific error types
    if (error.message.includes("not found") || error.message.includes("غير موجود")) {
      statusCode = 404;
      code = ErrorCode.NOT_FOUND;
      message = ErrorMessages[ErrorCode.NOT_FOUND];
    } else if (error.message.includes("duplicate") || error.message.includes("already exists")) {
      statusCode = 409;
      code = ErrorCode.ALREADY_EXISTS;
      message = ErrorMessages[ErrorCode.ALREADY_EXISTS];
    } else if (error.message.includes("unauthorized") || error.message.includes("غير مصرح")) {
      statusCode = 401;
      code = ErrorCode.UNAUTHORIZED;
      message = ErrorMessages[ErrorCode.UNAUTHORIZED];
    } else if (error.message.includes("forbidden") || error.message.includes("ليس لديك صلاحية")) {
      statusCode = 403;
      code = ErrorCode.FORBIDDEN;
      message = ErrorMessages[ErrorCode.FORBIDDEN];
    }
  }
  
  return c.json(createErrorResponse(code, message), statusCode);
}

/**
 * Wrapper لمعالجة الأخطاء في route handlers
 * يمكن استخدامه لتغليف أي route handler
 */
export function withErrorHandler<T>(
  operation: string,
  handler: (c: Context) => Promise<T>
) {
  return async (c: Context) => {
    try {
      return await handler(c);
    } catch (error) {
      return handleError(c, error, operation);
    }
  };
}

/**
 * خطأ مخصص للتحقق من الصلاحيات
 */
export class AuthorizationError extends Error {
  constructor(message = "ليس لديك صلاحية للوصول") {
    super(message);
    this.name = "AuthorizationError";
  }
}

/**
 * خطأ مخصص للتحقق من البيانات
 */
export class ValidationError extends Error {
  public details: unknown;
  
  constructor(message = "خطأ في التحقق من البيانات", details?: unknown) {
    super(message);
    this.name = "ValidationError";
    this.details = details;
  }
}

/**
 * خطأ مخصص للموارد غير الموجودة
 */
export class NotFoundError extends Error {
  constructor(resource = "العنصر") {
    super(`${resource} غير موجود`);
    this.name = "NotFoundError";
  }
}

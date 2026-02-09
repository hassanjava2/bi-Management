/**
 * Simple in-memory rate limiting middleware
 * يوفر حماية أساسية من هجمات brute force و DoS
 * 
 * ملاحظة: للإنتاج، يُفضل استخدام Redis-based rate limiting
 */
import type { Context, Next } from "hono";

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory store for rate limiting
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

interface RateLimitOptions {
  /** Maximum requests per window */
  max: number;
  /** Window size in milliseconds */
  windowMs: number;
  /** Key generator function */
  keyGenerator?: (c: Context) => string;
  /** Message to return when rate limited */
  message?: string;
  /** Skip successful requests from counting */
  skipSuccessfulRequests?: boolean;
}

/**
 * إنشاء middleware للحد من معدل الطلبات
 */
export function rateLimit(options: RateLimitOptions) {
  const {
    max,
    windowMs,
    keyGenerator = (c) => c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "unknown",
    message = "تم تجاوز الحد المسموح من الطلبات. يرجى المحاولة لاحقاً.",
    skipSuccessfulRequests = false,
  } = options;

  return async (c: Context, next: Next) => {
    const key = keyGenerator(c);
    const now = Date.now();

    let entry = rateLimitStore.get(key);

    // Reset if window has passed
    if (!entry || entry.resetTime < now) {
      entry = {
        count: 0,
        resetTime: now + windowMs,
      };
    }

    // Check if rate limited
    if (entry.count >= max) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
      c.header("Retry-After", String(retryAfter));
      c.header("X-RateLimit-Limit", String(max));
      c.header("X-RateLimit-Remaining", "0");
      c.header("X-RateLimit-Reset", String(entry.resetTime));

      return c.json(
        {
          error: message,
          code: "RATE_LIMIT_EXCEEDED",
          retryAfter,
        },
        429
      );
    }

    // Increment counter
    entry.count++;
    rateLimitStore.set(key, entry);

    // Set rate limit headers
    c.header("X-RateLimit-Limit", String(max));
    c.header("X-RateLimit-Remaining", String(Math.max(0, max - entry.count)));
    c.header("X-RateLimit-Reset", String(entry.resetTime));

    await next();

    // Skip successful requests if configured
    if (skipSuccessfulRequests && c.res.status < 400) {
      entry.count--;
      rateLimitStore.set(key, entry);
    }
  };
}

/**
 * Rate limiter للـ login attempts (أكثر صرامة)
 * 5 محاولات كل 15 دقيقة
 */
export const loginRateLimiter = rateLimit({
  max: 5,
  windowMs: 15 * 60 * 1000, // 15 minutes
  message: "تم تجاوز عدد محاولات تسجيل الدخول المسموحة. يرجى المحاولة بعد 15 دقيقة.",
  skipSuccessfulRequests: true, // Don't count successful logins
});

/**
 * Rate limiter للـ API العام
 * 100 طلب كل دقيقة
 */
export const apiRateLimiter = rateLimit({
  max: 100,
  windowMs: 60 * 1000, // 1 minute
  message: "تم تجاوز الحد المسموح من الطلبات. يرجى المحاولة لاحقاً.",
});

/**
 * Rate limiter للعمليات الحساسة (مثل تغيير كلمة المرور)
 * 3 محاولات كل ساعة
 */
export const sensitiveOperationRateLimiter = rateLimit({
  max: 3,
  windowMs: 60 * 60 * 1000, // 1 hour
  message: "تم تجاوز عدد المحاولات المسموحة لهذه العملية. يرجى المحاولة لاحقاً.",
});

/**
 * Rate limiter للتسجيل
 * 3 حسابات جديدة كل ساعة من نفس IP
 */
export const registrationRateLimiter = rateLimit({
  max: 3,
  windowMs: 60 * 60 * 1000, // 1 hour
  message: "تم تجاوز عدد الحسابات المسموح إنشاؤها. يرجى المحاولة لاحقاً.",
});

import type { Context, Next } from "hono";
import jwt from "jsonwebtoken";

// Validate JWT_SECRET at startup
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  if (process.env.NODE_ENV === "production") {
    console.error("❌ CRITICAL: JWT_SECRET environment variable is required in production!");
    console.error("   Please set a strong, random secret (at least 32 characters).");
    process.exit(1);
  } else {
    console.warn("⚠️  WARNING: JWT_SECRET not set. Using development fallback.");
    console.warn("   This is insecure and should never be used in production!");
  }
}

const EFFECTIVE_JWT_SECRET = JWT_SECRET || "dev-only-insecure-secret-do-not-use-in-production";

export interface JWTPayload {
  userId: string;
  username: string;
  roleId: string | null;
  iat?: number;
  exp?: number;
}

export function signToken(payload: Omit<JWTPayload, "iat" | "exp">): string {
  return jwt.sign(
    payload,
    EFFECTIVE_JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES ?? "7d" }
  );
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, EFFECTIVE_JWT_SECRET) as JWTPayload;
    return decoded;
  } catch {
    return null;
  }
}

export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return c.json({ error: "Unauthorized", code: "MISSING_TOKEN" }, 401);
  }

  const payload = verifyToken(token);
  if (!payload) {
    return c.json({ error: "Unauthorized", code: "INVALID_TOKEN" }, 401);
  }

  c.set("user", payload);
  await next();
}

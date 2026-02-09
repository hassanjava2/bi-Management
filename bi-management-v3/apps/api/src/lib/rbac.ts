import type { Context, Next } from "hono";
import {
  db,
  users,
  roles,
  rolePermissions,
  permissions,
} from "@bi-management/database";
import { eq } from "drizzle-orm";
import type { JWTPayload } from "./auth.js";

/**
 * Load permission codes for a user (via their role).
 */
export async function getUserPermissions(userId: string): Promise<string[]> {
  const [userRow] = await db
    .select({ roleId: users.roleId })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!userRow?.roleId) return [];

  const rows = await db
    .select({ code: permissions.code })
    .from(rolePermissions)
    .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(eq(rolePermissions.roleId, userRow.roleId));

  return rows.map((r) => r.code);
}

/**
 * Load role name and security level for a user.
 */
export async function getUserRoleAndLevel(userId: string): Promise<{
  roleName: string | null;
  securityLevel: number;
}> {
  const [userRow] = await db
    .select({
      roleId: users.roleId,
      securityLevel: users.securityLevel,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!userRow) return { roleName: null, securityLevel: 0 };

  const userLevel = userRow.securityLevel ?? 0;

  if (!userRow.roleId) {
    return { roleName: null, securityLevel: userLevel };
  }

  const [roleRow] = await db
    .select({ name: roles.name, securityLevel: roles.securityLevel })
    .from(roles)
    .where(eq(roles.id, userRow.roleId))
    .limit(1);

  const roleLevel = roleRow?.securityLevel ?? 0;
  const securityLevel = Math.max(userLevel, roleLevel);

  return {
    roleName: roleRow?.name ?? null,
    securityLevel,
  };
}

/**
 * Middleware: require the user to have all of the given permissions (by code).
 * Must be used after authMiddleware.
 */
export function requirePermission(...required: string[]) {
  return async (c: Context<{ Variables: { user: JWTPayload } }>, next: Next) => {
    const payload = c.get("user");
    if (!payload?.userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const userPerms = await getUserPermissions(payload.userId);
    const hasAll = required.every((p) => userPerms.includes(p));

    if (!hasAll) {
      return c.json(
        { error: "Forbidden", message: "صلاحيات غير كافية" },
        403
      );
    }

    await next();
  };
}

/**
 * Middleware: require the user's role to be one of the given role names.
 * Must be used after authMiddleware.
 */
export function requireRole(...allowedRoles: string[]) {
  return async (c: Context<{ Variables: { user: JWTPayload } }>, next: Next) => {
    const payload = c.get("user");
    if (!payload?.userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { roleName } = await getUserRoleAndLevel(payload.userId);
    if (!roleName || !allowedRoles.includes(roleName)) {
      return c.json(
        { error: "Forbidden", message: "هذا الإجراء يتطلب صلاحية أعلى" },
        403
      );
    }

    await next();
  };
}

/**
 * Middleware: require the user's security level to be >= minLevel.
 * Must be used after authMiddleware.
 */
export function requireSecurityLevel(minLevel: number) {
  return async (c: Context<{ Variables: { user: JWTPayload } }>, next: Next) => {
    const payload = c.get("user");
    if (!payload?.userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { securityLevel } = await getUserRoleAndLevel(payload.userId);
    if (securityLevel < minLevel) {
      return c.json(
        { error: "Forbidden", message: "مستوى الأمان غير كافٍ" },
        403
      );
    }

    await next();
  };
}

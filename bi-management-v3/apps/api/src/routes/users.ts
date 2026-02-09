import { Hono } from "hono";
import bcrypt from "bcryptjs";
import { db, users as usersTable } from "@bi-management/database";
import { eq, count } from "drizzle-orm";
import { authMiddleware } from "../lib/auth.js";
import { requireRole } from "../lib/rbac.js";

const app = new Hono();

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

app.get("/", authMiddleware, async (c) => {
  try {
    const page = Math.max(1, Number(c.req.query("page")) || 1);
    const limit = Math.min(100, Math.max(1, Number(c.req.query("limit")) || 20));
    const offset = (page - 1) * limit;

    const [totalResult] = await db
      .select({ count: count() })
      .from(usersTable)
      .where(eq(usersTable.isDeleted, 0));
    const total = Number(totalResult?.count ?? 0);

    const rows = await db.query.users.findMany({
      columns: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        phone: true,
        roleId: true,
        role: true,
        isActive: true,
        isLocked: true,
        securityLevel: true,
        lastLoginAt: true,
        createdAt: true,
      },
      where: (u, { eq }) => eq(u.isDeleted, 0),
      limit,
      offset,
    });

    return c.json({
      data: rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (e) {
    console.error("Error fetching users list:", e);
    return c.json({ error: "حدث خطأ أثناء جلب قائمة المستخدمين" }, 500);
  }
});

app.get("/:id", authMiddleware, async (c) => {
  try {
    const id = c.req.param("id");
    if (!id || !id.trim()) {
      return c.json({ error: "معرف المستخدم مطلوب" }, 400);
    }
    const [row] = await db.query.users.findMany({
      columns: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        phone: true,
        roleId: true,
        role: true,
        isActive: true,
        isLocked: true,
        securityLevel: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
      where: (u, { eq }) => eq(u.id, id),
    });
    if (!row) return c.json({ error: "المستخدم غير موجود" }, 404);
    return c.json(row);
  } catch (e) {
    console.error("Error fetching user by id:", e);
    return c.json({ error: "حدث خطأ أثناء جلب بيانات المستخدم" }, 500);
  }
});

const adminRoles = ["super_admin", "owner", "admin"];

app.post("/", authMiddleware, requireRole(...adminRoles), async (c) => {
  try {
    const body = await c.req.json<{
      username: string;
      password: string;
      fullName: string;
      email?: string;
      phone?: string;
      role?: string;
      roleId?: string;
      isActive?: number;
    }>();

    if (!body.username?.trim() || !body.password || !body.fullName?.trim()) {
      return c.json({ error: "اسم المستخدم وكلمة المرور والاسم الكامل مطلوبة" }, 400);
    }

    // Check if username exists
    const [existing] = await db.query.users.findMany({
      where: (u, { eq }) => eq(u.username, body.username.trim()),
    });
    if (existing) {
      return c.json({ error: "اسم المستخدم موجود مسبقاً" }, 400);
    }

    const id = `usr_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
    const passwordHash = await hashPassword(body.password);

    await db.insert(usersTable).values({
      id,
      username: body.username.trim(),
      passwordHash,
      fullName: body.fullName.trim(),
      email: body.email?.trim() || null,
      phone: body.phone?.trim() || null,
      role: body.role?.trim() || "viewer",
      roleId: body.roleId?.trim() || null,
      isActive: body.isActive ?? 1,
      isLocked: 0,
      isDeleted: 0,
      createdAt: new Date(),
    });

    const [created] = await db.query.users.findMany({
      columns: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
      where: (u, { eq }) => eq(u.id, id),
    });

    return c.json(created, 201);
  } catch (e) {
    console.error("Error creating user:", e);
    return c.json({ error: "حدث خطأ أثناء إنشاء المستخدم" }, 500);
  }
});

app.put("/:id", authMiddleware, requireRole(...adminRoles), async (c) => {
  try {
    const id = c.req.param("id");
    if (!id || !id.trim()) {
      return c.json({ error: "معرف المستخدم مطلوب" }, 400);
    }
    const [existing] = await db.query.users.findMany({
      where: (u, { and, eq }) => and(eq(u.id, id), eq(u.isDeleted, 0)),
    });
    if (!existing) return c.json({ error: "المستخدم غير موجود" }, 404);

    const body = await c.req.json<{
      fullName?: string;
      email?: string;
      phone?: string;
      role?: string;
      roleId?: string;
      isActive?: number;
      isLocked?: number;
      password?: string;
    }>();

    const updates: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (body.fullName?.trim()) updates.fullName = body.fullName.trim();
    if (body.email !== undefined) updates.email = body.email?.trim() || null;
    if (body.phone !== undefined) updates.phone = body.phone?.trim() || null;
    if (body.role?.trim()) updates.role = body.role.trim();
    if (body.roleId !== undefined) updates.roleId = body.roleId?.trim() || null;
    if (body.isActive !== undefined) updates.isActive = body.isActive;
    if (body.isLocked !== undefined) updates.isLocked = body.isLocked;
    if (body.password) updates.passwordHash = await hashPassword(body.password);

    await db.update(usersTable).set(updates).where(eq(usersTable.id, id));

    const [updated] = await db.query.users.findMany({
      columns: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        roleId: true,
        isActive: true,
        isLocked: true,
        updatedAt: true,
      },
      where: (u, { eq }) => eq(u.id, id),
    });

    return c.json(updated);
  } catch (e) {
    console.error("Error updating user:", e);
    return c.json({ error: "حدث خطأ أثناء تحديث بيانات المستخدم" }, 500);
  }
});

app.delete("/:id", authMiddleware, requireRole(...adminRoles), async (c) => {
  try {
    const id = c.req.param("id");
    if (!id || !id.trim()) {
      return c.json({ error: "معرف المستخدم مطلوب" }, 400);
    }
    const [existing] = await db.query.users.findMany({
      where: (u, { and, eq }) => and(eq(u.id, id), eq(u.isDeleted, 0)),
    });
    if (!existing) return c.json({ error: "المستخدم غير موجود" }, 404);

    await db.update(usersTable).set({
      isDeleted: 1,
      deletedAt: new Date(),
    }).where(eq(usersTable.id, id));

    return c.json({ success: true });
  } catch (e) {
    console.error("Error deleting user:", e);
    return c.json({ error: "حدث خطأ أثناء حذف المستخدم" }, 500);
  }
});

export default app;

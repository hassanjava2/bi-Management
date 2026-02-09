import { Hono } from "hono";
import bcrypt from "bcryptjs";
import { db, users } from "@bi-management/database";
import { eq } from "drizzle-orm";
import { signToken, authMiddleware, type JWTPayload } from "../lib/auth.js";
import { validateBody, loginSchema, changePasswordSchema } from "../lib/validation.js";
import { loginRateLimiter, sensitiveOperationRateLimiter } from "../lib/rate-limit.js";

const app = new Hono<{ Variables: { user: JWTPayload; validatedBody: any } }>();

// Rate limit: 5 login attempts per 15 minutes
app.post("/login", loginRateLimiter, validateBody(loginSchema), async (c) => {
  try {
    const { username, password } = c.get("validatedBody");

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    if (!user || !user.passwordHash) {
      return c.json({ error: "Invalid credentials" }, 401);
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return c.json({ error: "Invalid credentials" }, 401);
    }

    if (user.isActive !== 1) {
      return c.json({ error: "Account is disabled" }, 403);
    }

    const token = signToken({
      userId: user.id,
      username: user.username,
      roleId: user.roleId,
    });

    return c.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        roleId: user.roleId,
      },
    });
  } catch (e) {
    console.error("Login error:", e);
    return c.json({ error: "فشل في العملية" }, 500);
  }
});

app.get("/me", authMiddleware, async (c) => {
  try {
    const payload = c.get("user");
    const [row] = await db
      .select({
        id: users.id,
        username: users.username,
        fullName: users.fullName,
        email: users.email,
        phone: users.phone,
        roleId: users.roleId,
        role: users.role,
      })
      .from(users)
      .where(eq(users.id, payload.userId))
      .limit(1);
    if (!row) {
      return c.json({ error: "User not found" }, 404);
    }
    return c.json({
      user: {
        userId: row.id,
        username: row.username,
        fullName: row.fullName,
        email: row.email,
        phone: row.phone,
        roleId: row.roleId,
        role: row.role,
      },
    });
  } catch (error) {
    console.error("Get user profile error:", error);
    return c.json({ error: "فشل في جلب بيانات المستخدم" }, 500);
  }
});

// Rate limit: 3 password change attempts per hour
app.post("/change-password", sensitiveOperationRateLimiter, authMiddleware, validateBody(changePasswordSchema), async (c) => {
  try {
    const payload = c.get("user");
    const { currentPassword, newPassword } = c.get("validatedBody");

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, payload.userId))
      .limit(1);

    if (!user || !user.passwordHash) {
      return c.json({ error: "المستخدم غير موجود" }, 404);
    }

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      return c.json({ error: "كلمة المرور الحالية غير صحيحة" }, 401);
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await db.update(users).set({
      passwordHash: newHash,
      updatedAt: new Date(),
    }).where(eq(users.id, payload.userId));

    return c.json({ success: true, message: "تم تغيير كلمة المرور بنجاح" });
  } catch (e) {
    console.error("Change password error:", e);
    return c.json({ error: "فشل في العملية" }, 500);
  }
});

export default app;

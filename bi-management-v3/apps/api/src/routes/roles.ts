import { Hono } from "hono";
import { db, roles as rolesTable } from "@bi-management/database";
import { eq } from "drizzle-orm";
import { authMiddleware } from "../lib/auth.js";

const app = new Hono();

app.get("/", authMiddleware, async (c) => {
  try {
    const rows = await db.query.roles.findMany({
      columns: {
        id: true,
        name: true,
        nameAr: true,
        description: true,
        color: true,
        icon: true,
        securityLevel: true,
        isSystem: true,
        isActive: true,
        createdAt: true,
      },
      where: (r, { eq }) => eq(r.isActive, 1),
    });
    return c.json({ data: rows });
  } catch (e) {
    console.error(e);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.get("/:id", authMiddleware, async (c) => {
  try {
    const id = c.req.param("id");
    const [row] = await db.query.roles.findMany({
      where: (r, { eq }) => eq(r.id, id),
    });
    if (!row) return c.json({ error: "الصلاحية غير موجودة" }, 404);
    return c.json(row);
  } catch (e) {
    console.error("Error fetching role:", e);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.post("/", authMiddleware, async (c) => {
  try {
    const body = await c.req.json<{
      name: string;
      nameAr?: string;
      description?: string;
      color?: string;
      securityLevel?: number;
    }>();

    if (!body.name?.trim()) {
      return c.json({ error: "name is required" }, 400);
    }

    const id = `role_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;

    await db.insert(rolesTable).values({
      id,
      name: body.name.trim(),
      nameAr: body.nameAr?.trim() || null,
      description: body.description?.trim() || null,
      color: body.color?.trim() || "#3B82F6",
      securityLevel: body.securityLevel ?? 1,
      isSystem: 0,
      isActive: 1,
      createdAt: new Date(),
    });

    const [created] = await db.query.roles.findMany({
      where: (r, { eq }) => eq(r.id, id),
    });

    return c.json(created, 201);
  } catch (e) {
    console.error(e);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

app.put("/:id", authMiddleware, async (c) => {
  try {
    const id = c.req.param("id");
    const [existing] = await db.query.roles.findMany({
      where: (r, { eq }) => eq(r.id, id),
    });
    if (!existing) return c.json({ error: "Role not found" }, 404);

    // Prevent editing system roles
    if (existing.isSystem === 1) {
      return c.json({ error: "لا يمكن تعديل الأدوار المضمنة" }, 403);
    }

    const body = await c.req.json<{
      name?: string;
      nameAr?: string;
      description?: string;
      color?: string;
      securityLevel?: number;
    }>();

    await db.update(rolesTable).set({
      name: body.name?.trim() || existing.name,
      nameAr: body.nameAr?.trim() ?? existing.nameAr,
      description: body.description?.trim() ?? existing.description,
      color: body.color?.trim() ?? existing.color,
      securityLevel: body.securityLevel ?? existing.securityLevel,
      updatedAt: new Date(),
    }).where(eq(rolesTable.id, id));

    const [updated] = await db.query.roles.findMany({
      where: (r, { eq }) => eq(r.id, id),
    });

    return c.json(updated);
  } catch (e) {
    console.error(e);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

app.delete("/:id", authMiddleware, async (c) => {
  try {
    const id = c.req.param("id");
    const [existing] = await db.query.roles.findMany({
      where: (r, { eq }) => eq(r.id, id),
    });
    if (!existing) return c.json({ error: "Role not found" }, 404);

    if (existing.isSystem === 1) {
      return c.json({ error: "لا يمكن حذف الأدوار المضمنة" }, 403);
    }

    await db.update(rolesTable).set({ isActive: 0 }).where(eq(rolesTable.id, id));
    return c.json({ success: true });
  } catch (e) {
    console.error(e);
    return c.json({ error: "فشل في حذف السجل" }, 500);
  }
});

export default app;
